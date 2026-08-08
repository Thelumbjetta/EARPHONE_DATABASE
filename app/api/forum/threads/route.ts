/**
 * app/api/forum/threads/route.ts
 * =============================================================
 * API Route: POST /api/forum/threads
 * =============================================================
 *
 * WHAT THIS ENDPOINT DOES:
 *   Creates a new forum thread. A user submits the "Create Thread" form;
 *   the browser sends a POST request here; we validate the data, insert
 *   it into the `threads` table, and return the new thread.
 *
 * HTTP METHOD: POST (write operation — creates a new resource)
 *
 * REQUEST BODY (JSON):
 *   {
 *     "user_id":     1,
 *     "category_id": 2,
 *     "title":       "Best IEMs Under $100 in 2026",
 *     "body":        "Let's compile a list! I'll start with the Moondrop Aria 2...",
 *     "media_url":   "https://i.imgur.com/example.jpg"  // optional
 *   }
 *
 * RESPONSE (HTTP 201 Created):
 *   { "thread": { id, category_id, user_id, title, body, ... } }
 *
 * RESPONSE (HTTP 400 Bad Request — validation failed):
 *   { "error": "Title cannot be empty." }
 *
 * NOTE ON AUTHENTICATION:
 *   A production system would verify the user's session here
 *   (e.g., using NextAuth's getServerSession) to ensure user_id
 *   in the body matches the logged-in user. For this architecture
 *   build, user_id is accepted from the request body directly.
 * =============================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { createThread } from '@/lib/forum-queries';
import { auth } from '@/auth';

type CreateThreadBody = {
  user_id?: number;
  category_id: number;
  title: string;
  body: string;
  media_url?: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json() as CreateThreadBody;
    const { category_id, title, body: postBody, media_url } = body;

    // Determine user_id: prefer logged-in session, fallback to body.user_id for dev testing
    let user_id = body.user_id;
    if (session?.user?.id) {
      user_id = parseInt(session.user.id, 10);
    }

    if (!user_id || typeof user_id !== 'number' || user_id < 1) {
      return NextResponse.json(
        { error: 'You must be signed in to create a new thread.' },
        { status: 401 }
      );
    }

    // Every thread needs a category.
    if (!category_id || typeof category_id !== 'number' || category_id < 1) {
      return NextResponse.json(
        { error: 'A valid category_id is required.' },
        { status: 400 }
      );
    }

    // Title must be a non-empty string.
    // .trim() removes whitespace — "   " (spaces only) would fail this check.
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Thread title cannot be empty.' },
        { status: 400 }
      );
    }

    // Title length cap. 300 chars matches the DB column VARCHAR(300).
    if (title.trim().length > 300) {
      return NextResponse.json(
        { error: 'Thread title cannot exceed 300 characters.' },
        { status: 400 }
      );
    }

    // Opening post body must have content.
    if (!postBody?.trim()) {
      return NextResponse.json(
        { error: 'Thread body (opening post) cannot be empty.' },
        { status: 400 }
      );
    }


    // ── Create the thread ───────────────────────────────────────────────────
    //
    // Delegate to the query library — this keeps HTTP logic (route file)
    // separate from database logic (forum-queries.ts).
    // ─────────────────────────────────────────────────────────────────────────
    const thread = await createThread({
      user_id,
      category_id,
      title,
      body: postBody,
      media_url: media_url || undefined,
    });


    // ── Return 201 Created ──────────────────────────────────────────────────
    //
    // HTTP 201 Created: The standard success code for "a new resource was made."
    // (200 OK is for successful reads. 201 is for successful creates.)
    // ─────────────────────────────────────────────────────────────────────────
    return NextResponse.json({ thread }, { status: 201 });

  } catch (error: unknown) {

    // Check for PostgreSQL FK violation (category_id doesn't exist)
    // PostgreSQL error code 23503 = foreign_key_violation
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === '23503'
    ) {
      return NextResponse.json(
        { error: 'The specified category_id or user_id does not exist.' },
        { status: 422 } // HTTP 422 Unprocessable Entity — semantically invalid data
      );
    }

    console.error('[POST /api/forum/threads] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create thread. Please try again later.' },
      { status: 500 }
    );
  }
}
