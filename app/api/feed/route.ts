import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getRedditPosts } from '@/lib/reddit-queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ? parseInt(session.user.id, 10) : undefined;
    const { searchParams } = new URL(request.url);
    const sort = (searchParams.get('sort') as 'hot' | 'new' | 'top') || 'hot';
    const communitySlug = searchParams.get('community') || 'all';

    const posts = await getRedditPosts({
      communitySlug,
      currentUserId: userId,
      sortBy: sort,
      limit: 50,
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('[GET /api/feed] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 });
  }
}
