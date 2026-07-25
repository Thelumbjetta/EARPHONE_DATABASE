/**
 * lib/tier-list-queries.ts
 * =============================================================
 * Database Query Functions — Tier List Feature
 * =============================================================
 *
 * WHAT IS THIS FILE?
 *   Contains functions that query the PostgreSQL database and
 *   return typed data for the tier list pages.
 *
 *   It also contains MOCK DATA — a realistic fake tier list used
 *   as a fallback when visiting a tier list that doesn't exist in
 *   the database yet. This lets you see and test the full UI
 *   immediately, without having to create real tier lists first.
 *
 * PATTERN: "Server-side data fetching"
 *   These functions run ONLY on the server (inside Server Components
 *   and API routes). They import `pool` from lib/db.ts which requires
 *   Node.js — it will never be sent to the browser.
 *
 * WHY NOT JUST CALL THE API FROM THE SERVER COMPONENT?
 *   Server Components can call database functions DIRECTLY, without
 *   an HTTP round-trip. This is faster (skips network overhead)
 *   and simpler (no need to serialize/deserialize JSON twice).
 *   API routes are still useful for BROWSER-side fetching (e.g.,
 *   when the user drags an earphone and we save the change).
 * =============================================================
 */

// ── IMPORTS ────────────────────────────────────────────────────────────────────
//
// KEYWORD: import
//   Brings in code from another file or package.
//
// `pool` — our singleton PostgreSQL connection pool from lib/db.ts
// The types we defined — note `import type`: this only imports for
// TypeScript type-checking, it has zero cost at runtime.
// ─────────────────────────────────────────────────────────────────────────────
import pool from '@/lib/db';
import type {
  TierListPageData,
  TierListMeta,
  ListTier,
  TierItem,
  DraggableItem,
} from '@/components/tier-list/types';


// =============================================================
// SECTION 1: MOCK DATA
// =============================================================
//
// WHAT IS MOCK DATA?
//   "Mock" means "fake but realistic." This is a hardcoded dataset
//   that looks exactly like what the real database would return.
//   It lets us build and test the UI before real user data exists.
//
//   The naming here uses real IEM names so the UI feels authentic.
//   Once users start creating real tier lists, this mock is bypassed.
// =============================================================

// ── Mock: TierListMeta ────────────────────────────────────────────────────────
//
// KEYWORD: const
//   Declares a constant — a variable whose binding cannot be reassigned.
//   const x = 1;  then  x = 2;  → TypeScript error!
//   This doesn't mean the object is frozen; its properties can change.
//   But the variable `MOCK_META` will always point to this object.
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_META: TierListMeta = {
  id: 1,
  userId: 1,
  title: "HBB's Budget IEM Power Rankings",
  description: "My personal ranking of every sub-$100 IEM I've reviewed. Sorted by pure enjoyment. Drag and rearrange to make your own version.",
  bannerImageUrl: null,             // null = use the gradient fallback in HeroBanner
  themeColorHex: '#e85d04',         // HBB signature deep orange
  isPublic: true,
  createdAt: new Date().toISOString(), // current time as an ISO string
};

// ── Mock: ListTier rows ───────────────────────────────────────────────────────
//
// KEYWORD: const MOCK_TIERS: ListTier[]
//   The `: ListTier[]` part is a TypeScript "type annotation."
//   It says: "this constant must be an ARRAY of ListTier objects."
//   If we accidentally put a non-ListTier object in the array,
//   TypeScript highlights the error immediately.
//
//   [] at the end of a type means "array of". So:
//     string[]   = array of strings
//     ListTier[] = array of ListTier objects
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_TIERS: ListTier[] = [
  { id: 1, tierListId: 1, name: 'S-Tier',   colorHex: '#ffd60a', rankOrder: 1 }, // Gold
  { id: 2, tierListId: 1, name: 'A-Tier',   colorHex: '#70e000', rankOrder: 2 }, // Green
  { id: 3, tierListId: 1, name: 'B-Tier',   colorHex: '#4895ef', rankOrder: 3 }, // Blue
  { id: 4, tierListId: 1, name: 'C-Tier',   colorHex: '#f77f00', rankOrder: 4 }, // Orange
  { id: 5, tierListId: 1, name: 'Garbage',  colorHex: '#e63946', rankOrder: 5 }, // Red
];

// ── Mock: TierItem rows (placed earphones) ────────────────────────────────────
const MOCK_ITEMS: TierItem[] = [
  // S-Tier items (tierId: 1)
  { id: 1, tierId: 1, earphoneId: 1, brand: '7Hz',      model: 'Salnotes Zero',  price: 20,  userStars: 9.5, userNotes: 'Best sub-$25 IEM. Period.' },
  { id: 2, tierId: 1, earphoneId: 2, brand: 'Moondrop', model: 'Aria',            price: 79,  userStars: 9.0, userNotes: 'Timeless tuning. Buy with confidence.' },
  { id: 3, tierId: 1, earphoneId: 3, brand: 'Truthear', model: 'ZERO:RED',        price: 55,  userStars: 9.2, userNotes: null },

  // A-Tier items (tierId: 2)
  { id: 4, tierId: 2, earphoneId: 4, brand: 'CCA',      model: 'CRA',             price: 18,  userStars: 8.0, userNotes: 'Ridiculous value.' },
  { id: 5, tierId: 2, earphoneId: 5, brand: 'Tripowin', model: 'Olina SE',        price: 99,  userStars: 8.3, userNotes: null },

  // B-Tier items (tierId: 3)
  { id: 6, tierId: 3, earphoneId: 6, brand: 'KZ',       model: 'ZSN Pro X',       price: 22,  userStars: 7.5, userNotes: 'Decent for the price.' },

  // Garbage tier (tierId: 5)
  { id: 7, tierId: 5, earphoneId: 7, brand: 'Sony',     model: 'MDR-EX15AP',      price: 15,  userStars: 2.0, userNotes: 'Muddy, fatiguing treble. Avoid.' },
];

// ── Mock: Unranked pool ───────────────────────────────────────────────────────
//
// These earphones exist in the master catalog but haven't been placed
// into any tier yet. They appear in the "Unranked Pool" at the bottom
// of the tier list editor, ready to be dragged into a tier row.
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_UNRANKED: DraggableItem[] = [
  { id: 'ear-8',  earphoneId: 8,  brand: 'Tangzu',    model: "Wan'er S.G",     price: 19,  userStars: null, userNotes: null },
  { id: 'ear-9',  earphoneId: 9,  brand: 'Moondrop',  model: 'Chu II',          price: 20,  userStars: null, userNotes: null },
  { id: 'ear-10', earphoneId: 10, brand: 'KZ',        model: 'ZAS',             price: 45,  userStars: null, userNotes: null },
  { id: 'ear-11', earphoneId: 11, brand: 'BLON',      model: 'BL-03',           price: 27,  userStars: null, userNotes: null },
  { id: 'ear-12', earphoneId: 12, brand: 'Tanchjim',  model: 'Hana 2021',       price: 99,  userStars: null, userNotes: null },
  { id: 'ear-13', earphoneId: 13, brand: 'Simgot',    model: 'EA500',           price: 79,  userStars: null, userNotes: null },
];


// =============================================================
// SECTION 2: DATABASE QUERY FUNCTION
// =============================================================


// ── getTierListPageData ───────────────────────────────────────────────────────
/**
 * Fetches a complete tier list (meta + tiers + items + unranked pool) by ID.
 *
 * Returns the REAL database data if the tier list exists.
 * Returns MOCK data if the tier list with this ID doesn't exist yet
 * (so you can always see the UI while building it).
 *
 * KEYWORD: export
 *   Makes this function importable by other files (page.tsx, API route).
 *
 * KEYWORD: async function
 *   This function is asynchronous — it uses `await` to pause while
 *   the database responds. The caller must also `await` this function.
 *
 * PARAMETER: id: number
 *   The tier list ID from the URL (e.g., /tier-list/1 → id=1).
 *
 * RETURN TYPE: Promise<TierListPageData | null>
 *   Promise = the value won't exist yet when the function is called.
 *   TierListPageData | null = returns data, OR null if completely not found.
 *   With our mock fallback, this currently always returns data.
 */
export async function getTierListPageData(id: number): Promise<TierListPageData | null> {

  // ── Validate input ──────────────────────────────────────────────────────────
  //
  // isNaN() — "is Not a Number?" Returns true if the value can't be parsed as
  // a number. This guards against URLs like /tier-list/abc crashing the DB query.
  //
  // id <= 0 — negative or zero IDs are invalid (SERIAL starts at 1).
  // ─────────────────────────────────────────────────────────────────────────
  if (isNaN(id) || id <= 0) {
    return null;
  }

  // ── try / catch: safely attempt the database query ─────────────────────────
  //
  // If the Neon database is temporarily unreachable, or the SQL has a bug,
  // the query throws an error. Without try/catch, that error crashes the
  // entire page render. With it, we catch the error, log it, and fall back
  // to mock data so the page still loads.
  // ─────────────────────────────────────────────────────────────────────────
  try {

    // ── Query 1: Fetch the tier list metadata ────────────────────────────────
    //
    // pool.query<RowType>(sql, [params]) returns an object with a `rows` array.
    // The generic <{...}> tells TypeScript what shape each row has.
    //
    // We use AS aliases (user_id AS "userId") to convert SQL snake_case to
    // JavaScript camelCase right in the query. The double quotes are required
    // in PostgreSQL to preserve the camelCase casing (otherwise PostgreSQL
    // lowercases all identifiers).
    // ─────────────────────────────────────────────────────────────────────────
    const metaResult = await pool.query<TierListMeta>(
      `SELECT
         id,
         user_id          AS "userId",
         title,
         description,
         banner_image_url AS "bannerImageUrl",
         theme_color_hex  AS "themeColorHex",
         is_public        AS "isPublic",
         created_at       AS "createdAt"
       FROM tier_lists
       WHERE id = $1`,
      [id]
    );

    // If no tier list with this ID was found in the database, fall back to mock.
    // rows[0] is undefined when the query returns 0 rows.
    if (!metaResult.rows[0]) {
      // FALLBACK: return mock data so the UI is always visible.
      // Remove this block once real user tier lists exist in your database.
      console.log(`[tier-list-queries] ID ${id} not found — serving mock data`);
      return buildMockPageData();
    }

    const meta = metaResult.rows[0];

    // ── Query 2: Fetch the tier rows for this list ───────────────────────────
    //
    // ORDER BY rank_order ASC: retrieve in display order, best tier first.
    // ─────────────────────────────────────────────────────────────────────────
    const tiersResult = await pool.query<ListTier>(
      `SELECT
         id,
         tier_list_id AS "tierListId",
         name,
         color_hex    AS "colorHex",
         rank_order   AS "rankOrder"
       FROM list_tiers
       WHERE tier_list_id = $1
       ORDER BY rank_order ASC`,
      [id]
    );

    const tiers = tiersResult.rows;

    // ── Query 3: Fetch all placed items (tier_list_items JOIN earphones) ──────
    //
    // This is a JOIN query — it fetches data from TWO tables in one query.
    //
    // SYNTAX:  FROM table_a JOIN table_b ON table_a.col = table_b.col
    //   "Combine rows where tier_list_items.earphone_id equals earphones.id"
    //
    // We also JOIN list_tiers so we can filter by tier_list_id.
    // ─────────────────────────────────────────────────────────────────────────
    const itemsResult = await pool.query<TierItem>(
      `SELECT
         tli.id,
         tli.tier_id      AS "tierId",
         tli.earphone_id  AS "earphoneId",
         e.brand,
         e.model,
         e.price,
         tli.user_stars   AS "userStars",
         tli.user_notes   AS "userNotes"
       FROM tier_list_items tli
       JOIN earphones e      ON e.id   = tli.earphone_id
       JOIN list_tiers lt    ON lt.id  = tli.tier_id
       WHERE lt.tier_list_id = $1`,
      [id]
    );

    const items = itemsResult.rows;

    // ── Query 4: Fetch UNRANKED earphones ─────────────────────────────────────
    //
    // "Unranked" = earphones in the master catalog that are NOT placed in this list.
    //
    // NOT IN (...) is a SQL subquery:
    //   "Give me earphones whose id is NOT in the set of already-placed earphone IDs."
    //
    // This ensures each earphone appears exactly once — either in a tier OR in the pool.
    // ─────────────────────────────────────────────────────────────────────────
    const unrankedResult = await pool.query<{
      earphoneId: number;
      brand: string;
      model: string;
      price: number;
    }>(
      `SELECT
         e.id    AS "earphoneId",
         e.brand,
         e.model,
         e.price
       FROM earphones e
       WHERE e.id NOT IN (
         SELECT tli.earphone_id
         FROM tier_list_items tli
         JOIN list_tiers lt ON lt.id = tli.tier_id
         WHERE lt.tier_list_id = $1
       )
       ORDER BY e.brand ASC, e.model ASC`,
      [id]
    );

    // Convert unranked earphones to DraggableItem format.
    // The `map()` array method transforms each item in the array.
    // Syntax: array.map(item => newItem)
    // Here we're turning each DB row into a DraggableItem with the
    // `ear-{id}` string prefix required by dnd-kit.
    const unranked: DraggableItem[] = unrankedResult.rows.map(row => ({
      id: `ear-${row.earphoneId}`,
      earphoneId: row.earphoneId,
      brand: row.brand,
      model: row.model,
      price: row.price,
      userStars: null,
      userNotes: null,
    }));

    // ── Return the assembled data ─────────────────────────────────────────────
    return { meta, tiers, items, unranked };

  } catch (error) {
    // If ANY query threw an error (DB unreachable, etc.), log it and
    // return mock data so the page still renders for development.
    console.error('[tier-list-queries] DB error, falling back to mock:', error);
    return buildMockPageData();
  }
}


// ── buildMockPageData ─────────────────────────────────────────────────────────
//
// A helper function that assembles the MOCK_* constants into a TierListPageData
// object. Called when the real database query finds nothing or errors out.
//
// KEYWORD: function (without async)
//   This function doesn't touch the database, so it doesn't need async.
//   It just reads from constants and returns immediately.
// ─────────────────────────────────────────────────────────────────────────────
function buildMockPageData(): TierListPageData {
  return {
    meta: MOCK_META,
    tiers: MOCK_TIERS,
    items: MOCK_ITEMS,
    unranked: MOCK_UNRANKED,
  };
}
