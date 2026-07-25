-- =============================================================
-- Migration 002: Create the `earphones` table
-- =============================================================
-- The `earphones` table stores product identity information.
-- It has a Foreign Key (tier_id) that references the `tiers`
-- table, establishing the many-to-one relationship:
--   many earphones can belong to one tier.
--
-- IMPORTANT: This migration MUST be run AFTER 001_create_tiers.sql
-- because the foreign key constraint requires the `tiers` table
-- to already exist.
-- =============================================================

CREATE TABLE IF NOT EXISTS earphones (
    -- Auto-incrementing surrogate primary key.
    id               SERIAL        PRIMARY KEY,

    -- Foreign key linking this earphone to its tier.
    -- ON DELETE SET NULL: if a tier is deleted, earphones are
    -- orphaned (tier_id set to NULL) rather than cascade-deleted.
    -- This allows safe tier reorganisation without data loss.
    tier_id          INTEGER       REFERENCES tiers(id) ON DELETE SET NULL,

    -- Manufacturer brand name, e.g. 'Sony', 'Moondrop', 'DUNU'.
    brand            VARCHAR(100)  NOT NULL,

    -- Product model name, e.g. 'Variations', 'SA6 MK2'.
    model            VARCHAR(150)  NOT NULL,

    -- Retail price in USD cents (stored as integer to avoid
    -- floating-point rounding errors common with DECIMAL for currency).
    -- To display: divide by 100 → $12.99 stored as 1299.
    -- If prices are whole-dollar amounts in your data, store dollars directly.
    price            INTEGER       NOT NULL DEFAULT 0,

    -- Flag for collaboration products (e.g., brand x reviewer collab IEMs).
    -- TRUE = collaboration, FALSE = standard retail product.
    is_collaboration BOOLEAN       NOT NULL DEFAULT FALSE,

    -- Composite unique constraint: a brand+model combo must be unique.
    -- This enables ON CONFLICT DO NOTHING in the import script.
    CONSTRAINT uq_earphones_brand_model UNIQUE (brand, model)
);

-- Index on tier_id for efficient JOIN queries when fetching
-- "all earphones in a given tier".
CREATE INDEX IF NOT EXISTS idx_earphones_tier_id ON earphones (tier_id);
