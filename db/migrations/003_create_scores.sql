-- =============================================================
-- Migration 003: Create the `scores` table
-- =============================================================
-- The `scores` table stores the subjective audio ratings for
-- each earphone. It has a one-to-one relationship with `earphones`
-- (each earphone has exactly one score record).
--
-- NUMERIC(4,2) means: up to 4 total digits, 2 after the decimal.
--   Valid range: -99.99 to 99.99. For scores 0–10 this is perfect.
-- NUMERIC(5,2) for total_score allows values up to 999.99,
--   giving room if total is a weighted aggregate above 10.
--
-- IMPORTANT: This migration MUST be run AFTER 002_create_earphones.sql.
-- =============================================================

CREATE TABLE IF NOT EXISTS scores (
    -- Auto-incrementing surrogate primary key.
    id           SERIAL       PRIMARY KEY,

    -- Foreign key linking this score record to its earphone.
    -- ON DELETE CASCADE: if an earphone is deleted, its score
    -- record is automatically removed — no orphaned score rows.
    earphone_id  INTEGER      NOT NULL UNIQUE REFERENCES earphones(id) ON DELETE CASCADE,

    -- Sub-scores — each rated on a 0–10 scale (2 decimal places).
    bass         NUMERIC(4,2) NOT NULL DEFAULT 0,
    mids         NUMERIC(4,2) NOT NULL DEFAULT 0,
    treble       NUMERIC(4,2) NOT NULL DEFAULT 0,
    tonality     NUMERIC(4,2) NOT NULL DEFAULT 0,
    technicality NUMERIC(4,2) NOT NULL DEFAULT 0,

    -- Aggregate score. Can be manually set (from CSV) or
    -- auto-calculated as the average of the five sub-scores.
    -- Stored explicitly so it can be queried/sorted efficiently
    -- without recomputing on every read.
    total_score  NUMERIC(5,2) NOT NULL DEFAULT 0
);

-- Index on earphone_id (also covered by UNIQUE, but explicit for clarity).
CREATE INDEX IF NOT EXISTS idx_scores_earphone_id ON scores (earphone_id);

-- Index on total_score for fast ORDER BY total_score DESC queries
-- used in leaderboard / ranking features.
CREATE INDEX IF NOT EXISTS idx_scores_total_score ON scores (total_score DESC);
