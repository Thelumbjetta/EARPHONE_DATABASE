import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { votePost } from '@/lib/reddit-queries';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be signed in to vote.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user session' }, { status: 400 });
    }

    const body = await request.json();
    const { thread_id, vote_value } = body;

    if (!thread_id || typeof thread_id !== 'number') {
      return NextResponse.json({ error: 'Thread ID is required.' }, { status: 400 });
    }

    if (vote_value !== 1 && vote_value !== -1 && vote_value !== 0) {
      return NextResponse.json({ error: 'Vote value must be 1, -1, or 0.' }, { status: 400 });
    }

    const result = await votePost(userId, thread_id, vote_value);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[POST /api/posts/vote] Error:', error);
    return NextResponse.json({ error: 'Failed to process vote.' }, { status: 500 });
  }
}
