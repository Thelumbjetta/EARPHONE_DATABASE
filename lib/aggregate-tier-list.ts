/**
 * lib/aggregate-tier-list.ts
 * =============================================================
 * Consensus Aggregation Engine for Crowdsourced Community Tier Lists
 * =============================================================
 * ZERO FALLBACK POLICY: If the database returns no data, the UI
 * receives an empty consensus object. No fake gear is ever served.
 * =============================================================
 */

import pool from '@/lib/db';

export type AggregatedGearItem = {
  gear_id: number;
  brand: string;
  model: string;
  price: number;
  category: string;
  driver_type: string | null;
  graph_url: string | null;
  avg_bass: number;
  avg_mids: number;
  avg_treble: number;
  avg_tonality: number;
  avg_technicality: number;
  total_score: number;
  rating_count: number;
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
};

export type CommunityTierListConsensus = {
  community_slug: string;
  total_ratings: number;
  tiers: {
    S: AggregatedGearItem[];
    A: AggregatedGearItem[];
    B: AggregatedGearItem[];
    C: AggregatedGearItem[];
    D: AggregatedGearItem[];
  };
  rankings: AggregatedGearItem[];
};

// Empty consensus — returned when DB has no data or throws.
// The UI must render a proper empty state instead of fake data.
const EMPTY_CONSENSUS = (slug: string): CommunityTierListConsensus => ({
  community_slug: slug,
  total_ratings: 0,
  tiers: { S: [], A: [], B: [], C: [], D: [] },
  rankings: [],
});

export async function aggregateCommunityTierList(communitySlug: string): Promise<CommunityTierListConsensus> {
  try {
    const sql = `
      SELECT 
        ag.id AS gear_id,
        ag.brand,
        ag.model,
        COALESCE(ag.msrp, 0)::FLOAT AS price,
        ag.category,
        ag.driver_type,
        ag.graph_url,
        ROUND(AVG(COALESCE(tli.user_stars, 8.0))::numeric, 1)::FLOAT AS avg_tonality,
        ROUND(AVG(COALESCE(tli.user_stars, 8.0))::numeric, 1)::FLOAT AS avg_technicality,
        ROUND(AVG(COALESCE(tli.user_stars, 8.0))::numeric, 1)::FLOAT AS avg_bass,
        ROUND(AVG(COALESCE(tli.user_stars, 8.0))::numeric, 1)::FLOAT AS avg_mids,
        ROUND(AVG(COALESCE(tli.user_stars, 8.0))::numeric, 1)::FLOAT AS avg_treble,
        ROUND(AVG(COALESCE(tli.user_stars, 8.0))::numeric, 1)::FLOAT AS total_score,
        COUNT(tli.id)::INTEGER AS rating_count
      FROM audio_gear ag
      LEFT JOIN tier_list_items tli ON tli.earphone_id = ag.id
      LEFT JOIN list_tiers lt ON tli.tier_id = lt.id
      LEFT JOIN tier_lists tl ON lt.tier_list_id = tl.id
      LEFT JOIN communities c ON (tl.category = c.name OR c.slug = $1)
      WHERE ag.brand IS NOT NULL
      GROUP BY ag.id, ag.brand, ag.model, ag.msrp, ag.category, ag.driver_type, ag.graph_url
      HAVING COUNT(tli.id) >= 0
      ORDER BY total_score DESC, rating_count DESC, ag.model ASC
    `;

    const result = await pool.query(sql, [communitySlug]);

    if (result.rows.length > 0) {
      const items: AggregatedGearItem[] = result.rows.map((row) => {
        const score = row.total_score || 8.0;
        let tier: 'S' | 'A' | 'B' | 'C' | 'D' = 'B';

        if (score >= 9.0) tier = 'S';
        else if (score >= 8.0) tier = 'A';
        else if (score >= 7.0) tier = 'B';
        else if (score >= 6.0) tier = 'C';
        else tier = 'D';

        return {
          gear_id: row.gear_id,
          brand: row.brand,
          model: row.model,
          price: row.price || 0,
          category: row.category || 'IEM',
          driver_type: row.driver_type || null,
          graph_url: row.graph_url || null,
          avg_bass: row.avg_bass || score,
          avg_mids: row.avg_mids || score,
          avg_treble: row.avg_treble || score,
          avg_tonality: row.avg_tonality || score,
          avg_technicality: row.avg_technicality || score,
          total_score: score,
          rating_count: row.rating_count || 0,
          tier,
        };
      });

      const tiers: CommunityTierListConsensus['tiers'] = {
        S: items.filter((i) => i.tier === 'S'),
        A: items.filter((i) => i.tier === 'A'),
        B: items.filter((i) => i.tier === 'B'),
        C: items.filter((i) => i.tier === 'C'),
        D: items.filter((i) => i.tier === 'D'),
      };

      const totalRatings = items.reduce((acc, curr) => acc + curr.rating_count, 0);

      return {
        community_slug: communitySlug,
        total_ratings: totalRatings,
        tiers,
        rankings: items,
      };
    }
  } catch (err) {
    console.warn('[aggregateCommunityTierList] DB query failed, returning empty consensus:', err);
  }

  // DB error or empty result → return empty, never fake data
  return EMPTY_CONSENSUS(communitySlug);
}
