/**
 * app/api/forum/categories/route.ts
 * =============================================================
 * API Route: GET /api/forum/categories
 * =============================================================
 *
 * WHAT THIS ENDPOINT DOES:
 *   Returns an array of all forum category (board section) objects.
 *   The Board Index page calls this to render its table of sections.
 *
 * EXAMPLE RESPONSE (HTTP 200):
 *   {
 *     "categories": [
 *       { "id": 1, "name": "Head Gear", "slug": "head-gear", "description": "...", "display_order": 1 },
 *       { "id": 2, "name": "Sound Science", "slug": "sound-science", ... },
 *       ...
 *     ]
 *   }
 *
 * HTTP METHOD: GET (read-only, no body required)
 *
 * HOW TO CALL THIS FROM THE BROWSER:
 *   const response = await fetch('/api/forum/categories');
 *   const { categories } = await response.json();
 *
 * FILE LOCATION → URL MAPPING (Next.js App Router):
 *   app/api/forum/categories/route.ts → /api/forum/categories
 *   Next.js reads the folder path and automatically creates the URL.
 * =============================================================
 */

import { NextResponse } from 'next/server';
// ↑ NextResponse: Next.js helper to build HTTP responses.
//   NextResponse.json(data) sets Content-Type: application/json automatically.

import { getForumCategories } from '@/lib/forum-queries';
// ↑ The query function from our centralized forum-queries library.
//   @/ is a TypeScript path alias for the project root (configured in tsconfig.json).


/**
 * GET handler — export must be named exactly "GET" for Next.js App Router.
 * Next.js calls this function when it receives a GET request to this URL.
 *
 * KEYWORD: async
 *   This function uses await internally, so it must be declared async.
 *   Async functions always return a Promise — Next.js handles the awaiting.
 */
export async function GET() {

  // ── try/catch: protect against unexpected errors ──────────────────────────
  //
  // WHAT IS try/catch?
  //   Code inside `try` runs normally. If anything throws an error
  //   (e.g., the database is unreachable), execution jumps to `catch`.
  //   Without try/catch, an unhandled error would crash the route and
  //   the user would see an unhelpful "Internal Server Error" with no JSON body.
  //
  //   With try/catch, WE control the error response: always JSON, always useful.
  // ─────────────────────────────────────────────────────────────────────────
  try {

    // Fetch all categories from the database.
    // await: pause here until the DB responds. Then continue.
    const categories = await getForumCategories();

    // Return HTTP 200 OK with the array of categories.
    // NextResponse.json wraps the data object and sets status 200 (the default).
    return NextResponse.json({ categories });

  } catch (error: unknown) {

    // Log the real error server-side (visible in your terminal/logs).
    // Never send internal error details to the client — it's a security risk.
    console.error('[GET /api/forum/categories] Error:', error);

    // Return HTTP 500 Internal Server Error — something went wrong on our end.
    return NextResponse.json(
      { error: 'Failed to fetch forum categories. Please try again later.' },
      { status: 500 }
    );
  }
}
