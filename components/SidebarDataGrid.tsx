'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

export type GearItem = {
  id: string | number;
  rank: number;
  brand: string;
  model: string;
  price: number;
  overallScore: number;
  tonality: number;
  technicality: number;
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
};

const DEFAULT_FALLBACK_GEAR: Record<string, GearItem[]> = {
  audiophile: [
    { id: '1', rank: 1, brand: '64 Audio', model: 'U12t', price: 2000, overallScore: 9.6, tonality: 9.5, technicality: 9.6, tier: 'S' },
    { id: '2', rank: 2, brand: 'Sennheiser', model: 'HD 800 S', price: 1800, overallScore: 9.4, tonality: 9.3, technicality: 9.5, tier: 'S' },
    { id: '3', rank: 3, brand: 'Empire Ears', model: 'Odin', price: 3400, overallScore: 9.2, tonality: 9.0, technicality: 9.4, tier: 'A' },
  ],
  iem: [
    { id: '1', rank: 1, brand: 'Moondrop', model: 'Variations', price: 520, overallScore: 9.2, tonality: 9.4, technicality: 9.0, tier: 'S' },
    { id: '2', rank: 2, brand: 'Thieaudio', model: 'Monarch MkIII', price: 1000, overallScore: 9.1, tonality: 9.1, technicality: 9.2, tier: 'S' },
    { id: '3', rank: 3, brand: 'DUNU', model: 'SA6 MkII', price: 579, overallScore: 8.8, tonality: 8.9, technicality: 8.7, tier: 'A' },
  ],
  budgettier: [
    { id: '1', rank: 1, brand: 'Tangzu', model: 'Wan\'er S.G', price: 20, overallScore: 8.6, tonality: 8.8, technicality: 8.2, tier: 'S' },
    { id: '2', rank: 2, brand: '7Hz', model: 'Salnotes Zero 2', price: 25, overallScore: 8.4, tonality: 8.5, technicality: 8.1, tier: 'A' },
    { id: '3', rank: 3, brand: 'Moondrop', model: 'Aria 2', price: 80, overallScore: 8.3, tonality: 8.4, technicality: 8.2, tier: 'A' },
  ],
};

export default function SidebarDataGrid({ communitySlug, communityName }: { communitySlug: string; communityName: string }) {
  const [search, setSearch] = useState('');
  const [gearList, setGearList] = useState<GearItem[]>(
    DEFAULT_FALLBACK_GEAR[communitySlug] || DEFAULT_FALLBACK_GEAR.audiophile
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchConsensus() {
      setLoading(true);
      try {
        const res = await fetch(`/api/communities/${communitySlug}/tier-list`);
        if (res.ok) {
          const data = await res.json();
          if (data.rankings && data.rankings.length > 0 && isMounted) {
            const mapped: GearItem[] = data.rankings.map((r: any, idx: number) => ({
              id: r.gear_id || `g-${idx}`,
              rank: idx + 1,
              brand: r.brand,
              model: r.model,
              price: r.price,
              overallScore: r.total_score,
              tonality: r.avg_tonality,
              technicality: r.avg_technicality,
              tier: r.tier,
            }));
            setGearList(mapped);
          }
        }
      } catch (err) {
        console.error('Failed to fetch consensus tier list:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchConsensus();
    return () => {
      isMounted = false;
    };
  }, [communitySlug]);

  const filteredGear = useMemo(() => {
    if (!search.trim()) return gearList;
    const term = search.toLowerCase();
    return gearList.filter(
      (item) =>
        item.brand.toLowerCase().includes(term) ||
        item.model.toLowerCase().includes(term)
    );
  }, [gearList, search]);

  const getHeatmapBg = (score: number) => {
    if (score >= 9.0) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-black';
    if (score >= 8.5) return 'bg-amber-400/20 text-amber-300 border-amber-400/40 font-bold';
    if (score >= 8.0) return 'bg-orange-500/20 text-orange-400 border-orange-500/40 font-semibold';
    return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'S': return 'bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black';
      case 'A': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold';
      case 'B': return 'bg-blue-500/20 text-blue-400 border border-blue-500/40 font-semibold';
      case 'C': return 'bg-purple-500/20 text-purple-400 border border-purple-500/40';
      case 'D': return 'bg-red-500/20 text-red-400 border border-red-500/40';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 shadow-xl space-y-3">
      {/* Widget Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-bold">
            Crowdsourced Community Tier List
          </h3>
        </div>
        <Link
          href="/grid"
          className="text-[10px] font-mono text-amber-400 hover:text-amber-300 hover:underline"
        >
          Master Grid &rarr;
        </Link>
      </div>

      <p className="text-[11px] text-zinc-400 leading-snug">
        Dynamically averaged user ratings for <span className="text-zinc-200 font-semibold">{communityName}</span>.
      </p>

      {/* Quick Filter Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Filter model or brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-950 text-xs text-zinc-200 placeholder-zinc-500 rounded-xl px-3 py-1.5 border border-zinc-800 focus:outline-none focus:border-amber-400/80 font-mono"
        />
        {loading && (
          <div className="absolute right-2 top-2 w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Embedded Data Grid Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/80 text-[10px] font-mono uppercase text-zinc-400">
              <th className="py-2 px-2 text-center w-8">#</th>
              <th className="py-2 px-2">Gear Model</th>
              <th className="py-2 px-2 text-center w-12">Price</th>
              <th className="py-2 px-2 text-center w-12">Score</th>
              <th className="py-2 px-2 text-center w-8">Tier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 text-xs">
            {filteredGear.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors group">
                {/* Rank */}
                <td className="py-2 px-2 text-center font-mono font-bold text-zinc-500 group-hover:text-amber-400">
                  {item.rank}
                </td>

                {/* Model & Brand */}
                <td className="py-2 px-2">
                  <div className="font-semibold text-zinc-200 group-hover:text-amber-300 transition-colors truncate max-w-[110px]">
                    {item.model}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400 truncate max-w-[110px]">
                    {item.brand}
                  </div>
                </td>

                {/* Price */}
                <td className="py-2 px-2 text-center font-mono text-[11px] text-zinc-400">
                  ${item.price}
                </td>

                {/* Heatmap Score Cell */}
                <td className="py-2 px-2 text-center">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-mono border ${getHeatmapBg(
                      item.overallScore
                    )}`}
                  >
                    {item.overallScore.toFixed(1)}
                  </span>
                </td>

                {/* Tier Badge */}
                <td className="py-2 px-2 text-center">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono ${getTierBadge(item.tier)}`}>
                    {item.tier}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Link */}
      <div className="pt-1 text-center">
        <Link
          href="/grid"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 px-3.5 py-1.5 rounded-xl shadow-md transition-all w-full justify-center"
        >
          <span>📊 Open Full Algorithmic Data Grid</span>
        </Link>
      </div>
    </div>
  );
}
