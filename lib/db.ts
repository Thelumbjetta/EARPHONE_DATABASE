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
// pg.Pool accepts either:
//   - connectionString: a single "postgresql://user:pass@host:port/db" URL
//   - Individual fields: host, port, user, password, database
//
// We try DATABASE_URL first (preferred for cloud providers like Supabase/Neon).
// If it's absent, pg falls back to the individual PGHOST, PGUSER, etc.
// variables which it reads automatically from process.env.
//
// max: 10 connections in the pool — a safe default for a single-instance app.
//      Increase if you see "timeout waiting for client" errors under load.
//
// idleTimeoutMillis: connections idle for >30s are closed and returned to OS.
//
// connectionTimeoutMillis: throw an error if a new connection isn't established
//      within 2 seconds (prevents silent hangs when the DB is unreachable).
const poolConfig = {
  connectionString:        process.env.DATABASE_URL,
  host:                    process.env.PGHOST     || 'localhost',
  port:                    parseInt(process.env.PGPORT || '5432', 10),
  user:                    process.env.PGUSER,
  password:                process.env.PGPASSWORD,
  database:                process.env.PGDATABASE,
  max:                     10,
  idleTimeoutMillis:       30_000,
  connectionTimeoutMillis: 2_000,
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
