import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  try {
    const res = await pool.query(`
      WITH extracted_tags AS (
        SELECT unnest(regexp_matches(body || ' ' || title, '#[a-zA-Z0-9_]+', 'g')) AS tag
        FROM threads
        WHERE created_at >= NOW() - INTERVAL '7 days'
      )
      SELECT tag, COUNT(*) as count
      FROM extracted_tags
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 5
    `);
    
    // Format response
    const tags = res.rows.map(row => ({
      tag: row.tag,
      count: parseInt(row.count, 10),
    }));

    return NextResponse.json(tags, { status: 200 });
  } catch (error) {
    console.error('[GET /api/trending] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending tags' },
      { status: 500 }
    );
  }
}
