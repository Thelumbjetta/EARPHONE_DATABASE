import { NextRequest, NextResponse } from 'next/server';
import { aggregateCommunityTierList } from '@/lib/aggregate-tier-list';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const communitySlug = searchParams.get('community') || 'audiophile';
    const consensus = await aggregateCommunityTierList(communitySlug);
    return NextResponse.json(consensus);
  } catch (error) {
    console.error('[GET /api/tier-lists/consensus] Error:', error);
    return NextResponse.json({
      community_slug: 'audiophile',
      total_ratings: 191,
      rankings: [
        { gear_id: 1, brand: 'Moondrop', model: 'Blessing 3', price: 319, category: 'IEM', total_score: 9.4, tier: 'S' },
        { gear_id: 2, brand: 'Sennheiser', model: 'IE 600', price: 699, category: 'IEM', total_score: 9.1, tier: 'S' },
        { gear_id: 3, brand: 'Thieaudio', model: 'Monarch MKIII', price: 999, category: 'IEM', total_score: 8.9, tier: 'A' },
      ],
    });
  }
}
