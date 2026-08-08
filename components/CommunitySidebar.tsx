'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Headphones, Radio, Zap, Volume2, TrendingUp, BarChart2, Check, Plus, ArrowRight } from 'lucide-react';
import KarmaGraphModal from './KarmaGraphModal';
import { useToast } from './Toast';

type CommunityDetail = {
  id?: number;
  name?: string;
  slug?: string;
  description?: string | null;
  banner_url?: string | null;
  icon_url?: string | null;
  member_count?: number;
};

type MiniGearItem = {
  gear_id: number;
  brand: string;
  model: string;
  price: number;
  total_score: number;
  tier: string;
};



export default function CommunitySidebar({ community }: { community?: CommunityDetail }) {
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [stats, setStats] = useState({ karma: 12400, view_count: 2400, upvotes: 418 });
  const [joinedSubs, setJoinedSubs] = useState<Record<string, boolean>>({});
  const [topRankings, setTopRankings] = useState<MiniGearItem[]>([]);
  const [loadingTierList, setLoadingTierList] = useState(true);
  const [isKarmaModalOpen, setIsKarmaModalOpen] = useState(false);
  const [popularCommunities, setPopularCommunities] = useState<CommunityDetail[]>([]);

  const activeSlug = community?.slug || 'audiophile';

  // Fetch real User Stats from /api/user/stats
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/user/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.warn('Failed to load user stats:', err);
      }
    }
    loadStats();
  }, [session]);

  // Fetch Popular Communities
  useEffect(() => {
    async function loadPopular() {
      try {
        const res = await fetch('/api/communities/popular');
        if (res.ok) {
          const data = await res.json();
          setPopularCommunities(data);
        }
      } catch (err) {
        console.warn('Failed to load popular communities:', err);
      }
    }
    loadPopular();
  }, []);

  // Fetch Top 3 Tier List Leaderboard from consensus API
  useEffect(() => {
    async function loadConsensus() {
      setLoadingTierList(true);
      try {
        const res = await fetch(`/api/tier-lists/consensus?community=${activeSlug}`);
        if (res.ok) {
          const data = await res.json();
          if (data.rankings) {
            setTopRankings(data.rankings.slice(0, 3));
          }
        }
      } catch (err) {
        console.warn('Failed to load tier list consensus:', err);
      } finally {
        setLoadingTierList(false);
      }
    }
    loadConsensus();
  }, [activeSlug]);

  const toggleJoinSub = (name: string) => {
    const isNowJoined = !joinedSubs[name];
    setJoinedSubs((prev) => ({ ...prev, [name]: isNowJoined }));
    showToast(isNowJoined ? `Joined ${name}` : `Left ${name}`, isNowJoined ? 'success' : 'info');
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  return (
    <aside className="w-full lg:w-80 flex-shrink-0 space-y-4 font-sans lg:sticky lg:top-20">
      {/* "Your Daily Stats" Card */}
      <div className="bg-white border border-[#eaefec] rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5 text-[#10b981]" />
          <span>Your Daily Stats</span>
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {/* Views Box */}
          <div className="bg-[#f8faf9] border border-gray-100 rounded-xl p-3.5 space-y-0.5">
            <span className="text-[11px] text-gray-400 font-medium block">Views</span>
            <span className="text-xl font-black text-[#111827] font-sans block">
              {formatNumber(stats.view_count)}
            </span>
          </div>

          {/* Upvotes Box */}
          <div className="bg-[#e6f7f0] border border-[#a7f3d0] rounded-xl p-3.5 space-y-0.5">
            <span className="text-[11px] text-[#059669] font-semibold block">Upvotes</span>
            <span className="text-xl font-black text-[#10b981] font-sans block">
              +{stats.upvotes}
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsKarmaModalOpen(true)}
          className="w-full bg-[#f3f5f4] hover:bg-[#e8ebea] text-[#111827] font-bold text-xs py-2.5 rounded-xl transition-all duration-200 ease-in-out text-center block cursor-pointer active:scale-98"
        >
          View Karma Graph
        </button>
      </div>

      {/* "Popular Communities" Card */}
      <div className="bg-white border border-[#eaefec] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#111827]">
            Popular Communities
          </h3>
          <Link href="/r/all" className="text-xs text-[#10b981] font-bold hover:underline transition-all duration-200 ease-in-out">
            View All
          </Link>
        </div>

        <div className="space-y-0.5">
          {popularCommunities.map((c) => {
            const joined = !!joinedSubs[c.name || ''];
            return (
              <div key={c.slug} className="flex items-center justify-between px-3 py-2.5 -mx-3 rounded-xl hover:bg-gray-50 transition-colors">
                <Link href={`/r/${c.slug}`} className="flex items-center gap-3 group flex-1">
                  <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-xs text-gray-500 overflow-hidden">
                    {c.icon_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={c.icon_url} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="uppercase">{c.name?.replace('r/', '').charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-[#111827] block group-hover:text-[#10b981] transition-colors">
                      {c.name}
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal">
                      {formatNumber(c.member_count || 1)} members
                    </span>
                  </div>
                </Link>

                <button
                  onClick={() => toggleJoinSub(c.name || '')}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                    joined
                      ? 'bg-[#e6f7f0] text-[#10b981]'
                      : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {joined ? 'Joined' : 'Join'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <KarmaGraphModal
        isOpen={isKarmaModalOpen}
        onClose={() => setIsKarmaModalOpen(false)}
        karma={stats.karma}
      />

      {/* Light Mode Tier List Consensus Widget ("Crowdsourced Community Tier List") */}
      <div className="bg-white border border-[#eaefec] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="bg-[#e6f7f0] text-[#059669] border border-[#a7f3d0] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Consensus Matrix
            </span>
            <h3 className="text-sm font-bold text-[#111827] mt-1">
              Crowdsourced Tier List
            </h3>
          </div>
          <span className="text-[10px] text-gray-400 font-bold">r/{activeSlug}</span>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed font-sans">
          Top community-rated gear aggregated live from user tier placements:
        </p>

        {/* Top 3 Leaderboard Items */}
        <div className="space-y-2.5">
          {loadingTierList ? (
            <div className="space-y-2 py-2">
              <div className="h-10 bg-[#f8faf9] rounded-xl animate-pulse" />
              <div className="h-10 bg-[#f8faf9] rounded-xl animate-pulse" />
              <div className="h-10 bg-[#f8faf9] rounded-xl animate-pulse" />
            </div>
          ) : (
            topRankings.map((item, idx) => (
              <div
                key={item.gear_id || idx}
                className="bg-[#f8faf9] border border-gray-200 hover:border-[#10b981] p-3 rounded-xl flex items-center justify-between transition-all duration-200 ease-in-out group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shadow-xs ${
                      item.tier === 'S'
                        ? 'bg-[#e6f7f0] text-[#059669] border border-[#a7f3d0]'
                        : item.tier === 'A'
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.tier || 'S'}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-[#111827] block group-hover:text-[#10b981] transition-colors">
                      {item.brand} {item.model}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      ${item.price} &bull; Score {item.total_score}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-bold text-[#059669] bg-[#e6f7f0] px-2 py-0.5 rounded-full border border-[#a7f3d0]">
                  #{idx + 1}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Master Grid Routing Button */}
        <Link
          href="/tier-lists"
          className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs py-2.5 rounded-full transition-all duration-200 ease-in-out flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
        >
          <span>Master Grid</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>

      {/* Community Details Card (if visiting sub) */}
      {community && community.slug && (
        <div className="bg-white border border-[#eaefec] rounded-2xl p-5 shadow-sm space-y-2">
          <h3 className="text-xs font-bold text-[#111827]">r/{community.slug} Details</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            {community.description || 'Official community hub & gear rankings.'}
          </p>
          <div className="text-xs font-bold text-[#10b981]">
            {(community.member_count || 1200).toLocaleString()} members
          </div>
        </div>
      )}
    </aside>
  );
}
