-- =============================================================
-- Migration 015: Reddit Pivot & User Notification Engine
-- =============================================================
-- WHAT THIS FILE DOES:
-- 1. Creates `communities` (subreddits) table
-- 2. Creates `post_votes` and `comment_votes` tables
-- 3. Creates `notifications` table for user alert engine
-- 4. Adds `karma` column to `users` table
-- 5. Adds `community_id` and `score` columns to `threads` table
-- 6. Adds `score` column to `comments` table
-- 7. Seeds default audio communities (r/audiophile, r/iem, r/budgettier)
-- =============================================================

-- ── 1. Communities Table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communities (
    id                 SERIAL        PRIMARY KEY,
    name               VARCHAR(100)  NOT NULL UNIQUE,
    slug               VARCHAR(100)  NOT NULL UNIQUE,
    description        TEXT,
    created_by_user_id INTEGER       REFERENCES users(id) ON DELETE SET NULL,
    banner_url         TEXT,
    icon_url           TEXT,
    member_count       INTEGER       NOT NULL DEFAULT 1,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);

-- ── 2. Add community_id & score to threads ───────────────────────────────
ALTER TABLE threads
    ADD COLUMN IF NOT EXISTS community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_threads_community_id ON threads(community_id);
CREATE INDEX IF NOT EXISTS idx_threads_score ON threads(score DESC);

-- ── 3. Add score to comments ──────────────────────────────────────────────
ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;

-- ── 4. Add karma to users ─────────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS karma INTEGER NOT NULL DEFAULT 0;

-- ── 5. Post Votes & Comment Votes Tables ─────────────────────────────────
CREATE TABLE IF NOT EXISTS post_votes (
    id         SERIAL      PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thread_id  INTEGER     NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    vote_value INTEGER     NOT NULL CHECK (vote_value IN (-1, 0, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_thread_vote UNIQUE (user_id, thread_id)
);

CREATE TABLE IF NOT EXISTS comment_votes (
    id         SERIAL      PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id INTEGER     NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    vote_value INTEGER     NOT NULL CHECK (vote_value IN (-1, 0, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_comment_vote UNIQUE (user_id, comment_id)
);

-- ── 6. Notifications Table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL      PRIMARY KEY,
    user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL, -- 'reply', 'upvote', 'mention'
    source_url  TEXT        NOT NULL,
    content     TEXT        NOT NULL,
    is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
    dismissed   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
    ON notifications(user_id, is_read, dismissed, created_at DESC);

-- ── 7. Seed Default Communities ────────────────────────────────────────────
INSERT INTO communities (name, slug, description, icon_url, banner_url, member_count)
VALUES 
    (
        'r/audiophile', 
        'audiophile', 
        'High-end audio equipment, stereo setups, sound science, measurement charts, and acoustic impressions.',
        'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=150&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop&q=80',
        1420
    ),
    (
        'r/iem', 
        'iem', 
        'In-Ear Monitors (IEMs), custom molds, frequency response graphs, pinna compensation, and portable gear.',
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=150&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&auto=format&fit=crop&q=80',
        890
    ),
    (
        'r/budgettier', 
        'budgettier', 
        'Best bang-for-buck audio equipment under $100. Chi-fi gems, budget DACs, and giant-killers.',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=150&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
        560
    )
ON CONFLICT (slug) DO NOTHING;

-- Assign any orphaned threads without community_id to r/audiophile (id = 1)
UPDATE threads 
SET community_id = (SELECT id FROM communities WHERE slug = 'audiophile' LIMIT 1)
WHERE community_id IS NULL;
