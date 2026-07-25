-- =============================================================
-- Migration 009: Create the `tier_list_items` table
-- =============================================================
-- WHAT IS A "JUNCTION TABLE"?
--   Before explaining the columns, let's understand WHY this table exists.
--
--   In relational databases, when two tables have a "many-to-many"
--   relationship, you can't link them directly. You need a third table
--   in between, called a "junction table" (also called a "bridge table,"
--   "join table," or "associative table").
--
--   THE MANY-TO-MANY PROBLEM:
--     An earphone can appear in MANY tier lists.
--     A tier list can contain MANY earphones.
--
--   You can't solve this with a single foreign key column on either table:
--     - If you put tier_id on earphones: "Moondrop Aria is in tier 5."
--       But what if it's also in tier 7? You'd need multiple tier_id columns.
--       That's unworkable and called "repeating groups" — a database anti-pattern.
--     - If you put earphone_id on list_tiers: same problem, reversed.
--
--   THE JUNCTION TABLE SOLUTION:
--     Create a third table where each ROW represents ONE pairing:
--     "Earphone X is placed in Tier Row Y."
--     
--     For example:
--       id=1: tier_id=10 (Alice's S-Tier), earphone_id=55 (Moondrop Aria)
--       id=2: tier_id=10 (Alice's S-Tier), earphone_id=88 (7Hz Salnotes Zero)
--       id=3: tier_id=11 (Alice's A-Tier), earphone_id=32 (CCA CRA)
--       id=4: tier_id=20 (Bob's S-Tier),   earphone_id=55 (Moondrop Aria again, different list)
--
--     The Moondrop Aria (earphone_id=55) appears in BOTH Alice's S-Tier
--     AND Bob's S-Tier. The same earphone exists once in the master catalog
--     but can be "placed" into unlimited tier lists. This is the power of
--     junction tables — no data duplication.
--
-- EXTRA COLUMNS:
--   Unlike a pure junction table (which would have ONLY tier_id and earphone_id),
--   ours adds user_stars and user_notes. This is valid and common — it stores
--   data that is specific to THIS PLACEMENT (Alice's opinion of the Aria
--   in HER tier list is different from Bob's opinion in HIS list).
--
-- DEPENDENCY ORDER:
--   Must run AFTER:
--   - 008_create_list_tiers.sql  (we reference list_tiers.id)
--   - 002_create_earphones.sql   (we reference earphones.id)
-- =============================================================


CREATE TABLE IF NOT EXISTS tier_list_items (

    -- ── PRIMARY KEY ────────────────────────────────────────────────────────────
    --
    -- Even junction tables get their own auto-incrementing id.
    -- This is the standard modern approach (called a "surrogate key").
    --
    -- An alternative is a "composite primary key" using (tier_id, earphone_id)
    -- together as the PK. We avoid that here because:
    --   1. A surrogate id is simpler to reference from the frontend.
    --   2. We might want to allow the same earphone in multiple tier rows
    --      in the same list someday (though today's UNIQUE constraint below
    --      prevents it at the tier-row level).
    -- ─────────────────────────────────────────────────────────────────────────
    id            SERIAL         PRIMARY KEY,


    -- ── FOREIGN KEY: which tier ROW does this item belong to? ─────────────────
    --
    -- INTEGER NOT NULL:
    --   An item must be placed somewhere — it can't float without a row.
    --
    -- REFERENCES list_tiers(id):
    --   Links to a specific tier row (e.g., "Alice's S-Tier row").
    --   PostgreSQL verifies this id exists in list_tiers on every INSERT.
    --
    -- ON DELETE CASCADE:
    --   If a list_tiers row is deleted (e.g., user removes their "S-Tier" row
    --   entirely), all items placed in that row are automatically deleted too.
    --   This triggers from up the chain as well:
    --     Delete tier_list → deletes list_tiers rows → deletes tier_list_items.
    -- ─────────────────────────────────────────────────────────────────────────
    tier_id       INTEGER        NOT NULL
                  REFERENCES list_tiers(id) ON DELETE CASCADE,


    -- ── FOREIGN KEY: which earphone is this? ──────────────────────────────────
    --
    -- INTEGER NOT NULL:
    --   Every placed item must reference a real earphone from the master catalog.
    --
    -- REFERENCES earphones(id):
    --   Links to the earphones table (migration 002).
    --   The master earphones catalog is the "source of truth" for product data.
    --   Users don't create new earphones — they place EXISTING ones into tiers.
    --   This ensures product info (brand, model, price) is always accurate
    --   and maintained in one place.
    --
    -- ON DELETE CASCADE:
    --   If an earphone is ever removed from the master catalog, all
    --   tier list items referencing it are automatically cleaned up.
    --   No orphaned "phantom product" entries remain.
    -- ─────────────────────────────────────────────────────────────────────────
    earphone_id   INTEGER        NOT NULL
                  REFERENCES earphones(id) ON DELETE CASCADE,


    -- ── PERSONAL STAR RATING ───────────────────────────────────────────────────
    --
    -- NUMERIC(3,1):
    --   A fixed-precision decimal number.
    --   NUMERIC(precision, scale) where:
    --     precision = total significant digits (3)
    --     scale     = digits after the decimal point (1)
    --   So NUMERIC(3,1) can store values like:
    --     0.0, 4.5, 9.9, 10.0 (but NOT 10.05 — that has 2 decimal digits)
    --
    --   Valid range for ratings: 0.0 to 99.9 (3 total digits, 1 decimal).
    --   Since we want 0.0–10.0, NUMERIC(3,1) is perfect.
    --
    --   WHY NOT INTEGER?
    --   Users often want half-star ratings: 7.5, 8.5, 9.5. Integer (7, 8, 9)
    --   loses this precision. NUMERIC(3,1) allows exactly one decimal place.
    --
    --   WHY NOT FLOAT/REAL?
    --   Floating point numbers (0.1 + 0.2 = 0.30000000000000004 in computers)
    --   have rounding errors. NUMERIC is exact — 7.5 stored as 7.5, always.
    --
    -- NULL (no NOT NULL constraint):
    --   The user may choose NOT to leave a star rating. They might just
    --   want to place the earphone in a tier without rating it numerically.
    --   NULL = "not rated yet." Your frontend handles: user_stars ?? 'Unrated'
    -- ─────────────────────────────────────────────────────────────────────────
    user_stars    NUMERIC(3,1),


    -- ── PERSONAL TEXT NOTES ────────────────────────────────────────────────────
    --
    -- TEXT (nullable):
    --   The user's personal mini-review or notes about this earphone.
    --   Examples:
    --     "Best bass for the price. Slightly sibilant treble."
    --     "Got it as a gift. Still prefer the Aria overall."
    --     "Perfect for hip-hop, not great for classical."
    --
    --   TEXT = unlimited length, because some users write detailed reviews.
    --   Nullable = many users will just place earphones without notes.
    -- ─────────────────────────────────────────────────────────────────────────
    user_notes    TEXT,


    -- ── UNIQUENESS CONSTRAINT: no earphone duplicate in the same tier row ──────
    --
    -- CONSTRAINT <name> UNIQUE (col1, col2)
    --   A table-level constraint (covers two columns together).
    --
    --   This prevents: the same earphone appearing TWICE in the same tier row.
    --   Example prevented: Moondrop Aria in Alice's S-Tier row twice.
    --
    --   SCOPE NOTE:
    --   The uniqueness is at the TIER ROW level, not the TIER LIST level.
    --   Technically, a user COULD place the same earphone in BOTH their
    --   S-Tier row AND their A-Tier row (different tier_id values).
    --
    --   WHY ALLOW THIS AT THE DB LEVEL?
    --   Enforcing cross-row uniqueness in the database would require a
    --   complex PostgreSQL TRIGGER or a partial index — both are advanced
    --   topics that add maintenance overhead. The standard approach is
    --   to enforce "one earphone per tier list" in the APPLICATION layer:
    --   before inserting a new item, your JavaScript first checks:
    --
    --     SELECT * FROM tier_list_items
    --     JOIN list_tiers ON list_tiers.id = tier_list_items.tier_id
    --     WHERE list_tiers.tier_list_id = $listId
    --     AND tier_list_items.earphone_id = $earphoneId;
    --
    --   If a row is returned, the earphone is already in the list → show error.
    --   If empty → safe to insert.
    --
    --   This is the real-world standard pattern (used by Notion, Airtable, etc.)
    --   because it keeps the database schema simple and puts business logic
    --   where it's easier to test and maintain — in the application layer.
    -- ─────────────────────────────────────────────────────────────────────────
    CONSTRAINT uq_tier_list_item UNIQUE (tier_id, earphone_id)
);


-- =============================================================
-- INDEXES FOR tier_list_items
-- =============================================================

-- ── Index: fetch all items in a tier row ──────────────────────────────────────
--
-- QUERY THIS OPTIMIZES:
--   "Show me all earphones placed in Alice's S-Tier row."
--   SELECT * FROM tier_list_items WHERE tier_id = 10;
--
-- This is the most critical query in the entire application.
-- It runs every time a tier list page is rendered. EVERY tier row
-- in the list triggers this query once. A tier list with 6 rows
-- triggers 6 of these queries when the page loads.
-- This index makes each one instant.
--
-- (Note: the UNIQUE constraint on (tier_id, earphone_id) already
-- creates an implicit index on both columns together. This single-column
-- index on tier_id alone allows even faster single-column lookups.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tier_list_items_tier_id
    ON tier_list_items (tier_id);


-- ── Index: find which tier lists contain a specific earphone ──────────────────
--
-- QUERY THIS OPTIMIZES:
--   "How many users put the Moondrop Aria in their tier lists?"
--   SELECT COUNT(*) FROM tier_list_items WHERE earphone_id = 55;
--
-- Useful for an earphone's "popularity" score or for showing
-- "X users rated this product" on the earphone detail page.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tier_list_items_earphone_id
    ON tier_list_items (earphone_id);
