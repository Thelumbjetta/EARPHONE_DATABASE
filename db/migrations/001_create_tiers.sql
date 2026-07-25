-- =============================================================
-- Migration 001: Create the `tiers` table
-- =============================================================
-- The `tiers` table is the root of the relational hierarchy.
-- Every earphone belongs to exactly one tier (e.g., S, A, B, C).
-- The color_code column stores the hex colour used to render
-- the tier label in the frontend (e.g., '#FFD700' for gold S-tier).
-- =============================================================

CREATE TABLE IF NOT EXISTS tiers (
    -- Auto-incrementing surrogate primary key.
    -- SERIAL is an alias for INTEGER with a sequence attached.
    id         SERIAL       PRIMARY KEY,

    -- Human-readable tier name. 50 chars is generous for names like 'S', 'A+', 'Budget King'.
    -- NOT NULL enforces that every tier must have a label.
    name       VARCHAR(50)  NOT NULL UNIQUE,

    -- Hex colour code string, e.g. '#E74C3C'.
    -- VARCHAR(10) covers '#RRGGBB' (7 chars) and '#RRGGBBAA' (9 chars) with room to spare.
    color_code VARCHAR(10)  NOT NULL
);

-- Index on `name` for fast lookups during CSV import (upsert by name).
CREATE INDEX IF NOT EXISTS idx_tiers_name ON tiers (name);
