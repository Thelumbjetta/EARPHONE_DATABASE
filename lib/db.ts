/**
 * lib/db.ts
 * =============================================================
 * PostgreSQL Connection Pool — Singleton
 * =============================================================
 * Exports a single shared `pg.Pool` instance for use across all
 * Next.js API route handlers.
 *
 * WHY A SINGLETON POOL?
 *   Next.js runs in a Node.js server. If each API route created its
 *   own pool, every request would open a new set of TCP connections
 *   to PostgreSQL and never clean them up — exhausting the database's
 *   connection limit very quickly.
 *
 *   By exporting a single pool object at module scope, Node.js's
 *   module caching ensures it is created exactly once per server
 *   process and reused by every subsequent import.
 *
 * HOW TO USE IN AN API ROUTE:
 *   import pool from '@/lib/db';
 *   const result = await pool.query('SELECT * FROM tiers');
 * =============================================================
 */

import { Pool } from 'pg';

// Declare the pool variable outside the instantiation block.
// In development, Next.js uses hot module replacement (HMR) which
// re-evaluates modules on each file save. Without the global cache
// trick below, this would create a new Pool on every HMR cycle —
// rapidly leaking connections during development.
declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

// ── Pool Configuration ─────────────────────────────────────────────────────────
//
// NEON SERVERLESS POSTGRESQL — IMPORTANT NOTES:
//
//   Neon uses a connection POOLER endpoint (the URL in DATABASE_URL).
//   The pooler manages connections on Neon's side. On the client side,
//   we keep a small pool (max: 3) that maps to a few persistent slots
//   through the pooler. Neon's free tier allows ~100 concurrent connections
//   through the pooler, but pg.Pool should be kept small to avoid
//   overwhelming it during cold starts.
//
//   DUAL-CONFIG CONFLICT (the bug we're fixing):
//   When both `connectionString` AND individual fields (host, port, user,
//   password, database) are provided to pg.Pool, pg merges them —
//   sometimes in unexpected ways. Specifically, the individual `host`
//   field can OVERRIDE the host parsed from connectionString, and the
//   SSL settings from the connection string params (sslmode=require)
//   can conflict with the absence of an explicit `ssl` object.
//   The fix: use ONLY connectionString. Set ssl explicitly here.
//
//   WHY ssl: { rejectUnauthorized: false }?
//   Neon uses a TLS certificate from a cloud CA. The `node-postgres` (pg)
//   library's default SSL verification sometimes fails to find the CA cert
//   in the local system store. `rejectUnauthorized: false` disables strict
//   certificate chain verification while still encrypting the connection.
//   This is the Neon-recommended approach for pg (as opposed to their
//   @neondatabase/serverless HTTP driver, which handles SSL automatically).
//
//   CHANNEL BINDING:
//   The URL contains `channel_binding=require`. node-postgres does NOT
//   support channel binding — the `pg` library ignores this parameter
//   silently in most versions, but some versions fail. We strip it by
//   providing a clean URL without it via the `connectionString` below.
//
//   idleTimeoutMillis: 10_000 (10 seconds, not 30):
//   Neon terminates idle connections after ~5 minutes of database inactivity
//   (the compute enters "sleep" mode). Setting idle timeout to 10s ensures
//   our pool releases connections before Neon forcefully closes them,
//   preventing the "Connection terminated unexpectedly" error.

// Strip `channel_binding=require` from the URL since node-postgres
// does not implement channel binding and it can cause parameter errors.
// String manipulation: split at '&channel_binding=require', take first part.
const rawDatabaseUrl = process.env.DATABASE_URL || '';
const cleanDatabaseUrl = rawDatabaseUrl
  .replace('&channel_binding=require', '')
  .replace('?channel_binding=require&', '?')
  .replace('?channel_binding=require', '');

const poolConfig = {
  // Use ONLY the cleaned connection string — no individual host/user/password fields.
  // Providing both causes pg to merge them in ways that break SSL negotiation.
  connectionString: cleanDatabaseUrl,

  // Explicit SSL config required for Neon's TLS-encrypted connections.
  // rejectUnauthorized: false → accept Neon's CA cert without local CA lookup.
  // This keeps the connection encrypted while avoiding cert verification failures.
  ssl: cleanDatabaseUrl ? { rejectUnauthorized: false } : false,

  // Neon free tier: keep pool small. 3 concurrent pg connections is plenty
  // for a dev/staging environment; each maps to a pooler slot on Neon's end.
  max: 3,

  // Release idle connections after 10 seconds — before Neon's compute idles.
  // Prevents "Connection terminated unexpectedly" on the next request after
  // a period of inactivity.
  idleTimeoutMillis: 10_000,

  // Fail fast if we can't get a connection within 10 seconds.
  // This makes errors obvious immediately rather than hanging silently.
  connectionTimeoutMillis: 10_000,
};

// ── Singleton with HMR Safety ──────────────────────────────────────────────────
//
// In production:  `globalThis._pgPool` is undefined → create a fresh Pool.
// In development: `globalThis._pgPool` persists across HMR reloads → reuse it.
//
// This pattern is the official Next.js recommendation for singleton DB clients.
const pool: Pool = globalThis._pgPool ?? new Pool(poolConfig);

if (process.env.NODE_ENV !== 'production') {
  // Cache the pool on the global object in development only.
  // In production we never set this because each serverless invocation
  // gets a fresh module scope anyway.
  globalThis._pgPool = pool;
}

export default pool;
