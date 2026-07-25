/**
 * app/api/auth/[...nextauth]/route.ts
 * =============================================================
 * NextAuth v5 — App Router Catch-All Route Handler
 * =============================================================
 *
 * WHAT IS THIS FILE?
 *   This file is the "traffic director" for all authentication
 *   HTTP requests. It hands every request over to NextAuth's
 *   built-in handler, which knows how to process login, logout,
 *   session checks, and provider callbacks.
 *
 * WHAT DOES THE FOLDER NAME `[...nextauth]` MEAN?
 *   In Next.js App Router, square brackets [ ] denote a dynamic
 *   segment — a part of the URL path that can be anything.
 *   The three dots `...` make it a "catch-all" segment, meaning
 *   it matches one OR MORE path segments after /api/auth/.
 *
 *   So this single file handles ALL of these URLs:
 *     GET  /api/auth/session       → returns current session JSON
 *     GET  /api/auth/signin        → renders the login page
 *     POST /api/auth/signin        → processes a login form submission
 *     GET  /api/auth/signout       → renders the logout confirmation
 *     POST /api/auth/signout       → processes logout
 *     GET  /api/auth/providers     → lists configured providers
 *     GET  /api/auth/csrf          → returns a CSRF protection token
 *     GET  /api/auth/callback/credentials → handles credential callbacks
 *
 *   You didn't have to write any of those handlers.
 *   NextAuth's `handlers` object contains pre-built code for all of them.
 *
 * WHY IS THE CODE SO SHORT?
 *   All the real logic lives in auth.ts (the configuration file).
 *   This route file's only job is to EXPOSE NextAuth's handlers
 *   to Next.js's routing system. It's intentionally minimal.
 * =============================================================
 */

// ── IMPORT ─────────────────────────────────────────────────────────────────────
//
// We import `handlers` from our auth.ts configuration file.
// `handlers` is an object that NextAuth v5 automatically generates.
// It contains two properties: `handlers.GET` and `handlers.POST` —
// each is a function that handles the respective HTTP method.
//
// @/ is the TypeScript path alias for the project root.
// So @/auth → hbb-tierlist/auth.ts
// ─────────────────────────────────────────────────────────────────────────────
import { handlers } from '@/auth';


// ── EXPORT GET AND POST ────────────────────────────────────────────────────────
//
// KEYWORD: export
//   Makes these values available to Next.js's routing system.
//
// In Next.js App Router, a route file (route.ts) exports functions
// named after HTTP methods: GET, POST, PUT, DELETE, PATCH, etc.
// Next.js automatically calls the right function based on the
// HTTP method of the incoming request.
//
// Syntax:  export const GET = someFunction;
//   This is shorthand for:
//     const GET = someFunction;
//     export { GET };
//
// handlers.GET:
//   NextAuth's pre-built handler for GET requests (session reads,
//   login page renders, provider listings, CSRF token requests).
//
// handlers.POST:
//   NextAuth's pre-built handler for POST requests (login form
//   submissions, logout requests, credential callbacks).
//
// We are not writing these handler functions ourselves —
// we are simply "re-exporting" the functions that NextAuth
// already built for us inside our auth.ts configuration.
// ─────────────────────────────────────────────────────────────────────────────
export const { GET, POST } = handlers;
