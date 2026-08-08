/**
 * app/api/forum/categories/[slug]/threads/route.ts
 * =============================================================
 * API Route: GET /api/forum/categories/:slug/threads
 * =============================================================
 *
 * WHAT THIS ENDPOINT DOES:
 *   Returns a paginated list of threads for a specific forum category,
 *   identified by its URL slug (e.g., "head-gear").
 *
 * URL PATTERN:
 *   /api/forum/categories/head-gear/threads
 *   /api/forum/categories/sound-science/threads?page=2&limit=10
 *
 * DYNAMIC SEGMENTS:
 *   [slug] in the folder name means this route matches any value in that
 *   position. Next.js extracts it and passes it via the `params` object.
 *
 * QUERY PARAMETERS (optional):
 *   ?page=1   — Which page of results (defaults to 1)
 *   ?limit=20 — How many threads per page (defaults to 20)
 *
 * EXAMPLE RESPONSE (HTTP 200):
 *   {
 *     "category": { "id": 1, "name": "Head Gear", "slug": "head-gear", ... },
 *     "threads": {
 *       "data": [ { "id": 5, "title": "Best IEMs Under $100", ... }, ... ],
 *       "total": 47,
 *       "page": 1,
 *       "limit": 20,
 *       "totalPages": 3
 *     }
 *   }
 *
 * HOW TO CALL FROM BROWSER:
 *   const res = await fetch('/api/forum/categories/head-gear/threads?page=1');
 *   const { category, threads } = await res.json();
 * =============================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCategoryBySlug, getThreadsByCategory } from '@/lib/forum-queries';


/**
 * GET handler — fetches paginated threads for a category slug.
 *
 * NEXT.JS 15+ PARAMS SYNTAX:
 *   In Next.js 15 and later, the `params` object for dynamic routes
 *   is a PROMISE. You MUST await it before accessing its properties.
 *   This is different from older Next.js versions where params was a plain object.
 *
 *   Type annotation: { params: Promise<{ slug: string }> }
 *   This tells TypeScript: "params is a Promise that resolves to an object
 *   with a `slug` string property."
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {

    // ── Resolve the dynamic route parameter ──────────────────────────────────
    //
    // await params: Next.js 15+ requires this. Without await, params would
    // be a Promise object, not the actual { slug: string } object.
    // ─────────────────────────────────────────────────────────────────────────
    const { slug } = await params;

    // ── Parse query parameters ───────────────────────────────────────────────
    //
    // WHAT IS A QUERY PARAMETER?
    //   The part of a URL after `?`. In /api/...?page=2&limit=10:
    //     page = "2" (as a string — URL params are always strings)
    //     limit = "10"
    //
    // request.nextUrl.searchParams is a URLSearchParams object.
    // .get('page') returns the string value, or null if not present.
    //
    // parseInt(value, 10): converts "2" → 2. The second argument (10)
    //   is the base (decimal). Always specify this to prevent subtle bugs.
    //
    // The || operator: if parseInt returns NaN (not a number, e.g., for null),
    //   we fall back to the default value (1 or 20).
    // ─────────────────────────────────────────────────────────────────────────
    const { searchParams } = request.nextUrl;
    const page  = parseInt(searchParams.get('page')  || '1',  10) || 1;
    const limit = parseInt(searchParams.get('limit') || '20', 10) || 20;

    // Safety: cap limit at 100 to prevent abuse (fetching 10,000 rows at once)
    const safeLimit = Math.min(limit, 100);

    // ── Resolve slug to category ─────────────────────────────────────────────
    //
    // We first look up the category by slug to get its numeric id.
    // The thread listing query uses category_id (integer), not slug (string).
    // ─────────────────────────────────────────────────────────────────────────
    const category = await getCategoryBySlug(slug);

    if (!category) {
      // HTTP 404 Not Found: no category with this slug exists.
      return NextResponse.json(
        { error: `Forum category "${slug}" was not found.` },
        { status: 404 }
      );
    }

    // ── Fetch paginated threads ──────────────────────────────────────────────
    const threads = await getThreadsByCategory(category.id, page, safeLimit);

    return NextResponse.json({ category, threads });

  } catch (error: unknown) {
    console.error('[GET /api/forum/categories/[slug]/threads] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch threads. Please try again later.' },
      { status: 500 }
    );
  }
}
