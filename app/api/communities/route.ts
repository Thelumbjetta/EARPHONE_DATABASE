import { NextResponse } from 'next/server';
import { getAllCommunities } from '@/lib/reddit-queries';

export async function GET() {
  try {
    const communities = await getAllCommunities();
    return NextResponse.json({ communities });
  } catch (error) {
    console.error('[GET /api/communities] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch communities' }, { status: 500 });
  }
}
