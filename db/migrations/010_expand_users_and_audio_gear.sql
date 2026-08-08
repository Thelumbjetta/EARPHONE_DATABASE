-- =============================================================
-- Migration 010: Expand `users` table & create `audio_gear` catalog
-- =============================================================
--
-- WHAT THIS FILE DOES (two jobs in one migration):
--
--   JOB 1 — Extend the existing `users` table with four new columns:
--     - reputation:  A running integer score accumulated from upvotes/karma.
--     - post_count:  A denormalized count of total forum posts by this user.
--     - avatar_url:  URL to the user's profile picture (nullable).
--     - bio:         A short self-description (nullable, free text).
--
--   JOB 2 — Create the `audio_gear` table, a generalized gear catalog
--     that supersedes the older `earphones` table by supporting multiple
--     categories: IEMs, Over-Ear Headphones, DACs/Amps, etc.
--
-- WHY ALTER TABLE INSTEAD OF CHANGING MIGRATION 004?
--   The `users` table was created in migration 004 and may already exist
--   in your database. Editing migration 004 directly and re-running it
--   would have no effect — "IF NOT EXISTS" would skip the CREATE TABLE.
--   The correct, safe approach is to add NEW columns via ALTER TABLE
--   in a new migration file. This is how real-world teams evolve schemas
--   without wiping data.
--
-- WHY A NEW `audio_gear` TABLE INSTEAD OF RENAMING `earphones`?
--   Migration 002 created `earphones`, and migration 009 has a foreign key
--   pointing at it (`tier_list_items.earphone_id → earphones.id`).
--   Renaming or dropping `earphones` would break that FK chain and the
--   existing `db/import.js` script. Creating `audio_gear` as a new table
--   is non-destructive — both tables coexist, and future code can migrate
--   data from `earphones` → `audio_gear` at your own pace.
--
-- DEPENDENCY ORDER:
--   Must run AFTER 004_create_users.sql (to ALTER TABLE users).
--   No dependency on 005–009.
-- =============================================================


-- =============================================================
-- JOB 1: Extend the `users` table with forum profile columns
-- =============================================================

-- ── WHAT IS ALTER TABLE? ──────────────────────────────────────────────────────
--
-- ALTER TABLE lets you CHANGE an existing table's structure without
-- dropping and recreating it. The most common sub-command is ADD COLUMN.
--
-- Syntax:
--   ALTER TABLE <table_name> ADD COLUMN IF NOT EXISTS <column_definition>;
--
-- KEYWORD: IF NOT EXISTS
--   Just like CREATE TABLE IF NOT EXISTS, this prevents an error if you
--   run the migration twice. PostgreSQL 9.6+ supports IF NOT EXISTS on
--   ADD COLUMN. Without it, running migrate.js a second time would throw:
--   "column 'reputation' of relation 'users' already exists"
-- ─────────────────────────────────────────────────────────────────────────────


-- ── New column: reputation ────────────────────────────────────────────────────
--
-- INTEGER: A whole number (no decimals). Karma scores don't need decimals.
--
-- NOT NULL DEFAULT 0:
--   New users start with zero reputation. Every new account gets this
--   value automatically without you explicitly providing it in the INSERT.
--   NOT NULL means the reputation can never be set to NULL (empty) —
--   it must always be a number, even if that number is 0.
--
-- HOW IT'S USED:
--   - Incremented when the user's thread/comment receives an upvote.
--   - Decremented on downvote (if your app supports that).
--   - Displayed on profile pages as a badge or score.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reputation INTEGER NOT NULL DEFAULT 0;


-- ── New column: post_count ────────────────────────────────────────────────────
--
-- INTEGER NOT NULL DEFAULT 0:
--   Tracks how many threads + comments this user has created.
--
-- WHY DENORMALIZE? (why not just COUNT() at query time?)
--   You could always do:
--     SELECT COUNT(*) FROM threads WHERE user_id = $1;
--   But doing that on every profile page load is expensive when a user
--   has 5,000 posts. Storing a cached count here means reading ONE column
--   from ONE row, which is instant.
--
-- TRADE-OFF: You must remember to increment/decrement this counter
--   whenever a post/comment is created or deleted. This is done in the
--   API route handlers (application layer), not in the database (which
--   would require triggers — an advanced topic we're avoiding here).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS post_count INTEGER NOT NULL DEFAULT 0;


-- ── New column: avatar_url ────────────────────────────────────────────────────
--
-- TEXT (nullable, no NOT NULL):
--   A URL pointing to the user's profile avatar image.
--   Examples:
--     'https://your-cdn.com/avatars/alice.jpg'
--     'https://gravatar.com/avatar/abc123?d=identicon'
--
-- WHY TEXT (not VARCHAR)?
--   Cloud storage URLs (S3, Cloudinary, Vercel Blob) can be long.
--   TEXT has no length limit, VARCHAR(255) can be too short.
--
-- WHY NULLABLE?
--   Not all users will upload a profile picture. NULL = "no avatar set."
--   The frontend handles this: if (user.avatar_url) { show image } else { show default }
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;


-- ── New column: bio ───────────────────────────────────────────────────────────
--
-- TEXT (nullable):
--   A short self-description the user can set on their profile.
--   Examples:
--     "IEM addict. Treble-head. KZ survivor."
--     "Basshead from Jakarta. Into warm signatures."
--
-- TEXT = unlimited length. Users who write essays in their bio are fine.
-- Nullable = most users won't fill this out, and that's normal.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bio TEXT;


-- =============================================================
-- INDEXES for the new `users` columns
-- =============================================================

-- Fast leaderboard query: "Show top 10 users by reputation."
-- SELECT * FROM users ORDER BY reputation DESC LIMIT 10;
CREATE INDEX IF NOT EXISTS idx_users_reputation
  ON users (reputation DESC);


-- =============================================================
-- JOB 2: Create the `audio_gear` table (generalized gear catalog)
-- =============================================================
--
-- WHAT IS `audio_gear`?
--   The existing `earphones` table (migration 002) was originally designed
--   only for IEMs (In-Ear Monitors). The community forum needs a broader
--   catalog supporting multiple gear CATEGORIES:
--     - IEM (In-Ear Monitor)
--     - Over-Ear (full-size headphones)
--     - DAC/Amp (digital-to-analog converters and amplifiers)
--
--   `audio_gear` is that generalized catalog. It has all the columns
--   `earphones` had, plus:
--     - msrp:         Manufacturer's Suggested Retail Price in USD
--     - driver_type:  The transducer technology (Dynamic, BA, Planar, EST, Hybrid)
--     - category:     Which product class this gear belongs to
-- =============================================================

CREATE TABLE IF NOT EXISTS audio_gear (

    -- ── PRIMARY KEY ────────────────────────────────────────────────────────────
    --
    -- SERIAL PRIMARY KEY: Same pattern as every other table.
    -- Each gear item in the catalog gets a unique auto-incrementing id.
    -- ─────────────────────────────────────────────────────────────────────────
    id           SERIAL        PRIMARY KEY,


    -- ── BRAND ─────────────────────────────────────────────────────────────────
    --
    -- VARCHAR(100) NOT NULL:
    --   The manufacturer's name. Examples: 'Moondrop', 'Sony', 'DUNU', 'Sennheiser'.
    --   100 characters is generous for any brand name in the audio industry.
    --   NOT NULL: Every product must belong to a brand.
    -- ─────────────────────────────────────────────────────────────────────────
    brand        VARCHAR(100)  NOT NULL,


    -- ── MODEL ─────────────────────────────────────────────────────────────────
    --
    -- VARCHAR(150) NOT NULL:
    --   The product's model name. Examples: 'Aria 2', 'WH-1000XM5', 'Titan S'.
    --   150 characters covers even the most verbose model names.
    --   NOT NULL: A product must have a model name.
    -- ─────────────────────────────────────────────────────────────────────────
    model        VARCHAR(150)  NOT NULL,


    -- ── MSRP (Manufacturer's Suggested Retail Price) ──────────────────────────
    --
    -- NUMERIC(10,2):
    --   Stores a decimal number with up to 10 total digits and 2 decimal places.
    --   Examples: 19.99, 299.00, 1299.95, 4999.00
    --
    --   WHY NUMERIC AND NOT FLOAT/REAL?
    --   Floating-point arithmetic in computers is imprecise:
    --     0.1 + 0.2 = 0.30000000000000004 in floating-point math.
    --   NUMERIC is EXACT — 19.99 stored as 19.99, always. Critical for prices.
    --
    --   WHY NOT INTEGER (cents)?
    --   Migration 002 used INTEGER for `price` (storing cents: $19.99 = 1999).
    --   NUMERIC(10,2) is more readable in queries and easier to display:
    --   no division by 100 needed. Both approaches are valid — we use NUMERIC here.
    --
    -- Nullable: Not all gear has a published MSRP (discontinued, custom, sample units).
    -- ─────────────────────────────────────────────────────────────────────────
    msrp         NUMERIC(10,2),


    -- ── DRIVER TYPE ───────────────────────────────────────────────────────────
    --
    -- VARCHAR(50) (nullable):
    --   The transducer/driver technology used to produce sound.
    --   Standard values in the audiophile community:
    --     'Dynamic'   — a single moving-coil driver (most common, good bass)
    --     'BA'        — balanced armature (fast, detailed, common in hearing aids and IEMs)
    --     'Planar'    — planar magnetic (flat diaphragm, even response, usually over-ear)
    --     'EST'       — electrostatic (extremely fast, used for treble in hybrids)
    --     'Hybrid'    — combination of driver types (e.g., 1 Dynamic + 2 BA)
    --     'Piezoelectric' — rare, used in some budget IEMs
    --
    -- VARCHAR(50): Enough for any driver type name, including 'Hybrid (1DD+4BA+1EST)'.
    -- Nullable: DACs/Amps don't have drivers — driver_type = NULL for those.
    -- ─────────────────────────────────────────────────────────────────────────
    driver_type  VARCHAR(50),


    -- ── CATEGORY ──────────────────────────────────────────────────────────────
    --
    -- VARCHAR(50) NOT NULL:
    --   The broad product class. Standard values:
    --     'IEM'       — In-Ear Monitor (inserted in the ear canal)
    --     'Over-Ear'  — Full-size headphones that sit over the ears
    --     'On-Ear'    — Smaller headphones that rest on (not over) the ear
    --     'DAC'       — Digital-to-Analog Converter
    --     'Amp'       — Headphone amplifier
    --     'DAC/Amp'   — Combined unit
    --     'Cable'     — Aftermarket audio cable
    --
    -- NOT NULL: Every product must be categorized.
    -- ─────────────────────────────────────────────────────────────────────────
    category     VARCHAR(50)   NOT NULL,


    -- ── CREATION TIMESTAMP ────────────────────────────────────────────────────
    --
    -- TIMESTAMPTZ NOT NULL DEFAULT NOW():
    --   Records when this gear entry was added to the catalog.
    --   TIMESTAMPTZ = "Timestamp with Time Zone" — timezone-safe.
    --   DEFAULT NOW() = auto-filled by the database at INSERT time.
    -- ─────────────────────────────────────────────────────────────────────────
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),


    -- ── COMPOSITE UNIQUE CONSTRAINT ───────────────────────────────────────────
    --
    -- CONSTRAINT <name> UNIQUE (col1, col2):
    --   A "table-level constraint" that applies to the COMBINATION of two columns.
    --   This prevents inserting the same brand+model twice:
    --     INSERT ('Moondrop', 'Aria 2') → succeeds the first time.
    --     INSERT ('Moondrop', 'Aria 2') → fails with unique violation error.
    --
    --   The name 'uq_audio_gear_brand_model' appears in error messages,
    --   making it easy to diagnose: "violates unique constraint uq_audio_gear_brand_model"
    --   tells you exactly what went wrong without digging into the schema.
    -- ─────────────────────────────────────────────────────────────────────────
    CONSTRAINT uq_audio_gear_brand_model UNIQUE (brand, model)
);


-- =============================================================
-- INDEXES for `audio_gear`
-- =============================================================

-- Fast filter by category: "Show me all IEMs in the catalog."
-- SELECT * FROM audio_gear WHERE category = 'IEM';
-- This is the most common filter on a forum gear catalog.
CREATE INDEX IF NOT EXISTS idx_audio_gear_category
    ON audio_gear (category);

-- Fast filter by brand: "Show me all Moondrop products."
-- SELECT * FROM audio_gear WHERE brand = 'Moondrop' ORDER BY model;
CREATE INDEX IF NOT EXISTS idx_audio_gear_brand
    ON audio_gear (brand);

-- Fast sort by MSRP for "budget finder" or "sort by price" features.
-- SELECT * FROM audio_gear WHERE category = 'IEM' ORDER BY msrp ASC;
CREATE INDEX IF NOT EXISTS idx_audio_gear_msrp
    ON audio_gear (msrp ASC);
