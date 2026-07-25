-- =============================================================
-- Migration 005: Create the `posts` table
-- =============================================================
-- WHAT THIS FILE DOES:
--   Creates the `posts` table, which stores forum threads/posts.
--   Each post was written by a user (linked via `user_id`) and
--   can optionally include a media attachment (image/video URL).
--
-- DEPENDENCY:
--   This migration MUST run AFTER 004_create_users.sql because
--   the `user_id` foreign key references the `users` table.
--   If `users` doesn't exist yet, this CREATE TABLE will fail.
-- =============================================================


-- ── WHAT IS A FOREIGN KEY? (key concept for beginners) ────────────────────────
--
-- Imagine you have two tables:
--   - users:  id=1 (Alice), id=2 (Bob)
--   - posts:  id=10 (post by user_id=1), id=11 (post by user_id=2)
--
-- The `user_id` in `posts` is a "foreign key" — a column in one table
-- that refers to the PRIMARY KEY of another table.
--
-- WHY IS THIS USEFUL?
--   It creates a link between the tables. When you query posts, you can
--   JOIN the users table to get the author's username in a single query
--   rather than making two separate database calls.
--
-- DATABASE ENFORCEMENT:
--   PostgreSQL enforces that the value you put in `user_id` MUST exist
--   in `users.id`. If you try to INSERT a post with user_id=999 and
--   user 999 doesn't exist, PostgreSQL rejects it. This prevents
--   "orphaned" posts that point to non-existent users.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS posts (

    -- ── PRIMARY KEY ────────────────────────────────────────────────────────────
    --
    -- SERIAL PRIMARY KEY: Same as in the users table — auto-incrementing
    -- integer that uniquely identifies each post. The first post will be
    -- id=1, the second id=2, etc.
    -- ─────────────────────────────────────────────────────────────────────────
    id          SERIAL        PRIMARY KEY,

    -- ── FOREIGN KEY: user_id ───────────────────────────────────────────────────
    --
    -- KEYWORD: INTEGER
    --   A whole number (no decimals). Foreign keys must match the data type
    --   of the column they reference. Since users.id is SERIAL (which is
    --   INTEGER under the hood), user_id here must also be INTEGER.
    --
    -- KEYWORD: NOT NULL
    --   A post cannot exist without an author. This prevents anonymous
    --   posts at the database level.
    --
    -- KEYWORD: REFERENCES users(id)
    --   This is what makes it a foreign key. Syntax:
    --     REFERENCES <other_table>(<column_in_that_table>)
    --   PostgreSQL will:
    --     1. Verify the value exists in users.id before allowing INSERT.
    --     2. Block deletion of a user if they have posts (unless you add
    --        ON DELETE CASCADE, which we do below).
    --
    -- KEYWORD: ON DELETE CASCADE
    --   What happens when a user is deleted?
    --   - WITHOUT cascade: PostgreSQL refuses to delete the user because
    --     posts still reference them. You'd have to manually delete posts first.
    --   - WITH CASCADE: Deleting a user automatically deletes all their
    --     posts. This keeps the database clean with no orphaned data.
    --   For a forum, this is the right choice — if an account is removed,
    --   all content from that account goes with it.
    -- ─────────────────────────────────────────────────────────────────────────
    user_id     INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- ── POST TITLE ─────────────────────────────────────────────────────────────
    --
    -- VARCHAR(300): Post titles can be a bit longer than usernames.
    -- 300 characters is generous for a title while still preventing
    -- abuse (people dumping whole paragraphs into the title field).
    --
    -- NOT NULL: Every post must have a title. Content can be optional
    -- (some posts may just be a media link with a title), but the title
    -- is the minimum required.
    -- ─────────────────────────────────────────────────────────────────────────
    title       VARCHAR(300)  NOT NULL,

    -- ── POST BODY ──────────────────────────────────────────────────────────────
    --
    -- KEYWORD: TEXT
    --   Unlimited-length string. Forum post bodies can be very long —
    --   think multi-paragraph reviews or detailed discussions. TEXT has
    --   no length limit, unlike VARCHAR which caps at a number.
    --
    -- NOT NULL: A post must have body content. If you want "image-only"
    -- posts, you could set this to NULL and require at least media_url
    -- instead — but that requires application-level validation.
    -- ─────────────────────────────────────────────────────────────────────────
    content     TEXT          NOT NULL,

    -- ── OPTIONAL MEDIA URL ─────────────────────────────────────────────────────
    --
    -- TEXT: Stores a URL string like "https://i.imgur.com/example.jpg"
    -- This can link to an image, video, or any embedded media.
    --
    -- NOTICE: No "NOT NULL" constraint here. That means this column is
    -- NULLABLE — it can hold either a URL string or the special SQL
    -- value NULL (meaning "no value / not applicable").
    --
    -- WHEN IS NULL CORRECT?
    --   Most posts won't have media. Rather than storing an empty string
    --   "" (which is ambiguous), NULL explicitly means "this post has
    --   no media attachment." Your JavaScript code checks:
    --     if (post.media_url !== null) { /* show media */ }
    -- ─────────────────────────────────────────────────────────────────────────
    media_url   TEXT,

    -- ── CREATED AT TIMESTAMP ───────────────────────────────────────────────────
    --
    -- TIMESTAMPTZ NOT NULL DEFAULT NOW():
    --   Identical to the same column in the users table.
    --   Records exactly when this post was published.
    --   Used to display "posted 2 hours ago" labels in the UI and
    --   to sort the forum feed newest-first.
    -- ─────────────────────────────────────────────────────────────────────────
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- =============================================================
-- INDEXES FOR THE POSTS TABLE
-- =============================================================

-- ── Index on user_id ──────────────────────────────────────────────────────────
--
-- COMMON QUERY: "Show me all posts by user Alice."
--   SELECT * FROM posts WHERE user_id = 1;
--
-- Without an index, this reads every row in the posts table.
-- With this index, PostgreSQL jumps directly to Alice's posts.
-- As the forum grows to thousands of posts, this difference is
-- the difference between 5ms and 2000ms response times.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_user_id    ON posts (user_id);

-- ── Index on created_at (descending) ──────────────────────────────────────────
--
-- COMMON QUERY: "Show me the newest 20 posts."
--   SELECT * FROM posts ORDER BY created_at DESC LIMIT 20;
--
-- The DESC keyword in the index definition tells PostgreSQL to build
-- the index pre-sorted from newest to oldest. This makes
-- "ORDER BY created_at DESC" queries extremely fast because
-- PostgreSQL can read the index in order rather than sorting the data.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
