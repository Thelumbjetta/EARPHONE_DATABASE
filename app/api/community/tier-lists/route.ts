/**
 * app/api/community/tier-lists/route.ts
 * =============================================================
 * API Routes: GET + POST /api/community/tier-lists
 * =============================================================
 *
 * THIS FILE EXPORTS TWO HANDLERS:
 *
 *   GET  /api/community/tier-lists
 *     → Returns a paginated feed of public community tier lists.
 *     → Supports filtering by category via ?category=IEM.
 *
 *   POST /api/community/tier-lists
 *     → Creates a new community tier list for a user.
 *     → Returns the new tier list on success.
 *
 * QUERY PARAMETERS (GET only):
 *   ?page=1          — Page number (defaults to 1)
 *   ?limit=20        — Tier lists per page (defaults to 20, max 100)
 *   ?category=IEM    — Optional category filter (e.g., 'IEM', 'Over-Ear')
 *
 * POST REQUEST BODY:
 *   {
 *     "user_id":          1,
 *     "title":            "My IEM Rankings 2026",
 *     "description":      "After 50+ hours of A/B testing...",  // optional
 *     "banner_image_url": "https://...",                        // optional
 *     "theme_color_hex":  "#6366f1",                           // optional
 *     "is_public":        true,                                 // optional, default true
 *     "category":         "IEM"                                 // optional
 *   }
 *
 * POST RESPONSE (HTTP 201 Created):
 *   { "tierList": { id, user_id, title, ... } }
 *
 * AFTER CREATING A TIER LIST:
 *   The new tier list has no rows or items yet. Use the existing
 *   tier_lists API to add list_tiers (rows) and tier_list_items (gear placements).
 *   The `id` returned here is what you use for those subsequent operations.
 * =============================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPublicTierLists, createCommunityTierList } from '@/lib/forum-queries';


// ── Type: expected POST body ───────────────────────────────────────────────────
type CreateTierListBody = {
  user_id: number;
  title: string;
  description?: string;
  banner_image_url?: string;
  theme_color_hex?: string;
  is_public?: boolean;
  category?: string;
};


// =============================================================
// GET — public community tier list feed
// =============================================================

export async function GET(request: NextRequest) {
  try {

    const { searchParams } = request.nextUrl;

    // Parse pagination params
    const page  = parseInt(searchParams.get('page')  || '1',  10) || 1;
    const limit = parseInt(searchParams.get('limit') || '20', 10) || 20;
    const safeLimit = Math.min(limit, 100); // prevent fetching unreasonably large pages

    // Optional category filter.
    // searchParams.get('category') returns null if not present,
    // or the string value if present (e.g., 'IEM', 'Over-Ear').
    const category = searchParams.get('category'); // null or string

    const result = await getPublicTierLists(page, safeLimit, category);

    // Return the paginated result.
    // The client gets: data (array of tier lists), total, page, limit, totalPages.
    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('[GET /api/community/tier-lists] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch community tier lists.' },
      { status: 500 }
    );
  }
}


// =============================================================
// POST — create a new community tier list
// =============================================================

export async function POST(request: NextRequest) {
  try {

    const body = await request.json() as CreateTierListBody;
    const { user_id, title, description, banner_image_url, theme_color_hex, is_public, category } = body;


    // ── Validate required fields ──────────────────────────────────────────────

    if (!user_id || typeof user_id !== 'number' || user_id < 1) {
      return NextResponse.json(
        { error: 'A valid user_id is required.' },
        { status: 400 }
      );
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Tier list title cannot be empty.' },
        { status: 400 }
      );
    }

    if (title.trim().length > 200) {
      return NextResponse.json(
        { error: 'Title cannot exceed 200 characters.' },
        { status: 400 }
      );
    }

    // Validate hex color if provided.
    // A valid hex color is #RGB (4 chars) or #RRGGBB (7 chars) or #RRGGBBAA (9 chars).
    if (theme_color_hex && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(theme_color_hex)) {
      return NextResponse.json(
        { error: 'theme_color_hex must be a valid CSS hex color (e.g., #6366f1).' },
        { status: 400 }
      );
    }


    // ── Create the tier list ──────────────────────────────────────────────────
    const tierList = await createCommunityTierList({
      user_id,
      title,
      description:      description      || undefined,
      banner_image_url: banner_image_url || undefined,
      theme_color_hex:  theme_color_hex  || undefined,
      is_public:        is_public        ?? true, // ?? = nullish coalescing: use right side only if left is null or undefined
      category:         category         || undefined,
    });

    return NextResponse.json({ tierList }, { status: 201 });

  } catch (error: unknown) {

    // PostgreSQL FK violation: user_id doesn't exist in users table
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === '23503'
    ) {
      return NextResponse.json(
        { error: 'The specified user_id does not exist.' },
        { status: 422 }
      );
    }

    console.error('[POST /api/community/tier-lists] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create tier list. Please try again later.' },
      { status: 500 }
    );
  }
}
