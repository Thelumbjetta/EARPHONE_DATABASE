-- =============================================================
-- Migration 006: Create the `comments` table
-- =============================================================
-- WHAT THIS FILE DOES:
--   Creates the `comments` table, which links users to posts.
--   Each comment belongs to BOTH a post AND a user — it has
--   TWO foreign keys.
--
-- DEPENDENCY ORDER:
--   Must run AFTER:
--     004_create_users.sql  (we reference users.id)
--     005_create_posts.sql  (we reference posts.id)
--   Always run migrations in numeric order.
-- =============================================================


-- ── TWO FOREIGN KEYS (more advanced concept) ──────────────────────────────────
--
-- A table can have as many foreign keys as needed. The `comments` table
-- is a classic "junction" or "bridge" table because it connects two
-- other tables: posts and users.
--
-- The relationship reads like this in English:
--   "A comment is written by a [user] and belongs to a [post]."
--
-- In SQL, that becomes two REFERENCES constraints on the same table:
--   user_id INTEGER REFERENCES users(id)
--   post_id INTEGER REFERENCES posts(id)
--
-- Both use ON DELETE CASCADE, meaning:
--   - Delete the post  → all its comments are deleted.
--   - Delete the user  → all their comments are deleted.
--   This keeps the database clean in all deletion scenarios.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comments (

    -- ── PRIMARY KEY ────────────────────────────────────────────────────────────
    --
    -- Each comment gets its own unique id, just like users and posts.
    -- SERIAL handles the auto-increment automatically.
    -- ─────────────────────────────────────────────────────────────────────────
    id          SERIAL      PRIMARY KEY,

    -- ── FOREIGN KEY: post_id ───────────────────────────────────────────────────
    --
    -- INTEGER NOT NULL: Every comment must belong to a post.
    --   You cannot create a "floating" comment with no post.
    --
    -- REFERENCES posts(id): Links to the posts table.
    --   PostgreSQL ensures post_id actually exists in posts.id.
    --
    -- ON DELETE CASCADE: If a post is deleted, all its comments
    --   are automatically deleted too. This makes sense — if someone
    --   deletes their thread, the replies no longer make sense.
    -- ─────────────────────────────────────────────────────────────────────────
    post_id     INTEGER     NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

    -- ── FOREIGN KEY: user_id ───────────────────────────────────────────────────
    --
    -- Same pattern as post_id but referencing the users table.
    -- This tells us WHO wrote the comment.
    --
    -- ON DELETE CASCADE: If a user deletes their account, their
    --   comments are removed too — same as their posts.
    -- ─────────────────────────────────────────────────────────────────────────
    user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- ── COMMENT BODY ───────────────────────────────────────────────────────────
    --
    -- TEXT NOT NULL: Comments must have content.
    -- TEXT (no length limit) allows detailed multi-paragraph replies.
    -- ─────────────────────────────────────────────────────────────────────────
    content     TEXT        NOT NULL,

    -- ── CREATED AT TIMESTAMP ───────────────────────────────────────────────────
    --
    -- TIMESTAMPTZ NOT NULL DEFAULT NOW():
    --   Records exactly when the comment was submitted.
    --   Used for sorting comments chronologically within a thread
    --   (oldest comment first is traditional for forum replies).
    -- ─────────────────────────────────────────────────────────────────────────
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================
-- INDEXES FOR THE COMMENTS TABLE
-- =============================================================

-- ── Index on post_id ──────────────────────────────────────────────────────────
--
-- THE MOST IMPORTANT INDEX HERE.
--
-- The most common query against this table is:
--   "Fetch all comments for post #42."
--   SELECT * FROM comments WHERE post_id = 42 ORDER BY created_at ASC;
--
-- This query runs every time a user opens a forum thread.
-- Without an index, it scans every comment in the entire table.
-- With this index, PostgreSQL directly jumps to post 42's comments.
--
-- As your forum grows to 10,000 comments, this index is what
-- keeps thread loading instant rather than taking 3+ seconds.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_comments_post_id    ON comments (post_id);

-- ── Index on user_id ──────────────────────────────────────────────────────────
--
-- Useful for: "Show all comments made by user Alice."
-- This powers user profile pages that display activity history.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_comments_user_id    ON comments (user_id);

-- ── Index on created_at ───────────────────────────────────────────────────────
--
-- Useful for: sorting comments chronologically within a thread.
-- ASC (ascending) = oldest first, which is the standard forum
-- comment ordering. PostgreSQL can traverse this index in order
-- rather than sorting at query time.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments (created_at ASC);
