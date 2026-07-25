-- =============================================================
-- Migration 004: Create the `users` table
-- =============================================================
-- HOW SQL MIGRATIONS WORK (beginner explanation):
--   A "migration" is just a numbered SQL script that changes the
--   shape of your database — adding tables, columns, indexes, etc.
--   We number them (001, 002, 003 …) so they always run in the
--   same order. Think of them like Git commits for your database.
--
-- WHAT THIS FILE DOES:
--   Creates the `users` table, which is the foundation of all
--   forum activity. Every post and every comment will reference
--   a row in this table through a "foreign key" (explained later).
--
-- IMPORTANT: Run migrations IN ORDER.
--   This file (004) must be run AFTER 003_create_scores.sql.
--   The `posts` and `comments` tables (005, 006) depend on this
--   table existing first.
-- =============================================================


-- ── Understanding IF NOT EXISTS ────────────────────────────────────────────────
--
-- Syntax:  CREATE TABLE IF NOT EXISTS <table_name> ( ... );
--
-- Without "IF NOT EXISTS": if the table already exists, PostgreSQL
-- throws an error and the migration fails — which is catastrophic
-- if you're running migrations automatically on app startup.
--
-- WITH "IF NOT EXISTS": PostgreSQL silently skips the CREATE if the
-- table already exists. This makes the migration "idempotent" —
-- safe to run multiple times without side effects.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (

    -- ── PRIMARY KEY ────────────────────────────────────────────────────────────
    --
    -- KEYWORD: id
    --   The column name. By convention, every table has an `id` column
    --   as its unique identifier.
    --
    -- KEYWORD: SERIAL
    --   A PostgreSQL shortcut. It creates an INTEGER column AND attaches
    --   an auto-incrementing sequence to it. When you INSERT a row without
    --   specifying `id`, PostgreSQL picks the next number automatically:
    --   1 → 2 → 3 → 4 …
    --   You will never need to manually choose an ID.
    --
    -- KEYWORD: PRIMARY KEY
    --   Declares this column as the table's unique identifier.
    --   Two things happen automatically:
    --     1. A UNIQUE constraint is added (no two rows can share the same id).
    --     2. A NOT NULL constraint is added (id can never be empty/null).
    --   Every table should have exactly one PRIMARY KEY.
    -- ─────────────────────────────────────────────────────────────────────────
    id            SERIAL        PRIMARY KEY,

    -- ── USERNAME ───────────────────────────────────────────────────────────────
    --
    -- KEYWORD: VARCHAR(50)
    --   "Variable Character" — a text string of variable length, with a
    --   maximum of 50 characters. PostgreSQL stores only what you put in,
    --   so "Alice" uses 5 bytes, not 50.
    --   Why 50? Usernames are short by social convention. This prevents
    --   someone from inserting a 10,000-character "username."
    --
    -- KEYWORD: NOT NULL
    --   This column MUST have a value. If you try to INSERT a row without
    --   providing a username, PostgreSQL will reject it with an error.
    --   This is a data-integrity guarantee at the database level, which
    --   is stronger than just checking in JavaScript.
    --
    -- KEYWORD: UNIQUE
    --   No two rows in this table may have the same username value.
    --   If user "Alice" exists and you try to INSERT another "Alice",
    --   PostgreSQL throws a unique-violation error. Your application code
    --   catches that error and tells the user "username already taken."
    -- ─────────────────────────────────────────────────────────────────────────
    username      VARCHAR(50)   NOT NULL UNIQUE,

    -- ── EMAIL ──────────────────────────────────────────────────────────────────
    --
    -- VARCHAR(255): Standard maximum length for email addresses per the
    -- RFC 5321 specification. In practice, emails are usually far shorter,
    -- but 255 is the safe maximum.
    --
    -- NOT NULL UNIQUE: Same reasoning as username — every user must have
    -- an email (NOT NULL) and no two accounts can share one (UNIQUE).
    -- The UNIQUE constraint also creates an implicit B-tree index on this
    -- column, making lookups like "find user by email" very fast.
    -- ─────────────────────────────────────────────────────────────────────────
    email         VARCHAR(255)  NOT NULL UNIQUE,

    -- ── PASSWORD HASH ──────────────────────────────────────────────────────────
    --
    -- KEYWORD: TEXT
    --   An unlimited-length string. We use TEXT instead of VARCHAR here
    --   because a bcrypt hash always looks like this:
    --     $2b$12$SomeLongRandomStringOf60Characters
    --   It's always 60 characters, but TEXT is more explicit about the
    --   intent: "store whatever the hashing library gives us."
    --
    -- WHY "password_hash" AND NOT "password"?
    --   We NEVER store the actual password a user types.
    --   - Storing plaintext passwords is a catastrophic security failure.
    --   - Instead, we pass the password through a "one-way hashing function"
    --     (bcrypt) that scrambles it into an unreadable string.
    --   - When the user logs in, we hash what they typed and COMPARE it
    --     to the stored hash. If they match, the password is correct.
    --   - Even if someone steals your database, they cannot reverse a
    --     bcrypt hash back to the original password. This protects users.
    --
    -- NOT NULL: Every registered user must have a password.
    -- ─────────────────────────────────────────────────────────────────────────
    password_hash TEXT          NOT NULL,

    -- ── CREATED AT TIMESTAMP ───────────────────────────────────────────────────
    --
    -- KEYWORD: TIMESTAMPTZ
    --   "Timestamp with Time Zone." Stores a precise point in time:
    --   date + time + UTC offset. Example: 2026-07-24 16:52:00+05:30
    --
    --   WHY NOT just TIMESTAMP (without timezone)?
    --   If you ever have users in multiple time zones or move your server,
    --   a timestamp WITHOUT timezone becomes ambiguous — was that 3pm in
    --   New York or 3pm in London? TIMESTAMPTZ avoids this entirely.
    --
    -- KEYWORD: DEFAULT NOW()
    --   If you INSERT a row without providing created_at, PostgreSQL
    --   automatically fills it in with the current date and time.
    --   NOW() is a built-in PostgreSQL function that returns the current
    --   timestamp. This is far more reliable than setting the time in
    --   your JavaScript code, because the database clock is the single
    --   source of truth.
    -- ─────────────────────────────────────────────────────────────────────────
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- =============================================================
-- INDEXES
-- =============================================================
-- WHY DO WE CREATE INDEXES?
--   An index is like the index at the back of a textbook. Without it,
--   finding a row means reading every single row (a "full table scan").
--   With an index, PostgreSQL jumps directly to the matching rows.
--
--   The trade-off: indexes speed up reads but slightly slow down writes
--   (INSERT/UPDATE/DELETE must also update the index). For a users table
--   where reads vastly outnumber writes, this is always worth it.
--
-- KEYWORD: CREATE INDEX IF NOT EXISTS
--   Same safety pattern as CREATE TABLE IF NOT EXISTS — skip if already exists.
--
-- KEYWORD: ON users (email)
--   This tells PostgreSQL to build the index on the `email` column
--   of the `users` table.
--
-- NOTE: The UNIQUE constraints on `email` and `username` already create
-- implicit indexes. These explicit declarations below are redundant but
-- serve as documentation — they make the intent very clear to any
-- developer reading the migration later.
-- =============================================================

-- Fast lookup by email during login: "SELECT * FROM users WHERE email = $1"
CREATE INDEX IF NOT EXISTS idx_users_email    ON users (email);

-- Fast lookup by username (e.g., for public profile pages)
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
