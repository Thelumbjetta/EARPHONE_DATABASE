-- ============================================================
-- Migration 015: Auth.js Database Tables
-- ============================================================
-- Required by @auth/pg-adapter when using Email provider
-- with database session strategy.
--
-- Tables:
--   accounts          → OAuth provider account links (even for email-only,
--                       the adapter expects this table to exist)
--   sessions          → Active user sessions (replaces JWT cookies)
--   verification_tokens → Magic-link / OTP tokens sent via email
-- ============================================================

-- accounts: links users to OAuth/email providers
CREATE TABLE IF NOT EXISTS accounts (
  id                   SERIAL PRIMARY KEY,
  "userId"             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                 TEXT NOT NULL,
  provider             TEXT NOT NULL,
  "providerAccountId"  TEXT NOT NULL,
  refresh_token        TEXT,
  access_token         TEXT,
  expires_at           INTEGER,
  token_type           TEXT,
  scope                TEXT,
  id_token             TEXT,
  session_state        TEXT,
  UNIQUE (provider, "providerAccountId")
);

-- sessions: active database sessions (replaces JWT cookies)
CREATE TABLE IF NOT EXISTS sessions (
  id             SERIAL PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId"       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires        TIMESTAMPTZ NOT NULL
);

-- verification_tokens: magic-link tokens emailed to users
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token      TEXT NOT NULL UNIQUE,
  expires    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);
