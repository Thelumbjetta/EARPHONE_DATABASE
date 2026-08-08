/**
 * app/api/forum/threads/[id]/route.ts
 * =============================================================
 * API Route: GET /api/forum/threads/:id
 * =============================================================
 *
 * WHAT THIS ENDPOINT DOES:
 *   Returns the full detail of a single forum thread, including:
 *   - The thread's metadata (title, body, author, category, view count, etc.)
 *   - The first page of comments (replies) for the thread.
 *
 *   Additionally, EVERY call to this endpoint automatically increments
 *   the thread's `view_count` by 1. This is handled inside `getThreadById`.
 *
 * URL PATTERN:
 *   GET /api/forum/threads/42
 *
 * EXAMPLE RESPONSE (HTTP 200):
 *   {
 *     "thread": {
 *       "id": 42,
 *       "title": "Moondrop Aria 2 Review",
 *       "body": "After 3 weeks of listening...",
 *       "author_username": "basshead99",
 *       "view_count": 1247,
 *       ...
 *     },
 *     "comments": {
 *       "data": [ ... ],
 *       "total": 83,
 *       "page": 1,
 *       "totalPages": 2
 *     }
 *   }
 *
 * QUERY PARAMETERS:
 *   ?page=1   — Which page of comments to include (defaults to 1)
 *   ?limit=50 — Comments per page (defaults to 50)
 * =============================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { getThreadById, getCommentsByThread } from '@/lib/forum-queries';


/**
 * GET handler — fetches a thread and its comments.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    // ── Extract and validate the thread ID ────────────────────────────────────
    //
    // URL parameters are always STRINGS. "42" is the string "42", not the
    // number 42. We must convert it to an integer for the database query.
    //
    // parseInt("42", 10) → 42
    // parseInt("abc", 10) → NaN (Not a Number)
    // isNaN(NaN) → true (we catch this below)
    // ─────────────────────────────────────────────────────────────────────────
    const { id } = await params;
    const threadId = parseInt(id, 10);

    if (isNaN(threadId) || threadId < 1) {
      return NextResponse.json(
        { error: 'Invalid thread ID. Must be a positive integer.' },
        { status: 400 }
      );
    }

    // ── Parse optional pagination query params for comments ──────────────────
    const { searchParams } = request.nextUrl;
    const page  = parseInt(searchParams.get('page')  || '1',  10) || 1;
    const limit = parseInt(searchParams.get('limit') || '50', 10) || 50;
    const safeLimit = Math.min(limit, 100);

    // ── Fetch thread + comments in PARALLEL ──────────────────────────────────
    //
    // Promise.all fires both database queries simultaneously.
    // getThreadById also increments view_count as a side effect.
    // getCommentsByThread fetches replies, chronologically ordered.
    //
    // Since neither query depends on the other's result, running them
    // in parallel cuts response time roughly in half.
    // ─────────────────────────────────────────────────────────────────────────
    const [thread, comments] = await Promise.all([
      getThreadById(threadId),
      getCommentsByThread(threadId, page, safeLimit),
    ]);

    // If getThreadById returned null, no thread with this ID exists.
    if (!thread) {
      return NextResponse.json(
        { error: `Thread with ID ${threadId} was not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ thread, comments });

  } catch (error: unknown) {
    console.error('[GET /api/forum/threads/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch thread. Please try again later.' },
      { status: 500 }
    );
  }
}
