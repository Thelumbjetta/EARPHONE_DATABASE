-- =============================================================
-- Migration 008: Create the `list_tiers` table
-- =============================================================
-- WHAT THIS FILE DOES:
--   Creates the rows inside a user's tier list.
--   Each row in THIS table represents one "band" or "category" in
--   a tier list — like "S-Tier", "A-Tier", "Garbage", "Not Yet Heard."
--
-- REAL-WORLD ANALOGY:
--   If a tier_lists row is a spreadsheet FILE, then list_tiers rows
--   are the ROWS in that spreadsheet. The user decides how many rows
--   to have, what to call them, and what color to make them.
--
-- WHY IS THIS NAMED `list_tiers` AND NOT `tiers`?
--   The project already has a table named `tiers` (migration 001).
--   That old table stores the SITE's own curated tier labels
--   (S, A, B, C, F) and is linked to the master earphones catalog.
--
--   THIS table stores the USER'S custom tier labels, which are:
--   - Different per tier list (Alice's list has "Garbage", Bob's doesn't).
--   - Created and deleted by users, not site admins.
--   - Linked to tier_lists, not to the global earphones table.
--
--   Naming it `list_tiers` makes the distinction clear in code and
--   prevents a SQL naming collision that would break everything.
--
-- DEPENDENCY ORDER:
--   Must run AFTER 007_create_tier_lists.sql
--   because tier_list_id references tier_lists(id).
-- =============================================================


CREATE TABLE IF NOT EXISTS list_tiers (

    -- ── PRIMARY KEY ────────────────────────────────────────────────────────────
    --
    -- SERIAL PRIMARY KEY: same pattern as every other table.
    -- Each tier ROW in a tier LIST gets its own unique id.
    -- This id is what tier_list_items (migration 009) uses to know
    -- "which row/band does this earphone belong to?"
    -- ─────────────────────────────────────────────────────────────────────────
    id            SERIAL       PRIMARY KEY,


    -- ── PARENT LIST: tier_list_id ───────────────────────────────────────────────
    --
    -- INTEGER NOT NULL:
    --   This row MUST belong to a tier list. An orphaned tier row
    --   (with no parent list) would be meaningless — what list does
    --   it belong to? The NOT NULL constraint prevents this.
    --
    -- REFERENCES tier_lists(id):
    --   Links back to the tier_lists table. PostgreSQL will:
    --   - Verify that tier_list_id actually exists in tier_lists.id
    --     on every INSERT (you can't link to a list that doesn't exist).
    --   - Watch for deletes in tier_lists.
    --
    -- ON DELETE CASCADE:
    --   When a tier_list row is deleted, ALL its list_tiers rows are
    --   automatically deleted too. You don't have to delete the tier rows
    --   manually before deleting the list — PostgreSQL handles it.
    --   The cascade continues: deleting a list_tiers row triggers
    --   cascading deletes in tier_list_items (migration 009).
    -- ─────────────────────────────────────────────────────────────────────────
    tier_list_id  INTEGER      NOT NULL
                  REFERENCES tier_lists(id) ON DELETE CASCADE,


    -- ── TIER ROW NAME ──────────────────────────────────────────────────────────
    --
    -- VARCHAR(100) NOT NULL:
    --   The label the user gives this row. 100 characters is generous
    --   for names like:
    --     "S"  (1 char)
    --     "S-Tier"  (6 chars)
    --     "Absolute Garbage Do Not Buy"  (28 chars)
    --     "Not Yet Heard But On My List"  (29 chars)
    --   NOT NULL: a tier row without a name would be unrenderable.
    -- ─────────────────────────────────────────────────────────────────────────
    name          VARCHAR(100)  NOT NULL,


    -- ── ROW COLOR ──────────────────────────────────────────────────────────────
    --
    -- VARCHAR(10) NOT NULL DEFAULT '#6b7280':
    --   The background color for this tier row in the UI.
    --   Each row in a tier list is typically a distinct color:
    --     S-Tier → gold '#FFD700'
    --     A-Tier → green '#22c55e'
    --     B-Tier → blue  '#3b82f6'
    --     Garbage → red '#ef4444'
    --
    --   DEFAULT '#6b7280' is a neutral grey — used when the user
    --   doesn't specify a color (so the row is still styled).
    --
    --   NOT NULL: every row must have a color so the UI can render it.
    -- ─────────────────────────────────────────────────────────────────────────
    color_hex     VARCHAR(10)   NOT NULL DEFAULT '#6b7280',


    -- ── DISPLAY ORDER ──────────────────────────────────────────────────────────
    --
    -- INTEGER NOT NULL:
    --   Determines the visual order of rows within a list.
    --   Lower rank_order = displayed higher (top of the list).
    --
    --   EXAMPLE: A user creates this tier list:
    --     rank_order=1 → "S-Tier"    (shown at top)
    --     rank_order=2 → "A-Tier"
    --     rank_order=3 → "B-Tier"
    --     rank_order=4 → "Garbage"   (shown at bottom)
    --
    --   The frontend sorts rows by ORDER BY rank_order ASC to display
    --   them from best (lowest number) to worst (highest number).
    --
    --   WHY NOT SORT BY NAME?
    --   Sorting by name would be alphabetical (A before S before Z)
    --   which doesn't match the S > A > B > C hierarchy.
    --   rank_order gives the user full control over ordering.
    --
    --   WHY NOT SORT BY CREATION TIME?
    --   The user might reorder their tiers after creating them
    --   (drag-and-drop UI). rank_order can be updated; created_at can't.
    -- ─────────────────────────────────────────────────────────────────────────
    rank_order    INTEGER       NOT NULL,


    -- ── TABLE-LEVEL CONSTRAINT: UNIQUE RANK WITHIN A LIST ─────────────────────
    --
    -- CONSTRAINT <name> UNIQUE (col1, col2)
    --   A "table-level constraint" applies to the combination of multiple
    --   columns, not just a single column.
    --
    --   This constraint says:
    --   "Within a single tier list, no two rows can have the same rank_order."
    --
    --   WHY?
    --   If two rows in the same list both had rank_order=1, the frontend
    --   wouldn't know which to display first. The ordering would be ambiguous.
    --
    --   HOW IT WORKS:
    --   The UNIQUE check is on the COMBINATION of (tier_list_id, rank_order).
    --   So: tier_list_id=5 rank_order=1 is fine.
    --       tier_list_id=5 rank_order=1 a SECOND time → PostgreSQL error.
    --       tier_list_id=6 rank_order=1 → FINE (different list, same order).
    --   Two DIFFERENT lists can both have a row with rank_order=1.
    --   The uniqueness is scoped to each individual list.
    --
    --   Naming the constraint (uq_list_tiers_order) is optional but makes
    --   the error message readable: "violates unique constraint uq_list_tiers_order"
    --   is more debuggable than "violates unique constraint list_tiers_pkey".
    -- ─────────────────────────────────────────────────────────────────────────
    CONSTRAINT uq_list_tiers_order UNIQUE (tier_list_id, rank_order)
);


-- =============================================================
-- INDEXES FOR list_tiers
-- =============================================================

-- ── Index: fetch all tier rows for a given tier list ──────────────────────────
--
-- QUERY THIS OPTIMIZES:
--   "Give me all rows (tiers) for tier list #42, in display order."
--   SELECT * FROM list_tiers
--   WHERE tier_list_id = 42
--   ORDER BY rank_order ASC;
--
-- This query runs every time a user opens a tier list to view or edit it.
-- It's the most common query against this table, so it must be indexed.
--
-- The UNIQUE constraint on (tier_list_id, rank_order) already creates
-- an implicit index on those two columns together. However, we add this
-- explicit single-column index on tier_list_id alone because PostgreSQL
-- can use it more efficiently for simple WHERE tier_list_id = $1 queries
-- where we then sort separately in the application.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_list_tiers_tier_list_id
    ON list_tiers (tier_list_id);
