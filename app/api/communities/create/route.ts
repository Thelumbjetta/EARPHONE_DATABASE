import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createCommunity } from '@/lib/reddit-queries';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be signed in to create a community.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user session' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, icon_url, banner_url } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      return NextResponse.json({ error: 'Community name must be at least 3 characters long.' }, { status: 400 });
    }

    const cleanName = name.trim().toLowerCase().startsWith('r/') ? name.trim() : `r/${name.trim()}`;
    const slug = cleanName.replace(/^r\//, '').toLowerCase().replace(/[^a-z0-9_-]/g, '');

    if (!slug) {
      return NextResponse.json({ error: 'Invalid community name.' }, { status: 400 });
    }

    const community = await createCommunity({
      name: cleanName,
      slug,
      description: description?.trim() || undefined,
      icon_url: icon_url?.trim() || undefined,
      banner_url: banner_url?.trim() || undefined,
      created_by_user_id: userId,
    });

    return NextResponse.json({ community }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/communities/create] Error:', error);
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'A community with that name or slug already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create community.' }, { status: 500 });
  }
}
