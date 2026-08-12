import { NextRequest, NextResponse } from 'next/server';
import { aggregateCommunityTierList } from '@/lib/aggregate-tier-list';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const communitySlug = searchParams.get('community') || 'audiophile';

  // aggregateCommunityTierList now handles all errors internally
  // and returns EMPTY_CONSENSUS instead of fake data on failure.
  const consensus = await aggregateCommunityTierList(communitySlug);
  return NextResponse.json(consensus);
}
