-- =============================================================
-- Migration 014: Add `media_urls` and `graph_url` columns
-- =============================================================
--
-- WHAT THIS FILE DOES:
--   Adds JSONB array column `media_urls` to `threads` and `comments`
--   to support multiple uploaded images/graphs per post/reply,
--   and adds `graph_url` to `audio_gear` for storing measurement graphs.
-- =============================================================

-- Add `media_urls` to `threads` (stores array of image URLs as JSONB)
ALTER TABLE threads
  ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb;

-- Add `media_urls` to `comments` (stores array of image URLs as JSONB)
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb;

-- Add `graph_url` to `audio_gear` (stores frequency response graph image URL)
ALTER TABLE audio_gear
  ADD COLUMN IF NOT EXISTS graph_url TEXT;
