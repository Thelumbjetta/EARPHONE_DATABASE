-- =============================================================
-- Migration 007: Create the `tier_lists` table
-- =============================================================
-- WHAT THIS FILE DOES:
--   Creates the top-level container for a user's custom tier list.
--   Think of a "tier list" like a Google Doc — it has a title,
--   a description, a visual theme, and it belongs to exactly one user.
--
--   A user can have MANY tier lists. Each tier list is then filled
--   with rows (in `list_tiers`, migration 008) and items placed into
--   those rows (in `tier_list_items`, migration 009).
--
-- REAL-WORLD EXAMPLE:
--   User "Alice" creates a tier list titled "Best Budget IEMs Under $100".
--   She sets a purple theme color and uploads a banner image.
--   She marks it as public so other visitors can see her rankings.
--   That entire concept is ONE ROW in this `tier_lists` table.
--
-- DEPENDENCY ORDER:
--   Must run AFTER 004_create_users.sql
--   because user_id is a foreign key that references users(id).
--
-- NAMING NOTE:
--   The project already has an older `tiers` table (migration 001)
--   which stores the SITE'S OWN curated tier labels (S, A, B, C, F).
--   THIS table (`tier_lists`) is completely different — it stores
--   USER-CREATED tier list containers. Do not confuse the two.
-- =============================================================


-- ── Understanding CREATE TABLE IF NOT EXISTS (recap for new readers) ──────────
--
-- We always write "IF NOT EXISTS" to make our migrations "idempotent."
-- IDEMPOTENT means: "safe to run multiple times with the same result."
--
-- Without it: running migrate.js twice would throw "table already exists."
-- With it: the second run simply skips the CREATE and moves on.
-- This is critical for automated deployment pipelines.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tier_lists (

    -- ── PRIMARY KEY ────────────────────────────────────────────────────────────
    --
    -- SERIAL:
    --   A PostgreSQL shorthand. Under the hood it does two things:
    --   1. Creates a SEQUENCE (a database counter object).
    --   2. Sets the column's DEFAULT to be "read next value from the sequence."
    --   Result: every new row gets the next integer automatically.
    --   First row → id=1, second → id=2, etc. You never specify this yourself.
    --
    -- PRIMARY KEY:
    --   Two automatic guarantees:
    --   1. UNIQUE — no two rows share this id.
    --   2. NOT NULL — this column can never be empty.
    --   Every table should have exactly one PRIMARY KEY.
    -- ─────────────────────────────────────────────────────────────────────────
    id               SERIAL        PRIMARY KEY,


    -- ── OWNER: user_id ─────────────────────────────────────────────────────────
    --
    -- INTEGER NOT NULL:
    --   A whole number. Cannot be left empty. Every tier list must have
    --   a registered user who created it — anonymous lists are not allowed.
    --
    -- REFERENCES users(id):
    --   This is a FOREIGN KEY constraint. It says:
    --   "The value stored in user_id MUST exist as an `id` in the `users` table."
    --   PostgreSQL enforces this automatically on every INSERT and UPDATE.
    --   If you try to insert a tier list with user_id=999 and no user 999
    --   exists, PostgreSQL rejects it with a foreign key violation error.
    --
    -- ON DELETE CASCADE:
    --   What happens when the user account is deleted?
    --   CASCADE means: "automatically delete ALL their tier lists too."
    --   This prevents orphaned tier lists with no owner.
    --   The cascade continues down the chain:
    --     Delete user → deletes their tier_lists →
    --     which deletes their list_tiers → which deletes their tier_list_items.
    --   One delete, no orphans anywhere. The database stays clean.
    -- ─────────────────────────────────────────────────────────────────────────
    user_id          INTEGER       NOT NULL
                     REFERENCES users(id) ON DELETE CASCADE,


    -- ── LIST TITLE ─────────────────────────────────────────────────────────────
    --
    -- VARCHAR(200):
    --   "Variable Character" — a text string up to 200 characters long.
    --   PostgreSQL stores exactly what you put in (5 chars for "HBBs",
    --   not padded to 200). The 200 limit prevents absurdly long titles
    --   while allowing plenty of room for descriptive names like:
    --   "My Complete Ranking of All Sub-$50 IEMs I've Tried in 2026."
    --
    -- NOT NULL:
    --   A tier list must have a title. No nameless lists.
    -- ─────────────────────────────────────────────────────────────────────────
    title            VARCHAR(200)  NOT NULL,


    -- ── DESCRIPTION ────────────────────────────────────────────────────────────
    --
    -- TEXT:
    --   An unlimited-length string. Unlike VARCHAR, TEXT has no cap.
    --   Descriptions can be several paragraphs long — methodology notes,
    --   "how I ranked these," disclaimers, etc.
    --
    -- No NOT NULL means this column is NULLABLE.
    --   NULL in SQL means "no value" (not an empty string, not zero — nothing).
    --   Some tier lists won't have a description, and that's fine.
    --   In your JavaScript: if (tierList.description !== null) { ... }
    -- ─────────────────────────────────────────────────────────────────────────
    description      TEXT,


    -- ── BANNER IMAGE URL ───────────────────────────────────────────────────────
    --
    -- TEXT (nullable):
    --   Stores a URL to the user's uploaded banner image.
    --   Examples:
    --     "https://your-cdn.com/banners/alice-garbage-bg.jpg"
    --     "https://i.imgur.com/some-custom-background.png"
    --
    --   WHY TEXT AND NOT VARCHAR(255)?
    --   URLs from cloud storage (like Vercel Blob, AWS S3, Cloudinary)
    --   can sometimes exceed 255 characters due to signed URL parameters.
    --   TEXT is the safe choice for any URL storage.
    --
    --   NULLABLE: Not every list needs a custom banner.
    --   If NULL, the frontend uses a default gradient or solid color.
    -- ─────────────────────────────────────────────────────────────────────────
    banner_image_url TEXT,


    -- ── THEME COLOR ────────────────────────────────────────────────────────────
    --
    -- VARCHAR(10):
    --   Stores a CSS hex color code like "#6366f1" (7 chars) or
    --   "#FF5733" (7 chars) or even "#F53" (4 chars short form).
    --   VARCHAR(10) gives comfortable room for the 7-char standard format
    --   plus the 9-char format with alpha channel: "#6366f1FF".
    --
    -- NOT NULL DEFAULT '#6366f1':
    --   NOT NULL: This column must always have a value.
    --   DEFAULT: If the user doesn't pick a color, we automatically use
    --   '#6366f1' (a nice indigo/purple — a modern default).
    --   The user can override it when creating or editing their list.
    --
    --   WHY STORE THIS IN THE DATABASE?
    --   If stored only in CSS/frontend code, you'd need to hardcode it.
    --   In the database, each list can have its own unique color that
    --   the frontend reads and applies dynamically at render time.
    -- ─────────────────────────────────────────────────────────────────────────
    theme_color_hex  VARCHAR(10)   NOT NULL DEFAULT '#6366f1',


    -- ── VISIBILITY FLAG ────────────────────────────────────────────────────────
    --
    -- BOOLEAN:
    --   Stores either TRUE or FALSE. Nothing else.
    --   In PostgreSQL, you can also write 't'/'f', 'yes'/'no', '1'/'0'.
    --   We use TRUE/FALSE for clarity.
    --
    -- NOT NULL DEFAULT TRUE:
    --   Every list must have a visibility setting (NOT NULL).
    --   By default, new lists are PUBLIC (DEFAULT TRUE).
    --   TRUE = public (anyone on the site can view it).
    --   FALSE = private (only the owner can see it).
    --
    --   IN YOUR APPLICATION:
    --   When fetching lists for the community page, add:
    --     WHERE is_public = TRUE
    --   When the owner views their own dashboard, show all:
    --     WHERE user_id = $1  (no is_public filter needed)
    -- ─────────────────────────────────────────────────────────────────────────
    is_public        BOOLEAN       NOT NULL DEFAULT TRUE,


    -- ── CREATION TIMESTAMP ─────────────────────────────────────────────────────
    --
    -- TIMESTAMPTZ:
    --   "Timestamp with Time Zone." Stores the exact moment a list was created,
    --   including the UTC offset. Example: "2026-07-24 22:00:00+05:30"
    --
    -- WHY TIMESTAMPTZ AND NOT JUST TIMESTAMP?
    --   A plain TIMESTAMP has no timezone info. If your server moves from
    --   one timezone to another, or if you have users globally, all your
    --   stored times become ambiguous. TIMESTAMPTZ stores the absolute
    --   UTC moment — timezone-safe forever.
    --
    -- NOT NULL DEFAULT NOW():
    --   NOT NULL: Every row must have a creation time.
    --   NOW(): A built-in PostgreSQL function returning the current time.
    --   You never manually set this — the database fills it in automatically.
    -- ─────────────────────────────────────────────────────────────────────────
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- =============================================================
-- INDEXES FOR tier_lists
-- =============================================================
--
-- WHY INDEXES? (recap)
--   Without an index, every query scans EVERY row in the table.
--   With an index, PostgreSQL jumps directly to matching rows.
--   For a table that could have millions of rows, the difference
--   between an indexed and unindexed query is seconds vs milliseconds.
--
--   Trade-off: indexes use extra storage and slow down writes slightly.
--   For read-heavy features like browsing tier lists, always worth it.
-- =============================================================


-- ── Index: fetch all lists by a specific user ─────────────────────────────────
--
-- QUERY THIS OPTIMIZES:
--   "Show me all tier lists created by user Alice."
--   SELECT * FROM tier_lists WHERE user_id = 1;
--
-- This runs every time a user visits their own dashboard or another
-- user's profile page. Very frequent. Needs to be fast.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tier_lists_user_id
    ON tier_lists (user_id);


-- ── Index: browse public lists newest-first ───────────────────────────────────
--
-- QUERY THIS OPTIMIZES:
--   "Show the 20 most recently created public tier lists."
--   SELECT * FROM tier_lists
--   WHERE is_public = TRUE
--   ORDER BY created_at DESC
--   LIMIT 20;
--
-- This runs on the community browse page. PostgreSQL can use this
-- composite index to filter by is_public AND sort by created_at
-- in one efficient operation — no full table scan needed.
--
-- A "composite index" covers multiple columns. The order matters:
-- Put the equality filter column (is_public) first, the sort
-- column (created_at) second. This matches the query pattern above.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tier_lists_public_recent
    ON tier_lists (is_public, created_at DESC);
