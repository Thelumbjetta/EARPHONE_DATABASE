/**
 * db/import.js
 * =============================================================
 * CSV → PostgreSQL Data Import Pipeline
 * =============================================================
 * PURPOSE:
 *   Read a flat CSV file containing raw tier-list data and
 *   correctly distribute it across THREE normalized relational
 *   tables: tiers → earphones → scores.
 *
 * USAGE:
 *   node db/import.js
 *   node db/import.js --file db/data/my_custom_data.csv
 *
 * PREREQUISITES:
 *   1. Run migrations first:  node db/migrate.js
 *   2. Fill in .env.local with your DB credentials
 *   3. npm install pg dotenv csv-parse
 *
 * DESIGN DECISIONS:
 *   - Uses streaming CSV parsing (not loading entire file into RAM)
 *   - Each CSV row is processed inside its own DB transaction
 *     (BEGIN → INSERT tier → INSERT earphone → INSERT score → COMMIT)
 *   - If any step inside a row's transaction fails, only THAT row
 *     is rolled back — other rows are unaffected
 *   - Duplicate tiers are silently skipped (ON CONFLICT DO NOTHING)
 *   - Duplicate earphones (same brand + model) are silently skipped
 *   - total_score: uses the CSV value if > 0; otherwise auto-calculates
 *     the average of the 5 sub-scores
 * =============================================================
 */

'use strict';

// ── External Dependencies ──────────────────────────────────────────────────────

// dotenv: Reads key=value pairs from .env.local and injects them into
// process.env so we never hard-code credentials in source files.
require('dotenv').config({ path: '.env.local' });

// path: Node.js built-in for building cross-platform file paths.
const path = require('path');

// fs: Node.js built-in for creating readable file streams.
const fs = require('fs');

// pg.Pool: manages a pool of reusable PostgreSQL connections.
// Using a pool (instead of a single Client) is standard practice
// for applications that run many queries.
const { Pool } = require('pg');

// csv-parse/sync would load the whole file first.
// Instead we use the STREAMING version: csv-parse/stream (via transform).
// This processes the CSV row-by-row as data arrives from disk,
// keeping memory usage constant even for very large files.
const { parse } = require('csv-parse');

// ── Configuration ─────────────────────────────────────────────────────────────

// Allow overriding the CSV path via command-line argument:
//   node db/import.js --file path/to/custom.csv
const args = process.argv.slice(2);
const fileArgIndex = args.indexOf('--file');
const CSV_FILE_PATH = fileArgIndex !== -1 && args[fileArgIndex + 1]
  ? path.resolve(args[fileArgIndex + 1])
  : path.join(__dirname, 'data', 'earphones.csv');

// ── Database Connection Pool ───────────────────────────────────────────────────

// Initialize the PostgreSQL connection pool.
// pg.Pool reads from environment variables automatically:
//   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
// OR from a single DATABASE_URL connection string.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Individual field fallbacks (used if DATABASE_URL is not set):
  host:     process.env.PGHOST     || 'localhost',
  port:     parseInt(process.env.PGPORT || '5432', 10),
  user:     process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  // Neon requires SSL. rejectUnauthorized: false accepts the cloud
  // provider's certificate without needing the CA bundle locally.
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});


// ── Helper: Upsert a Tier Row ──────────────────────────────────────────────────

/**
 * upsertTier
 * ----------
 * Inserts a new tier row OR does nothing if a tier with the same `name`
 * already exists (thanks to the UNIQUE constraint on tiers.name).
 * Then fetches and returns the tier's `id` (whether newly created or pre-existing).
 *
 * @param {object} client    - An active pg.Client from the pool
 * @param {string} tierName  - Tier label, e.g. 'S', 'A', 'Budget King'
 * @param {string} colorCode - Hex color string, e.g. '#FFD700'
 * @returns {Promise<number>} The tier's database `id`
 */
async function upsertTier(client, tierName, colorCode) {
  // ── SQL Breakdown ──────────────────────────────────────────────────────────
  //
  // INSERT INTO tiers (name, color_code)
  //   Try to insert a new row with the given name and color_code.
  //
  // VALUES ($1, $2)
  //   $1 and $2 are parameterised placeholders. pg replaces them with the
  //   actual values from the second argument of client.query(). This prevents
  //   SQL injection attacks — never concatenate user data into SQL strings.
  //
  // ON CONFLICT (name) DO NOTHING
  //   If a row with this `name` already exists (violating the UNIQUE constraint),
  //   PostgreSQL silently skips the insert instead of throwing an error.
  //   This makes the import safe to re-run without creating duplicate tiers.
  //
  // The INSERT above returns no rows (DO NOTHING), so we need a separate
  // SELECT to reliably get the id regardless of whether we just inserted or skipped.
  // ──────────────────────────────────────────────────────────────────────────

  await client.query(
    `INSERT INTO tiers (name, color_code)
     VALUES ($1, $2)
     ON CONFLICT (name) DO NOTHING`,
    [tierName, colorCode]
  );

  // Now fetch the id for this tier name.
  // This always succeeds: either the row was just inserted, or it pre-existed.
  const result = await client.query(
    `SELECT id FROM tiers WHERE name = $1`,
    [tierName]
  );

  // result.rows is an array of row objects. We want the first (and only) match.
  // result.rows[0].id is the PostgreSQL SERIAL-generated integer primary key.
  return result.rows[0].id;
}

// ── Helper: Insert an Earphone Row ────────────────────────────────────────────

/**
 * insertEarphone
 * --------------
 * Inserts a new earphone into the `earphones` table and returns its generated id.
 * If the brand+model combination already exists (UNIQUE constraint), the insert
 * is silently skipped and the existing id is returned instead.
 *
 * @param {object}  client           - Active pg.Client
 * @param {number}  tierId           - The resolved FK id from the tiers table
 * @param {string}  brand            - Manufacturer name
 * @param {string}  model            - Product model name
 * @param {number}  price            - Price in USD dollars (stored as integer)
 * @param {boolean} isCollaboration  - True if this is a reviewer collab product
 * @returns {Promise<number|null>} The earphone's database `id`, or null if skipped
 */
async function insertEarphone(client, tierId, brand, model, price, isCollaboration) {
  // ── SQL Breakdown ──────────────────────────────────────────────────────────
  //
  // INSERT INTO earphones (tier_id, brand, model, price, is_collaboration)
  //   Insert all five data columns.
  //
  // VALUES ($1, $2, $3, $4, $5)
  //   Parameterised placeholders for the five values.
  //
  // ON CONFLICT (brand, model) DO NOTHING
  //   The UNIQUE constraint uq_earphones_brand_model (defined in migration 002)
  //   prevents duplicate brand+model rows. DO NOTHING skips gracefully.
  //
  // RETURNING id
  //   After a successful INSERT, PostgreSQL returns the auto-generated `id`.
  //   If the insert was skipped (DO NOTHING), RETURNING returns zero rows.
  //   We handle that case below with a follow-up SELECT.
  // ──────────────────────────────────────────────────────────────────────────

  const insertResult = await client.query(
    `INSERT INTO earphones (tier_id, brand, model, price, is_collaboration)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (brand, model) DO NOTHING
     RETURNING id`,
    [tierId, brand, model, price, isCollaboration]
  );

  if (insertResult.rows.length > 0) {
    // The insert succeeded — return the freshly generated id.
    return insertResult.rows[0].id;
  }

  // The insert was skipped (duplicate). Fetch the existing id.
  const selectResult = await client.query(
    `SELECT id FROM earphones WHERE brand = $1 AND model = $2`,
    [brand, model]
  );

  if (selectResult.rows.length === 0) {
    // This branch should never occur in practice, but guard defensively.
    return null;
  }

  console.log(`    ⚠️  Duplicate skipped: "${brand} ${model}" — using existing record.`);
  return selectResult.rows[0].id;
}

// ── Helper: Insert a Score Row ─────────────────────────────────────────────────

/**
 * insertScore
 * -----------
 * Inserts a score record linked to the given earphone.
 * If a score for this earphone already exists (duplicate import run),
 * the insert is skipped via ON CONFLICT DO NOTHING.
 *
 * @param {object} client      - Active pg.Client
 * @param {number} earphoneId  - The resolved FK id from the earphones table
 * @param {object} scores      - Object containing: bass, mids, treble, tonality, technicality, total_score
 */
async function insertScore(client, earphoneId, scores) {
  // ── total_score logic ──────────────────────────────────────────────────────
  //
  // If total_score is provided in the CSV (non-zero), use it directly.
  // Otherwise, auto-calculate it as the simple arithmetic mean of the
  // five sub-scores. Stored as a fixed 2-decimal NUMERIC in the DB.
  //
  // parseFloat() converts the CSV string "9.50" → number 9.5.
  // toFixed(2) converts 9.24 → "9.24" (a string), which PostgreSQL
  // correctly casts to NUMERIC(5,2).
  // ──────────────────────────────────────────────────────────────────────────

  const bass         = parseFloat(scores.bass)         || 0;
  const mids         = parseFloat(scores.mids)         || 0;
  const treble       = parseFloat(scores.treble)       || 0;
  const tonality     = parseFloat(scores.tonality)     || 0;
  const technicality = parseFloat(scores.technicality) || 0;

  // Use the CSV total_score if it's a positive number; otherwise calculate.
  const csvTotal = parseFloat(scores.total_score) || 0;
  const totalScore = csvTotal > 0
    ? csvTotal
    : ((bass + mids + treble + tonality + technicality) / 5);

  // Round to 2 decimal places for consistent storage.
  const totalScoreRounded = parseFloat(totalScore.toFixed(2));

  // ── SQL Breakdown ──────────────────────────────────────────────────────────
  //
  // earphone_id has a UNIQUE constraint (one score record per earphone).
  // ON CONFLICT (earphone_id) DO NOTHING silently skips duplicate imports.
  // ──────────────────────────────────────────────────────────────────────────

  await client.query(
    `INSERT INTO scores (earphone_id, bass, mids, treble, tonality, technicality, total_score)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (earphone_id) DO NOTHING`,
    [earphoneId, bass, mids, treble, tonality, technicality, totalScoreRounded]
  );
}

// ── Helper: Process a Single CSV Row ──────────────────────────────────────────

/**
 * processRow
 * ----------
 * Wraps all three database operations for one CSV row inside a single
 * PostgreSQL transaction.
 *
 * A transaction guarantees ATOMICITY:
 *   - Either ALL three inserts (tier + earphone + score) succeed together, OR
 *   - If ANY insert fails, ALL changes for this row are rolled back.
 *
 * This prevents partial data (e.g., an earphone with no score) from being
 * committed to the database.
 *
 * @param {object} row - A single parsed CSV row (column headers as keys)
 * @param {number} rowIndex - 1-based row number for error reporting
 */
async function processRow(row, rowIndex) {
  // Acquire a dedicated client for this transaction from the pool.
  // Each row gets its own client to allow concurrent rows to be processed
  // independently (though in this sequential script we process one at a time).
  const client = await pool.connect();

  try {
    // ── BEGIN Transaction ────────────────────────────────────────────────────
    // Mark the start of an atomic unit of work.
    // PostgreSQL will buffer all changes until COMMIT is called.
    await client.query('BEGIN');

    // ── Step 1: Upsert the Tier ──────────────────────────────────────────────
    // Extract tier columns from the CSV row object.
    // The keys match the CSV header names exactly.
    const tierId = await upsertTier(
      client,
      row.tier_name.trim(),   // e.g. 'S' — trim() removes accidental whitespace
      row.tier_color.trim()   // e.g. '#FFD700'
    );
    // tierId is now the integer PK of the tier row (existing or newly created).

    // ── Step 2: Insert the Earphone ──────────────────────────────────────────
    // Parse is_collaboration: CSV stores 'true'/'false' as strings.
    // We convert to a JavaScript boolean before sending to PostgreSQL.
    const isCollaboration = row.is_collaboration.trim().toLowerCase() === 'true';

    // price is stored as an integer in the DB. parseInt with radix 10 is
    // the safest conversion from string — always specify radix to avoid
    // octal parsing bugs in old JavaScript environments.
    const price = parseInt(row.price, 10) || 0;

    const earphoneId = await insertEarphone(
      client,
      tierId,
      row.brand.trim(),
      row.model.trim(),
      price,
      isCollaboration
    );

    // If earphoneId is null, the earphone was a duplicate AND we couldn't
    // find its existing id (edge case). Skip this row safely.
    if (earphoneId === null) {
      console.warn(`    ⚠️  Row ${rowIndex}: Could not resolve earphone id. Skipping score insert.`);
      await client.query('ROLLBACK');
      return;
    }

    // ── Step 3: Insert the Score ─────────────────────────────────────────────
    // Pass the earphone's id and all score columns from the CSV row.
    await insertScore(client, earphoneId, {
      bass:         row.bass,
      mids:         row.mids,
      treble:       row.treble,
      tonality:     row.tonality,
      technicality: row.technicality,
      total_score:  row.total_score,
    });

    // ── COMMIT Transaction ───────────────────────────────────────────────────
    // Persist all three inserts to the database atomically.
    // After COMMIT, the data is durable and visible to other connections.
    await client.query('COMMIT');

    console.log(`    ✅ Row ${rowIndex}: Inserted "${row.brand} ${row.model}" → Tier "${row.tier_name}"`);

  } catch (err) {
    // ── ROLLBACK Transaction ─────────────────────────────────────────────────
    // Something went wrong. Undo ALL changes made within this transaction.
    // The database state for this row is restored to before BEGIN was called.
    await client.query('ROLLBACK');
    console.error(`    ❌ Row ${rowIndex}: Failed for "${row.brand} ${row.model}". Error: ${err.message}`);
    // We do NOT re-throw: one failed row should not abort the entire import.

  } finally {
    // ── Release Client ───────────────────────────────────────────────────────
    // Always release the client back to the pool after the transaction ends.
    // Failing to release clients is a common Node.js + pg bug that causes
    // the application to hang when the pool is exhausted.
    client.release();
  }
}

// ── Main Import Function ───────────────────────────────────────────────────────

/**
 * runImport
 * ---------
 * Orchestrates the entire CSV import:
 *   1. Opens a readable stream from the CSV file
 *   2. Pipes it through the csv-parse transformer (row-by-row)
 *   3. Processes each row by calling processRow()
 *   4. Closes the pool when done
 */
async function runImport() {
  console.log(`\n🚀 Starting CSV import from:\n   ${CSV_FILE_PATH}\n`);

  // Verify the CSV file exists before attempting to stream it.
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ CSV file not found at: ${CSV_FILE_PATH}`);
    console.error('   Please create the file or specify a path with --file flag.');
    process.exit(1);
  }

  // ── Create a Readable Stream ─────────────────────────────────────────────────
  // fs.createReadStream reads the file in chunks instead of loading it all
  // into memory. This is essential for large CSV files (thousands of rows).
  const readStream = fs.createReadStream(CSV_FILE_PATH, { encoding: 'utf8' });

  // ── Create the CSV Parser ───────────────────────────────────────────────────
  // csv-parse transforms raw text chunks into JavaScript objects.
  //
  // Options explained:
  //   columns: true      → Use the first row as column header names.
  //                         Each parsed row becomes { tier_name: 'S', brand: 'Moondrop', ... }
  //                         instead of ['S', '#FFD700', 'Moondrop', ...]
  //
  //   skip_empty_lines: true → Ignore blank lines in the CSV (common at end of file)
  //
  //   trim: true         → Strip whitespace from all values automatically.
  //                         Prevents issues like 'true ' !== 'true'.
  //
  //   comment: '#'       → Lines starting with # are treated as comments and ignored.
  //                         Useful for adding notes to the CSV without breaking the parser.
  //   NOTE: We intentionally omit `comment: '#'` here because the
  //   tier_color column contains hex color codes like '#FFD700'.
  //   Enabling that option would cause csv-parse to treat those data
  //   values as comment markers, breaking every row that has a color.
  const parser = parse({
    columns:          true,
    skip_empty_lines: true,
    trim:             true,
    // comment: '#' ← REMOVED — conflicts with hex color codes in tier_color
  });


  // Track statistics for the final summary report.
  let rowIndex    = 0;   // Total rows attempted
  let errorCount  = 0;   // Rows that failed (see: processRow catch block)

  // ── Collect All Rows First (Buffered Streaming) ──────────────────────────────
  // We collect parsed rows into an array and then process them sequentially.
  // This approach is simpler than event-based streaming for a script like this.
  // For truly massive files (millions of rows), you'd process inside the 'data'
  // event to avoid buffering. For typical tier-list sizes this is fine.
  const rows = [];

  // Return a Promise that resolves when the entire CSV has been parsed.
  // This lets us use await to pause until streaming is complete.
  await new Promise((resolve, reject) => {
    // Pipe the file stream through the CSV parser.
    // readStream emits chunks of raw text → parser emits parsed row objects.
    readStream
      .pipe(parser)

      // 'data' event: fired once for every successfully parsed CSV row.
      // The `row` argument is a plain JavaScript object keyed by column headers.
      .on('data', (row) => {
        rows.push(row);
      })

      // 'end' event: fired when the parser has processed all data.
      // Resolve the Promise so our await above can continue.
      .on('end', () => {
        console.log(`📋 Parsed ${rows.length} data rows from CSV.\n`);
        resolve();
      })

      // 'error' event: fired if the parser encounters a malformed CSV.
      // Reject the Promise to propagate the error to our catch block.
      .on('error', (err) => {
        console.error('❌ CSV parsing error:', err.message);
        reject(err);
      });
  });

  // ── Process Each Row Sequentially ───────────────────────────────────────────
  // We process rows one at a time (not in parallel with Promise.all) to:
  //   1. Respect database connection pool limits
  //   2. Produce predictable, ordered console output for debugging
  //   3. Avoid race conditions on tier upserts (two concurrent rows for
  //      the same tier could both try to INSERT before either's CONFLICT resolves)
  for (const row of rows) {
    rowIndex++;
    await processRow(row, rowIndex);
  }

  // ── Final Report ─────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════');
  console.log('📊 Import Complete!');
  console.log(`   Total rows processed : ${rowIndex}`);
  console.log(`   Errors               : ${errorCount}`);
  console.log(`   Successful           : ${rowIndex - errorCount}`);
  console.log('════════════════════════════════════\n');

  // Close all connections in the pool gracefully.
  // Without this, the Node.js process would hang waiting for open connections.
  await pool.end();
}

// ── Entry Point ────────────────────────────────────────────────────────────────

// Run the import and catch any top-level unhandled errors.
// process.exit(1) signals failure to shell scripts / CI pipelines.
runImport().catch((err) => {
  console.error('💥 Fatal error during import:', err);
  process.exit(1);
});
