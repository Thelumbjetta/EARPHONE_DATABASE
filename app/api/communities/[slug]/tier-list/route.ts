import { NextRequest, NextResponse } from 'next/server';
import { aggregateCommunityTierList } from '@/lib/aggregate-tier-list';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Community slug is required.' }, { status: 400 });
    }

    const consensus = await aggregateCommunityTierList(slug);
    return NextResponse.json(consensus);
  } catch (error) {
    console.error('[GET /api/communities/[slug]/tier-list] Error:', error);
    return NextResponse.json(
      { error: 'Failed to aggregate community tier list.' },
      { status: 500 }
    );
  }
}
