/**
 * app/api/forum/threads/[id]/comments/route.ts
 * =============================================================
 * API Routes: GET + POST /api/forum/threads/:id/comments
 * =============================================================
 *
 * THIS FILE EXPORTS TWO HANDLERS:
 *
 *   GET  /api/forum/threads/42/comments
 *     → Returns a paginated list of comments (replies) for thread #42.
 *     → Used by the Thread View page to lazy-load more replies.
 *
 *   POST /api/forum/threads/42/comments
 *     → Submits a new reply to thread #42.
 *     → Used by the comment submission form at the bottom of a thread.
 *
 * WHY TWO METHODS IN ONE FILE?
 *   Next.js App Router allows a single route.ts file to handle multiple
 *   HTTP methods by exporting multiple named functions: GET, POST, PATCH, etc.
 *   This keeps related handlers co-located. The URL is the same for both;
 *   the HTTP method determines which function runs.
 *
 * QUERY PARAMETERS (GET only):
 *   ?page=1   — Page of comments (defaults to 1)
 *   ?limit=50 — Comments per page (defaults to 50, capped at 100)
 *
 * POST REQUEST BODY:
 *   {
 *     "user_id":   3,
 *     "content":   "Great review! The Aria 2's treble roll-off is real.",
 *     "media_url": "https://example.com/graph.png"  // optional
 *   }
 *
 * POST RESPONSE (HTTP 201 Created):
 *   { "comment": { id, thread_id, user_id, content, media_url, created_at } }
 *
 * SPECIAL BEHAVIOR:
 *   POST also:
 *   - Bumps the thread's `updated_at` timestamp (makes it rise in listings)
 *   - Increments the author's `post_count`
 *   Both are handled inside the `createComment` transaction in forum-queries.ts.
 * =============================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCommentsByThread, createComment, getThreadById } from '@/lib/forum-queries';
import { createReplyNotification } from '@/lib/reddit-queries';
import { auth } from '@/auth';

type CreateCommentBody = {
  user_id?: number;
  content: string;
  media_url?: string;
};


// =============================================================
// GET — fetch paginated comments for a thread
// =============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    const { id } = await params;
    const threadId = parseInt(id, 10);

    if (isNaN(threadId) || threadId < 1) {
      return NextResponse.json(
        { error: 'Invalid thread ID.' },
        { status: 400 }
      );
    }

    const { searchParams } = request.nextUrl;
    const page  = parseInt(searchParams.get('page')  || '1',  10) || 1;
    const limit = parseInt(searchParams.get('limit') || '50', 10) || 50;
    const safeLimit = Math.min(limit, 100);

    const comments = await getCommentsByThread(threadId, page, safeLimit);

    return NextResponse.json({ comments });

  } catch (error: unknown) {
    console.error('[GET /api/forum/threads/[id]/comments] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments.' },
      { status: 500 }
    );
  }
}


// =============================================================
// POST — submit a new comment (reply) to a thread
// =============================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    const { id } = await params;
    const threadId = parseInt(id, 10);

    if (isNaN(threadId) || threadId < 1) {
      return NextResponse.json(
        { error: 'Invalid thread ID.' },
        { status: 400 }
      );
    }

    // ── Parse request body & session ──────────────────────────────────────────
    const session = await auth();
    const body = await request.json() as CreateCommentBody;
    const { content, media_url } = body;

    let user_id = body.user_id;
    if (session?.user?.id) {
      user_id = parseInt(session.user.id, 10);
    }

    // ── Validate inputs ───────────────────────────────────────────────────────

    if (!user_id || typeof user_id !== 'number' || user_id < 1) {
      return NextResponse.json(
        { error: 'You must be signed in to post a reply.' },
        { status: 401 }
      );
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Comment content cannot be empty.' },
        { status: 400 }
      );
    }


    // ── Check that the thread exists and is not locked ────────────────────────
    //
    // WHAT IS A LOCKED THREAD?
    //   When is_locked = TRUE, no new replies are allowed.
    //   This is used for resolved marketplace threads, archived discussions, etc.
    //   We must check this BEFORE inserting the comment.
    //
    // Note: getThreadById also increments view_count as a side effect.
    // For this use case we don't want that — ideally we'd have a separate
    // "check thread exists" query. For simplicity, we use getThreadById here
    // and accept the view_count increment (one extra view per comment post).
    // In a production system, you'd write a dedicated lightweight check query.
    // ─────────────────────────────────────────────────────────────────────────
    const thread = await getThreadById(threadId);

    if (!thread) {
      return NextResponse.json(
        { error: `Thread with ID ${threadId} was not found.` },
        { status: 404 }
      );
    }

    if (thread.is_locked) {
      // HTTP 403 Forbidden: the request is understood, but not allowed.
      // (vs. 401 Unauthorized, which means "you need to log in first")
      return NextResponse.json(
        { error: 'This thread is locked. No new replies are allowed.' },
        { status: 403 }
      );
    }


    // ── Insert the comment ────────────────────────────────────────────────────
    //
    // createComment runs a database TRANSACTION:
    //   1. INSERT the comment into `comments`
    //   2. UPDATE threads SET updated_at = NOW() (bumps the thread)
    //   3. UPDATE users SET post_count = post_count + 1
    // If any step fails, ALL three are rolled back. No partial state.
    // ─────────────────────────────────────────────────────────────────────────
    const comment = await createComment({
      thread_id: threadId,
      user_id,
      content,
      media_url: media_url || undefined,
    });

    // Trigger notification if commenter is not the thread author
    if (thread.user_id && thread.user_id !== user_id) {
      const commenterName = session?.user?.name || `user_${user_id}`;
      const commSlug = (thread as any).category_slug || 'audiophile';
      await createReplyNotification({
        recipientUserId: thread.user_id,
        actorUsername: commenterName,
        threadId,
        threadTitle: thread.title,
        communitySlug: commSlug,
      }).catch((err) => console.error('Failed to create reply notification:', err));
    }

    return NextResponse.json({ comment }, { status: 201 });

  } catch (error: unknown) {
    console.error('[POST /api/forum/threads/[id]/comments] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit comment. Please try again later.' },
      { status: 500 }
    );
  }
}
