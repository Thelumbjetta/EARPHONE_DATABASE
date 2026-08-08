/**
 * db/migrate.js
 * =============================================================
 * Migration Runner
 * =============================================================
 * Reads each SQL migration file in order and executes it
 * against the configured PostgreSQL database.
 *
 * Usage:
 *   node db/migrate.js
 *
 * Prerequisites:
 *   1. Fill in your credentials in .env.local
 *   2. Run: npm install pg dotenv
 * =============================================================
 */

'use strict';

// Load environment variables from .env.local into process.env
// MUST be called before requiring any module that reads process.env
require('dotenv').config({ path: '.env.local' });

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

// ------------------------------------------------------------------
// 1. Create a PostgreSQL connection pool using env variables.
//    pg.Pool automatically manages connection reuse and cleanup.
// ------------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fallback to individual fields if DATABASE_URL is not set:
  host:     process.env.PGHOST     || 'localhost',
  port:     parseInt(process.env.PGPORT || '5432', 10),
  user:     process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  // Neon (and most cloud PostgreSQL providers) require SSL.
  // rejectUnauthorized: false accepts the provider's self-signed cert
  // without needing to bundle the CA certificate locally.
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// ------------------------------------------------------------------
// 2. Define migration files in strict execution order.
//
//    WHY ORDER MATTERS — Foreign Key Dependencies:
//    A foreign key says: "this column's value must exist in that
//    OTHER table." That other table must therefore ALREADY EXIST
//    when you create the table with the foreign key.
//
//    Dependency chain (read as "depends on"):
//      002 depends on 001  (earphones.tier_id → tiers.id)
//      003 depends on 002  (scores.earphone_id → earphones.id)
//      004 is independent  (users has no foreign keys)
//      005 depends on 004  (posts.user_id → users.id)
//      006 depends on 004,005 (comments.user_id, comments.post_id)
//      007 depends on 004  (tier_lists.user_id → users.id)
//      008 depends on 007  (list_tiers.tier_list_id → tier_lists.id)
//      009 depends on 008,002 (tier_list_items.tier_id, .earphone_id)
//
//    If you ran 007 before 004, PostgreSQL would throw:
//    "relation 'users' does not exist" — because the table it's
//    trying to reference hasn't been created yet.
//
//    WHAT IS IF NOT EXISTS? (for beginners)
//    Every CREATE TABLE in our migrations uses "IF NOT EXISTS."
//    This means running migrate.js a SECOND time is safe —
//    it simply skips tables that already exist rather than
//    crashing with "table already exists" errors.
//    This property is called IDEMPOTENCY: same result every run.
// ------------------------------------------------------------------
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// ── migrationFiles array ───────────────────────────────────────────────────────
//
// JAVASCRIPT SYNTAX — What is an array?
//   An array is an ORDERED list of values, written with square brackets [ ].
//   Each item is separated by a comma. The items here are strings (text in quotes).
//
//   JavaScript accesses items by index (position), starting from 0:
//     migrationFiles[0] → '001_create_tiers.sql'
//     migrationFiles[1] → '002_create_earphones.sql'
//     etc.
//
//   The runMigrations() function loops through this array with a `for` loop,
//   running each file in order from index 0 to the last index.
// ─────────────────────────────────────────────────────────────────────────────
const migrationFiles = [
  // ── Original site schema ──────────────────────────────────────────────────
  // These three tables power the EXISTING curated tier list.
  // They must run first because tables below them reference earphones.id.

  '001_create_tiers.sql',       // Site's own static tier labels (S, A, B, C, F)
  '002_create_earphones.sql',   // Master earphone catalog (FK → tiers)
  '003_create_scores.sql',      // Audio sub-scores per earphone (FK → earphones)

  // ── User & Forum schema ───────────────────────────────────────────────────
  // These three tables power user accounts and the community forum.

  '004_create_users.sql',       // Registered user accounts
  '005_create_posts.sql',       // Forum posts/threads (FK → users)
  '006_create_comments.sql',    // Post replies (FK → posts, users)

  // ── Multi-User Tier List schema ───────────────────────────────────────────
  // These three tables power the user-created tier list feature.
  // They depend on both users (004) and earphones (002).

  '007_create_tier_lists.sql',  // Tier list containers (FK → users)
  '008_create_list_tiers.sql',  // Dynamic tier rows per list (FK → tier_lists)
  '009_create_tier_list_items.sql', // Earphones placed in tiers (FK → list_tiers, earphones)

  // ── Forum & Extended Catalog schema ──────────────────────────────────────
  // These three migrations expand the schema to support the audiophile
  // community forum. They must run AFTER 004–009 because they reference
  // or ALTER tables created in those earlier migrations.
  //
  //   010 depends on 004  (ALTER TABLE users; creates audio_gear — no FK deps)
  //   011 depends on 004  (threads.user_id → users.id)
  //              and no dep on 010 (forum_categories is standalone)
  //   012 depends on 006  (ALTER TABLE comments)
  //              and 007  (ALTER TABLE tier_lists)
  //              and 011  (comments.thread_id → threads.id)

  '010_expand_users_and_audio_gear.sql', // Adds reputation/post_count/avatar_url/bio to users; creates audio_gear catalog
  '011_create_forum_schema.sql',         // Creates forum_categories and threads tables
  '012_extend_comments_for_threads.sql', // Adds thread_id + media_url to comments; adds category to tier_lists
  '013_make_comment_post_id_nullable.sql', // Makes comments.post_id nullable to allow thread-only replies
  '014_support_media_urls.sql',          // Adds media_urls array to threads/comments, graph_url to audio_gear
  '015_reddit_pivot_and_notifications.sql', // Reddit pivot: communities, votes, karma, and notifications schema
];


// ------------------------------------------------------------------
// 3. Main async runner
// ------------------------------------------------------------------
async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  // Acquire a dedicated client from the pool for the entire migration
  // session. Using a single client ensures all migrations run on the
  // same connection, which is important for transactional consistency.
  const client = await pool.connect();

  try {
    for (const filename of migrationFiles) {
      const filePath = path.join(MIGRATIONS_DIR, filename);

      // Read the SQL file content as a UTF-8 string
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`  ▶ Running: ${filename}`);

      // Execute the entire SQL file as one command.
      // IF NOT EXISTS clauses in the DDL make this idempotent —
      // safe to re-run without duplicating tables.
      await client.query(sql);

      console.log(`  ✅ Done:    ${filename}\n`);
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (err) {
    // Print the full error and exit with a non-zero code so CI/CD
    // pipelines can detect failures automatically.
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    // Always release the client back to the pool, even on error.
    // Forgetting this causes connection leaks.
    client.release();
    await pool.end();
  }
}

runMigrations();
