import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  try {
    const res = await pool.query(`
      SELECT id, name, slug, description, member_count, icon_url, banner_url
      FROM communities
      ORDER BY member_count DESC
      LIMIT 5
    `);
    
    return NextResponse.json(res.rows, { status: 200 });
  } catch (error) {
    console.error('[GET /api/communities/popular] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular communities' },
      { status: 500 }
    );
  }
}
