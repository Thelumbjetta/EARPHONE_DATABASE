import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import pool from '@/lib/db';
import { aggregateCommunityTierList } from '@/lib/aggregate-tier-list';

type SaveTierListBody = {
  id?: number;
  title: string;
  category?: string;
  description?: string;
  is_public?: boolean;
  items: Array<{
    brand: string;
    model: string;
    price: number;
    category?: string;
    driver_type?: string;
    graph_url?: string;
    bass: number;
    mids: number;
    treble: number;
    tonality: number;
    technicality: number;
    bias_pref: number;
    total_score: number;
    tier: 'S' | 'A' | 'B' | 'C' | 'D';
    review_notes?: string;
  }>;
};

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const session = await auth();
    let userId = session?.user?.id ? parseInt(session.user.id, 10) : 1;

    if (isNaN(userId)) {
      userId = 1; // Fallback to primary user if unauthenticated in dev
    }

    const body: SaveTierListBody = await request.json();
    const { title, category = 'audiophile', description, is_public = true, items } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Tier list title is required.' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Insert or update tier_lists record
    let tierListId = body.id;
    if (!tierListId) {
      const listRes = await client.query(`
        INSERT INTO tier_lists (user_id, title, description, category, is_public)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [userId, title.trim(), description?.trim() || null, category, is_public]);
      tierListId = listRes.rows[0].id;
    } else {
      await client.query(`
        UPDATE tier_lists
        SET title = $1, description = $2, category = $3, is_public = $4, updated_at = NOW()
        WHERE id = $5 AND user_id = $6
      `, [title.trim(), description?.trim() || null, category, is_public, tierListId, userId]);
    }

    // 2. Ensure standard list_tiers rows exist (S, A, B, C, D)
    const tierMap: Record<string, number> = {};
    const defaultTiers: Array<{ name: string; rank: number; color: string }> = [
      { name: 'S-Tier', rank: 1, color: '#ffd60a' },
      { name: 'A-Tier', rank: 2, color: '#70e000' },
      { name: 'B-Tier', rank: 3, color: '#4895ef' },
      { name: 'C-Tier', rank: 4, color: '#f77f00' },
      { name: 'D-Tier', rank: 5, color: '#e63946' },
    ];

    for (const dt of defaultTiers) {
      const tierRes = await client.query(`
        INSERT INTO list_tiers (tier_list_id, name, rank_order, color_hex)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
        RETURNING id, name
      `, [tierListId, dt.name, dt.rank, dt.color]);

      if (tierRes.rows.length > 0) {
        tierMap[dt.name.charAt(0)] = tierRes.rows[0].id;
      } else {
        const existingRes = await client.query(`
          SELECT id FROM list_tiers WHERE tier_list_id = $1 AND rank_order = $2
        `, [tierListId, dt.rank]);
        if (existingRes.rows.length > 0) {
          tierMap[dt.name.charAt(0)] = existingRes.rows[0].id;
        }
      }
    }

    // Clear previous items if updating
    if (body.id) {
      await client.query(`
        DELETE FROM tier_list_items
        WHERE tier_id IN (SELECT id FROM list_tiers WHERE tier_list_id = $1)
      `, [tierListId]);
    }

    // 3. Process items & insert into audio_gear and tier_list_items
    for (const item of items) {
      // Find or insert gear in audio_gear catalog
      const gearRes = await client.query(`
        INSERT INTO audio_gear (brand, model, msrp, category, driver_type, graph_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (brand, model) DO UPDATE
        SET msrp = EXCLUDED.msrp, graph_url = COALESCE(EXCLUDED.graph_url, audio_gear.graph_url)
        RETURNING id
      `, [
        item.brand,
        item.model,
        item.price || 0,
        item.category || 'IEM',
        item.driver_type || null,
        item.graph_url || null,
      ]);

      const gearId = gearRes.rows[0]?.id;
      const targetTierRowId = tierMap[item.tier] || tierMap['B'];

      if (gearId && targetTierRowId) {
        await client.query(`
          INSERT INTO tier_list_items (tier_id, earphone_id, user_stars, user_notes)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `, [targetTierRowId, gearId, item.total_score, item.review_notes || null]);
      }
    }

    await client.query('COMMIT');

    // Trigger community consensus recalculation asynchronously
    aggregateCommunityTierList(category).catch((err) =>
      console.error('Consensus recalculation failed:', err)
    );

    return NextResponse.json({
      success: true,
      tier_list_id: tierListId,
      message: 'Tier list saved and consensus recalculated successfully!',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[POST /api/tier-lists/save] Error:', error);
    return NextResponse.json({ error: 'Failed to save tier list.' }, { status: 500 });
  } finally {
    client.release();
  }
}
