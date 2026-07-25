/**
 * app/api/tier-lists/[id]/route.ts
 * =============================================================
 * API Route: GET /api/tier-lists/:id
 * =============================================================
 *
 * WHAT IS THIS FILE?
 *   A Next.js API route that returns tier list data as JSON.
 *   It's the "HTTP version" of the database query — used when
 *   the BROWSER needs to fetch data (e.g., after a user action
 *   like dragging and the page needs a refresh of server state).
 *
 * FOLDER NAME: [id]
 *   Square brackets in Next.js App Router make a "dynamic segment."
 *   The [id] folder matches any URL segment:
 *     /api/tier-lists/1   → params.id = "1"
 *     /api/tier-lists/42  → params.id = "42"
 *     /api/tier-lists/abc → params.id = "abc" (we validate and reject this)
 *
 * WHY BOTH AN API ROUTE AND A DIRECT DB QUERY IN lib/?
 *   - Server Components (page.tsx) call lib/tier-list-queries.ts DIRECTLY.
 *     No HTTP needed. Faster. This is the preferred path for initial page load.
 *   - Client Components that need to SAVE changes (like the drag result)
 *     call this API route via fetch(). Browser → Server → DB.
 * =============================================================
 */

// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
// ↑ NextRequest: represents the incoming HTTP request (method, headers, body)
// ↑ NextResponse: helper to construct HTTP responses (JSON, status codes, etc.)

import { getTierListPageData } from '@/lib/tier-list-queries';
// ↑ The same query function used by the Server Component page.
//   We reuse it here so there's no duplicated SQL logic.
// ─────────────────────────────────────────────────────────────────────────────


// ── GET Handler ────────────────────────────────────────────────────────────────
//
// KEYWORD: export async function GET
//   `export` — makes this function visible to Next.js's routing system.
//   `async`  — this function uses `await` for the database query.
//   `GET`    — Next.js App Router: naming the export after an HTTP method
//              (GET, POST, PUT, DELETE) tells it which HTTP method to handle.
//              A GET request to /api/tier-lists/1 calls THIS function.
//
// PARAMETER: request
//   The incoming HTTP request. We don't use it here (no query params needed)
//   but it must be declared for the function signature to be valid.
//
// PARAMETER: { params }
//   Next.js automatically passes route params as the second argument.
//   In Next.js 15+, `params` is a PROMISE — we must await it to get the value.
//   The type `{ params: Promise<{ id: string }> }` is the required TypeScript
//   signature for dynamic API routes in Next.js 15+.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Await the dynamic params ──────────────────────────────────────────────
  //
  // In Next.js 15+, params is a Promise. We must await it before accessing
  // the `id` field. This is a newer pattern — older tutorials might show
  // params without await, which no longer works.
  // ─────────────────────────────────────────────────────────────────────────
  const { id } = await params;

  // ── Convert id from string to number ─────────────────────────────────────
  //
  // URL parameters are always STRINGS. "1" is a string, not the number 1.
  // Our database query function expects a NUMBER.
  // parseInt("1", 10) → 1  (parses "1" as an integer in base 10)
  // parseInt("abc", 10) → NaN  (Not a Number — the string isn't numeric)
  // ─────────────────────────────────────────────────────────────────────────
  const numericId = parseInt(id, 10);

  // ── Safety check: was the ID a valid number? ──────────────────────────────
  //
  // isNaN(NaN) → true (reject this request)
  // isNaN(1)   → false (proceed)
  // ─────────────────────────────────────────────────────────────────────────
  if (isNaN(numericId)) {
    return NextResponse.json(
      { error: 'Invalid tier list ID. Must be a number.' },
      { status: 400 } // 400 Bad Request
    );
  }

  // ── Fetch data ────────────────────────────────────────────────────────────
  //
  // Call the same query function used by the Server Component page.
  // await pauses here until the database query completes.
  // ─────────────────────────────────────────────────────────────────────────
  const data = await getTierListPageData(numericId);

  // ── Handle not found ──────────────────────────────────────────────────────
  if (!data) {
    return NextResponse.json(
      { error: `Tier list with ID ${numericId} was not found.` },
      { status: 404 } // 404 Not Found
    );
  }

  // ── Return success response ───────────────────────────────────────────────
  //
  // NextResponse.json(data, options)
  //   Serializes `data` as a JSON string, sets Content-Type: application/json,
  //   and sends it back to the client with the given HTTP status.
  //
  // HTTP 200 OK is the default for NextResponse.json() so we don't need
  // to pass { status: 200 } explicitly, but it's clear to be explicit.
  // ─────────────────────────────────────────────────────────────────────────
  return NextResponse.json(data, { status: 200 });
}
