import Link from 'next/link';
import { getAllCommunities } from '@/lib/reddit-queries';
import { aggregateCommunityTierList } from '@/lib/aggregate-tier-list';
import pool from '@/lib/db';
import { Plus, Trophy, BarChart2, ArrowRight, Users, Layers } from 'lucide-react';

export const revalidate = 0;

export default async function TierListsHubPage() {
  const communities = await getAllCommunities();

  const audiophileConsensus = await aggregateCommunityTierList('audiophile');
  const iemConsensus = await aggregateCommunityTierList('iem');

  const userListsRes = await pool.query(`
    SELECT 
      tl.id,
      tl.title,
      tl.description,
      tl.category,
      tl.created_at,
      u.username AS author_name,
      u.avatar_url AS author_avatar,
      COUNT(tli.id)::INTEGER AS item_count
    FROM tier_lists tl
    JOIN users u ON tl.user_id = u.id
    LEFT JOIN list_tiers lt ON lt.tier_list_id = tl.id
    LEFT JOIN tier_list_items tli ON tli.tier_id = lt.id
    WHERE tl.is_public = TRUE
    GROUP BY tl.id, u.username, u.avatar_url
    ORDER BY tl.created_at DESC
    LIMIT 12
  `);

  const userLists = userListsRes.rows;

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans">

      {/* ── HERO BANNER ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#eaefec] rounded-2xl p-6 sm:p-10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e6f7f0] border border-[#a7f3d0] text-[#059669] text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            CROWDSOURCED AUDIO RANKINGS
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
            Audiophile Tier List Hub
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Explore live community consensus gear ratings, multi-variable sound scores, and create your own interactive tier lists with automated Squiglink graph metadata.
          </p>
        </div>

        <Link
          href="/tier-lists/new"
          className="flex-shrink-0 flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-white font-extrabold text-sm px-6 py-3.5 rounded-full shadow-sm transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Create New Tier List
        </Link>
      </div>

      {/* ── SECTION 1: COMMUNITY CONSENSUS RANKINGS ──────────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-center justify-between border-b border-[#eaefec] pb-3">
          <div>
            <h2 className="text-xl font-extrabold text-[#111827] flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#10b981]" />
              Community Consensus Rankings
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Mathematically averaged sound ratings submitted across subreddits
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Consensus Card 1: r/audiophile */}
          <div className="bg-white border border-[#eaefec] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e6f7f0] text-[#10b981] flex items-center justify-center font-extrabold text-sm border border-[#a7f3d0]">
                  r/
                </div>
                <div>
                  <h3 className="font-extrabold text-[#111827] text-sm">r/audiophile Flagship Rankings</h3>
                  <span className="text-[11px] font-medium text-gray-500">
                    {audiophileConsensus.total_ratings} total ratings &bull; Live Consensus
                  </span>
                </div>
              </div>
              <Link
                href="/r/audiophile"
                className="text-xs font-bold text-[#10b981] hover:text-[#059669] flex items-center gap-1 transition-colors"
              >
                View Community <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2">
              {audiophileConsensus.rankings.slice(0, 4).map((item, idx) => (
                <div
                  key={item.gear_id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#f8faf9] border border-[#eaefec] text-xs hover:border-[#10b981] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-400 w-4 text-center">#{idx + 1}</span>
                    <div>
                      <span className="font-bold text-[#111827] block">{item.brand} {item.model}</span>
                      <span className="text-[10px] text-gray-500">${item.price} &bull; {item.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#e6f7f0] text-[#059669] font-bold text-xs border border-[#a7f3d0]">
                      {item.total_score.toFixed(1)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#111827] text-white font-black text-xs">
                      {item.tier}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Consensus Card 2: r/iem */}
          <div className="bg-white border border-[#eaefec] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-sm border border-blue-200">
                  r/
                </div>
                <div>
                  <h3 className="font-extrabold text-[#111827] text-sm">r/iem In-Ear Rankings</h3>
                  <span className="text-[11px] font-medium text-gray-500">
                    {iemConsensus.total_ratings} total ratings &bull; Live Consensus
                  </span>
                </div>
              </div>
              <Link
                href="/r/iem"
                className="text-xs font-bold text-[#10b981] hover:text-[#059669] flex items-center gap-1 transition-colors"
              >
                View Community <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2">
              {iemConsensus.rankings.slice(0, 4).map((item, idx) => (
                <div
                  key={item.gear_id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#f8faf9] border border-[#eaefec] text-xs hover:border-[#10b981] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-400 w-4 text-center">#{idx + 1}</span>
                    <div>
                      <span className="font-bold text-[#111827] block">{item.brand} {item.model}</span>
                      <span className="text-[10px] text-gray-500">${item.price} &bull; {item.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#e6f7f0] text-[#059669] font-bold text-xs border border-[#a7f3d0]">
                      {item.total_score.toFixed(1)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#111827] text-white font-black text-xs">
                      {item.tier}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: USER TIER LISTS FEED ──────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-center justify-between border-b border-[#eaefec] pb-3">
          <div>
            <h2 className="text-xl font-extrabold text-[#111827] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#10b981]" />
              Community Member Tier Lists
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Personal rankings and review matrix lists submitted by community members
            </p>
          </div>

          <Link
            href="/tier-lists/new"
            className="flex items-center gap-1.5 text-xs font-bold text-[#10b981] hover:text-[#059669] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Your List
          </Link>
        </div>

        {userLists.length === 0 ? (
          <div className="bg-white border border-[#eaefec] rounded-2xl p-12 text-center shadow-sm">
            <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-4 font-medium">No tier lists yet. Be the first to create one!</p>
            <Link
              href="/tier-lists/new"
              className="inline-flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-5 py-2.5 rounded-full transition-all duration-200"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Tier List
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {userLists.map((list: any) => (
              <Link
                key={list.id}
                href={`/tier-list/${list.id}`}
                className="group bg-white border border-[#eaefec] hover:border-[#10b981] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-[#e6f7f0] text-[#059669] border border-[#a7f3d0]">
                      {list.category || 'Audiophile'}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {new Date(list.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm text-[#111827] group-hover:text-[#10b981] transition-colors line-clamp-2 mb-1.5">
                    {list.title}
                  </h3>

                  <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                    {list.description || 'Custom user audio gear ranking list.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#eaefec] text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#10b981] flex items-center justify-center text-white font-extrabold text-[10px]">
                      {list.author_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-gray-700 font-bold">{list.author_name}</span>
                  </div>

                  <span className="text-gray-500 bg-[#f8faf9] border border-[#eaefec] px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                    <Layers className="w-3 h-3 text-gray-400" />
                    {list.item_count} items
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
