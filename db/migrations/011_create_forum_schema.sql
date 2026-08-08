-- =============================================================
-- Migration 011: Create the Forum Schema
--               `forum_categories` + `threads`
-- =============================================================
--
-- WHAT THIS FILE DOES:
--   Builds the two core tables that power the forum's organization system.
--
--   ANALOGY: Think of a traditional internet forum (like reddit, Head-Fi,
--   or phpBB). It has:
--     - BOARDS (sections): "Head Gear", "Sound Science", "Marketplace" — these are CATEGORIES.
--     - THREADS (topics):  Individual discussions that live inside a board — these are THREADS.
--     - REPLIES (posts):   Responses to a thread — these are COMMENTS (see migration 012).
--
--   TABLE 1: forum_categories
--     The named sections that organize the forum. A site admin creates these.
--     Users cannot create categories — they can only create threads WITHIN them.
--
--   TABLE 2: threads
--     User-created discussion topics. Each thread belongs to one category.
--     A thread has: a title, an opening post (body), a view counter, and a pinned flag.
--
-- WHY IS THIS SEPARATE FROM MIGRATION 005's `posts` TABLE?
--   Migration 005's `posts` table is a generic content table with no
--   `category_id`. Rather than alter it (which could break existing data
--   and foreign keys), we create a PURPOSE-BUILT `threads` table here.
--   `threads` is category-aware from the ground up.
--
-- DEPENDENCY ORDER:
--   Must run AFTER:
--     004_create_users.sql  (threads.user_id → users.id)
--   forum_categories has NO foreign key dependencies — it can run anytime.
-- =============================================================


-- =============================================================
-- TABLE 1: forum_categories
-- =============================================================
--
-- REAL-WORLD EXAMPLES of categories on an audiophile forum:
--   "Head Gear"      — Reviews, rankings, comparisons of IEMs and headphones
--   "Sound Science"  — Measurements, EQ, DSP, technical deep-dives
--   "Marketplace"    — Buy/Sell/Trade listings
--   "General Chat"   — Off-topic discussion
--   "Introductions"  — New member intro threads
--
-- This table stores exactly those sections. Each row = one board section.
-- =============================================================

CREATE TABLE IF NOT EXISTS forum_categories (

    -- ── PRIMARY KEY ────────────────────────────────────────────────────────────
    -- SERIAL PRIMARY KEY: auto-incrementing integer, unique per category.
    -- ─────────────────────────────────────────────────────────────────────────
    id            SERIAL        PRIMARY KEY,


    -- ── CATEGORY NAME ─────────────────────────────────────────────────────────
    --
    -- VARCHAR(100) NOT NULL UNIQUE:
    --   The display name shown in the forum navigation.
    --   UNIQUE: You can't have two categories both named "Head Gear."
    --   NOT NULL: A category must have a name.
    -- ─────────────────────────────────────────────────────────────────────────
    name          VARCHAR(100)  NOT NULL UNIQUE,


    -- ── DESCRIPTION ───────────────────────────────────────────────────────────
    --
    -- TEXT (nullable):
    --   A short paragraph explaining what belongs in this category.
    --   Shown below the category name on the board index.
    --   Example: "Post gear reviews, comparisons, and impressions here."
    --   Nullable: a category can exist without a description if the name
    --   is self-explanatory.
    -- ─────────────────────────────────────────────────────────────────────────
    description   TEXT,


    -- ── SLUG ──────────────────────────────────────────────────────────────────
    --
    -- WHAT IS A SLUG?
    --   A "slug" is a URL-safe version of a name. It contains only lowercase
    --   letters, numbers, and hyphens — no spaces or special characters.
    --
    --   Name    → Slug
    --   "Head Gear"      → "head-gear"
    --   "Sound Science"  → "sound-science"
    --   "Marketplace"    → "marketplace"
    --
    -- WHY SLUGS?
    --   They create readable, SEO-friendly URLs:
    --     /forum/head-gear           ← readable, memorable
    --     /forum/1                   ← opaque, not SEO-friendly
    --   Search engines rank pages with descriptive URLs higher.
    --
    -- VARCHAR(100) NOT NULL UNIQUE:
    --   Same uniqueness guarantee as `name` — each category gets a distinct slug.
    --   The UNIQUE constraint also creates an implicit index, making
    --   "SELECT * FROM forum_categories WHERE slug = 'head-gear'" very fast.
    -- ─────────────────────────────────────────────────────────────────────────
    slug          VARCHAR(100)  NOT NULL UNIQUE,


    -- ── DISPLAY ORDER ─────────────────────────────────────────────────────────
    --
    -- INTEGER NOT NULL DEFAULT 0:
    --   Controls the order categories appear on the board index page.
    --   Lower number = displayed first (top of page).
    --
    --   Example ordering:
    --     display_order=1 → "Head Gear"     (shown first)
    --     display_order=2 → "Sound Science"
    --     display_order=3 → "Marketplace"
    --     display_order=4 → "General Chat"
    --     display_order=5 → "Introductions" (shown last)
    --
    --   DEFAULT 0: New categories added without specifying an order
    --   will cluster at the top (order=0) until manually reordered.
    -- ─────────────────────────────────────────────────────────────────────────
    display_order INTEGER       NOT NULL DEFAULT 0,


    -- ── CREATION TIMESTAMP ────────────────────────────────────────────────────
    -- TIMESTAMPTZ NOT NULL DEFAULT NOW():
    --   When this category was added by the admin. Auto-filled by the DB.
    -- ─────────────────────────────────────────────────────────────────────────
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ── Index: fast ordering on board index ───────────────────────────────────────
--
-- The board index query always ORDER BY display_order ASC.
-- This index makes that sort instant even with many categories.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_forum_categories_display_order
    ON forum_categories (display_order ASC);


-- =============================================================
-- TABLE 2: threads
-- =============================================================
--
-- WHAT IS A THREAD?
--   A "thread" is a user-created discussion topic. It has:
--     - A title (the topic, shown in thread listings)
--     - A body  (the opening post, shown when you enter the thread)
--     - A category (which board section it lives in)
--     - A view_count (how many times it's been opened)
--     - is_pinned (admins can pin important threads to the top)
--     - is_locked (prevents new replies — used for archived/resolved threads)
--
-- RELATIONSHIP TO COMMENTS:
--   Replies to a thread are stored in the `comments` table (migration 006),
--   which will be extended in migration 012 to add a `thread_id` column.
--   So the data model is:
--     forum_categories (1) → (many) threads (1) → (many) comments
-- =============================================================

CREATE TABLE IF NOT EXISTS threads (

    -- ── PRIMARY KEY ────────────────────────────────────────────────────────────
    -- SERIAL PRIMARY KEY: each thread gets a unique auto-incrementing id.
    -- ─────────────────────────────────────────────────────────────────────────
    id            SERIAL        PRIMARY KEY,


    -- ── FOREIGN KEY: category_id ──────────────────────────────────────────────
    --
    -- INTEGER NOT NULL: A thread must belong to a category — no uncategorized threads.
    --
    -- REFERENCES forum_categories(id): Links to the category this thread lives in.
    --   PostgreSQL enforces: the category_id must exist in forum_categories.id.
    --
    -- ON DELETE RESTRICT:
    --   What happens if someone tries to delete a forum category?
    --   - CASCADE: delete the category AND all its threads (too destructive).
    --   - SET NULL: set category_id to NULL (but we have NOT NULL!).
    --   - RESTRICT: BLOCK the deletion of the category if any threads exist in it.
    --
    --   RESTRICT is the right choice here. Before you can delete "Head Gear",
    --   you must first move or delete all its threads. This prevents accidental
    --   mass-deletion of community content. It forces intentional cleanup.
    -- ─────────────────────────────────────────────────────────────────────────
    category_id   INTEGER       NOT NULL
                  REFERENCES forum_categories(id) ON DELETE RESTRICT,


    -- ── FOREIGN KEY: user_id ──────────────────────────────────────────────────
    --
    -- INTEGER NOT NULL: A thread must have an author.
    --
    -- REFERENCES users(id): Links to the user who created this thread.
    --
    -- ON DELETE CASCADE:
    --   If a user deletes their account, all their threads are deleted too.
    --   This is a deliberate product decision. The alternative (SET NULL for
    --   "anonymous" posts) would require user_id to be nullable. CASCADE keeps
    --   the schema simpler at the cost of losing content on account deletion.
    --   (A real production system might use SET NULL + show "[deleted]" — 
    --    that pattern is an application-level concern, not a schema one.)
    -- ─────────────────────────────────────────────────────────────────────────
    user_id       INTEGER       NOT NULL
                  REFERENCES users(id) ON DELETE CASCADE,


    -- ── THREAD TITLE ──────────────────────────────────────────────────────────
    --
    -- VARCHAR(300) NOT NULL:
    --   The topic title shown in thread listings and at the top of the thread.
    --   300 characters allows for detailed, descriptive titles like:
    --   "Review: Moondrop Aria 2 — is the SE upgrade actually worth $50 more?"
    --   NOT NULL: A thread without a title is un-renderable in any thread list.
    -- ─────────────────────────────────────────────────────────────────────────
    title         VARCHAR(300)  NOT NULL,


    -- ── OPENING POST BODY ─────────────────────────────────────────────────────
    --
    -- TEXT NOT NULL:
    --   The content of the first post — the "OP" (original post) body.
    --   Stored here rather than as the first row in the comments table
    --   because it's always needed when rendering a thread and logically
    --   belongs to the thread itself.
    --
    --   Supports rich text: the application layer decides the format.
    --   Common choices:
    --     - Plain text (simplest)
    --     - Markdown (store raw markdown, render in the browser)
    --     - Sanitized HTML (more powerful, requires server-side sanitization
    --       to prevent XSS attacks — use a library like DOMPurify)
    -- ─────────────────────────────────────────────────────────────────────────
    body          TEXT          NOT NULL,


    -- ── VIEW COUNT ────────────────────────────────────────────────────────────
    --
    -- INTEGER NOT NULL DEFAULT 0:
    --   Tracks how many times this thread has been opened (viewed).
    --
    --   HOW IT'S INCREMENTED:
    --   The GET /api/forum/threads/[id] route increments this by 1
    --   on every request using:
    --     UPDATE threads SET view_count = view_count + 1 WHERE id = $1
    --
    --   WHY NOT COUNT EVENTS IN A SEPARATE TABLE?
    --   For a simple forum, a counter column is sufficient and orders of
    --   magnitude cheaper than inserting a new row per view into a
    --   separate "page_views" table.
    --
    --   LIMITATION: This counts server-side fetches, not unique visitors.
    --   A more sophisticated system would use the client's IP or session to
    --   deduplicate — but that's a product feature, not a schema concern.
    -- ─────────────────────────────────────────────────────────────────────────
    view_count    INTEGER       NOT NULL DEFAULT 0,


    -- ── IS PINNED ─────────────────────────────────────────────────────────────
    --
    -- BOOLEAN NOT NULL DEFAULT FALSE:
    --   When TRUE, this thread is pinned to the top of its category's thread list,
    --   above all un-pinned threads regardless of date.
    --
    --   Used for:
    --   - Site announcements ("READ BEFORE POSTING")
    --   - Stickied FAQ threads
    --   - Community rules threads
    --
    --   DEFAULT FALSE: Regular user threads start un-pinned.
    --   Admins set is_pinned = TRUE manually via a moderation tool.
    -- ─────────────────────────────────────────────────────────────────────────
    is_pinned     BOOLEAN       NOT NULL DEFAULT FALSE,


    -- ── IS LOCKED ─────────────────────────────────────────────────────────────
    --
    -- BOOLEAN NOT NULL DEFAULT FALSE:
    --   When TRUE, no new comments can be added to this thread.
    --
    --   Used for:
    --   - Resolved marketplace transactions ("SOLD — closing thread")
    --   - Old threads being archived
    --   - Rule-violating threads preserved for reference but not discussion
    --
    --   DEFAULT FALSE: Threads start open for replies.
    --   The API route for posting comments checks is_locked = TRUE and
    --   returns HTTP 403 Forbidden if the thread is locked.
    -- ─────────────────────────────────────────────────────────────────────────
    is_locked     BOOLEAN       NOT NULL DEFAULT FALSE,


    -- ── OPTIONAL MEDIA URL ────────────────────────────────────────────────────
    --
    -- TEXT (nullable):
    --   An optional link to an image, video, or attachment for the opening post.
    --   Examples:
    --     'https://i.imgur.com/my-iem-unboxing.jpg'
    --     'https://youtube.com/watch?v=frequency-response-comparison'
    --
    --   NULL = this thread has no media attachment.
    --   The frontend conditionally renders media only when this is not NULL.
    -- ─────────────────────────────────────────────────────────────────────────
    media_url     TEXT,


    -- ── CREATION TIMESTAMP ────────────────────────────────────────────────────
    --
    -- TIMESTAMPTZ NOT NULL DEFAULT NOW():
    --   When the thread was created. Auto-filled by the DB at INSERT time.
    --   Used for "posted X hours ago" labels and for sorting threads
    --   newest-first in the thread listing.
    -- ─────────────────────────────────────────────────────────────────────────
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),


    -- ── LAST UPDATED TIMESTAMP ────────────────────────────────────────────────
    --
    -- TIMESTAMPTZ NOT NULL DEFAULT NOW():
    --   Updated whenever:
    --   - A new comment is posted in this thread (bump the thread)
    --   - The OP edits their original post
    --
    --   WHY IS THIS USEFUL?
    --   Forum thread lists traditionally sort by "last activity" — which thread
    --   had the most recent post. Using `updated_at` (instead of `created_at`)
    --   for this sort means active threads float to the top even if they were
    --   created months ago. This is called "bumping" a thread.
    --
    --   HOW TO UPDATE IT:
    --   In the API comment handler, after INSERTing a new comment:
    --     UPDATE threads SET updated_at = NOW() WHERE id = $threadId
    -- ─────────────────────────────────────────────────────────────────────────
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- =============================================================
-- INDEXES for `threads`
-- =============================================================

-- ── Index: fetch all threads in a category (the thread listing page) ──────────
--
-- QUERY THIS OPTIMIZES:
--   "Show all threads in the 'Head Gear' category."
--   SELECT * FROM threads WHERE category_id = 1 ORDER BY is_pinned DESC, updated_at DESC;
--
-- This is THE most critical query for the forum — it runs on every
-- category page load. Without an index on category_id, this scans
-- the entire threads table on every request.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_threads_category_id
    ON threads (category_id);

-- ── Composite index: pinned threads first, then newest-last-activity ──────────
--
-- QUERY THIS OPTIMIZES (the full thread listing query):
--   SELECT * FROM threads
--   WHERE category_id = $1
--   ORDER BY is_pinned DESC, updated_at DESC
--   LIMIT 20 OFFSET $2;
--
-- A composite index on (category_id, is_pinned DESC, updated_at DESC) lets
-- PostgreSQL satisfy the WHERE, ORDER BY, and LIMIT all from the index
-- without a separate sort step — maximum efficiency.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_threads_category_listing
    ON threads (category_id, is_pinned DESC, updated_at DESC);

-- ── Index: user's own threads (profile page) ──────────────────────────────────
--
-- QUERY THIS OPTIMIZES:
--   "Show all threads created by user Alice."
--   SELECT * FROM threads WHERE user_id = 1 ORDER BY created_at DESC;
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_threads_user_id
    ON threads (user_id);

-- ── Index: global newest threads (site-wide "recent activity" feed) ───────────
--
-- QUERY THIS OPTIMIZES:
--   "Show the 10 most recently active threads across all categories."
--   SELECT * FROM threads ORDER BY updated_at DESC LIMIT 10;
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_threads_updated_at
    ON threads (updated_at DESC);
