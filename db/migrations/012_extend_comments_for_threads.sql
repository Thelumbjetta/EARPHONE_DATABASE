-- =============================================================
-- Migration 012: Extend `comments` for Threads
--               & Add `category` tag to `tier_lists`
-- =============================================================
--
-- WHAT THIS FILE DOES (three ALTER TABLE jobs):
--
--   JOB 1 — Add `thread_id` to the existing `comments` table.
--     Migration 006 created `comments` linked only to `posts`.
--     Now that we have the `threads` table (migration 011), a comment
--     can be a reply to EITHER a forum thread OR an old post.
--     We add `thread_id` as a nullable FK column. A comment will have:
--       - post_id set,   thread_id = NULL → reply to an old-style post
--       - thread_id set, post_id = NULL   → reply to a forum thread
--       - Both NULL                        → prevented in application logic
--     (Enforcing mutual exclusion at the DB level requires a CHECK constraint
--     or TRIGGER — we use application-level validation for simplicity.)
--
--   JOB 2 — Add `media_url` to the `comments` table.
--     Users should be able to attach an image or link in their forum replies.
--     A nullable TEXT column is all this requires.
--
--   JOB 3 — Add `category` to the `tier_lists` table.
--     Community tier lists should be taggable so users can browse
--     "all IEM tier lists" or "all planar headphone tier lists."
--     A simple VARCHAR column achieves this without a new FK table.
--
-- WHY ALTER TABLE INSTEAD OF NEW TABLES?
--   These are additive column additions to EXISTING tables. The safest
--   and most correct approach is ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
--   It modifies the table in-place without touching existing rows —
--   new rows get the default value, existing rows get NULL (for nullable
--   columns) or the DEFAULT value.
--
-- DEPENDENCY ORDER:
--   Must run AFTER:
--     006_create_comments.sql  (we ALTER TABLE comments)
--     007_create_tier_lists.sql (we ALTER TABLE tier_lists)
--     011_create_forum_schema.sql (thread_id references threads.id)
-- =============================================================


-- =============================================================
-- JOB 1: Add `thread_id` to the `comments` table
-- =============================================================
--
-- WHAT IS `thread_id`?
--   The foreign key that connects a comment (reply) to a forum thread.
--   When a user replies to a thread created in migration 011's `threads`
--   table, the new comment row gets:
--     - thread_id = the thread's id
--     - post_id = NULL (this reply is not for an old-style post)
--
-- NULLABLE (no NOT NULL):
--   The existing `post_id` column is already NOT NULL for existing comments.
--   We cannot change that without breaking data integrity. Instead:
--   - For EXISTING comments:  thread_id = NULL (they predate threads)
--   - For NEW thread replies: thread_id = the thread's id, post_id = NULL
--   The application layer enforces "at least one of post_id or thread_id
--   must be set" — the DB stores either scenario gracefully.
--
-- REFERENCES threads(id):
--   Links to the `threads` table created in migration 011.
--   PostgreSQL verifies the thread actually exists before allowing INSERT.
--
-- ON DELETE CASCADE:
--   If a thread is deleted, all its comments are automatically deleted too.
--   This keeps the database clean — no "orphan" replies left behind
--   when a thread is removed.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS thread_id INTEGER
  REFERENCES threads(id) ON DELETE CASCADE;

-- Index: "Fetch all comments for thread #42, ordered chronologically."
-- SELECT * FROM comments WHERE thread_id = 42 ORDER BY created_at ASC;
-- This is the critical read path for thread view pages.
CREATE INDEX IF NOT EXISTS idx_comments_thread_id
  ON comments (thread_id);

-- Composite index: fast chronological reply loading per thread.
-- Covers: WHERE thread_id = $1 ORDER BY created_at ASC
-- with pagination (LIMIT/OFFSET).
CREATE INDEX IF NOT EXISTS idx_comments_thread_id_created_at
  ON comments (thread_id, created_at ASC);


-- =============================================================
-- JOB 2: Add `media_url` to the `comments` table
-- =============================================================
--
-- WHAT IS `media_url` ON A COMMENT?
--   Allows users to embed an image, screenshot, or link in their reply.
--   Examples:
--     'https://i.imgur.com/frequency-response-overlay.png'
--     'https://squig.link/?...'  (a frequency response graph link)
--
-- TEXT (nullable):
--   No URL = NULL. The frontend checks:
--     if (comment.media_url) { render <img src={comment.media_url} /> }
--
-- IMPORTANT — SECURITY NOTE (for beginners):
--   Never render media_url as raw HTML (e.g., using dangerouslySetInnerHTML).
--   Always use it as an `src` attribute value. Rendering unvalidated HTML
--   opens the app to Cross-Site Scripting (XSS) attacks.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS media_url TEXT;


-- =============================================================
-- JOB 3: Add `category` tag to the `tier_lists` table
-- =============================================================
--
-- WHAT IS `category` ON A TIER LIST?
--   A user-defined label that categorizes their tier list, making it
--   discoverable in the community feed.
--
--   Examples:
--     'IEM'               — "My IEM Rankings 2026"
--     'Over-Ear'          — "Planar Headphone Shootout"
--     'DAC/Amp'           — "Budget Desktop Stack Rankings"
--     'Budget'            — "Sub-$50 Gems"
--     'Endgame'           — "Cost-No-Object Rankings"
--
-- VARCHAR(100) (nullable):
--   Simple string tag — no FK to a categories table. This is intentionally
--   loose to give users flexibility in how they tag their lists.
--   NULL = uncategorized (the list will still be visible but won't appear
--   in category-filtered views).
--
-- WHY NOT A FOREIGN KEY TO `forum_categories`?
--   Tier list categories and forum board categories may diverge over time.
--   A tier list about "Budget IEMs" doesn't map cleanly to the "Head Gear"
--   board section. Keeping this as a free-text field gives more flexibility
--   and avoids complex JOIN queries for what is essentially a tag/label.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE tier_lists
  ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Index: filter community tier lists by category.
-- "Show me all public IEM tier lists."
-- SELECT * FROM tier_lists WHERE is_public = TRUE AND category = 'IEM'
-- ORDER BY created_at DESC LIMIT 20;
CREATE INDEX IF NOT EXISTS idx_tier_lists_category
  ON tier_lists (category);
