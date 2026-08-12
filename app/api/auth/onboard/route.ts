/**
 * app/api/auth/onboard/route.ts
 * =============================================================
 * Profile Completion API — called after first OTP sign-in
 * =============================================================
 * POST: validates + saves the chosen username and display name
 * for the newly-created user account.
 * =============================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import pool from '@/lib/db';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const userId = parseInt(session.user.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid session user ID.' }, { status: 400 });
  }

  const body = await request.json();
  const { username, display_name } = body as { username?: string; display_name?: string };

  // Validate username
  const trimmedUsername = (username || '').trim().toLowerCase();
  if (!USERNAME_REGEX.test(trimmedUsername)) {
    return NextResponse.json(
      { error: 'Username must be 3–30 characters: letters, numbers, underscores only.' },
      { status: 400 }
    );
  }

  // Check uniqueness
  const existing = await pool.query<{ id: number }>(
    'SELECT id FROM users WHERE username = $1 AND id != $2',
    [trimmedUsername, userId]
  );
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'Username is already taken.' }, { status: 409 });
  }

  // Save to DB
  const trimmedDisplay = (display_name || '').trim() || trimmedUsername;
  await pool.query(
    'UPDATE users SET username = $1, name = $2 WHERE id = $3',
    [trimmedUsername, trimmedDisplay, userId]
  );

  return NextResponse.json({ success: true, username: trimmedUsername });
}
