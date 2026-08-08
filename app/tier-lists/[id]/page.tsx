import { notFound } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import ImageWithLightbox from '@/components/ImageWithLightbox';

export const revalidate = 0;

export default async function TierListDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const listId = parseInt(id, 10);

  if (isNaN(listId)) {
    notFound();
  }

  // Fetch tier list metadata & author details
  const listRes = await pool.query(`
    SELECT 
      tl.id,
      tl.title,
      tl.description,
      tl.category,
      tl.created_at,
      u.username AS author_name,
      u.avatar_url AS author_avatar
    FROM tier_lists tl
    JOIN users u ON tl.user_id = u.id
    WHERE tl.id = $1
  `, [listId]);

  const tierList = listRes.rows[0];
  if (!tierList) {
    notFound();
  }

  // Fetch tier rows & placed gear items
  const itemsRes = await pool.query(`
    SELECT 
      tli.id,
      tli.user_stars,
      tli.user_notes,
      lt.name AS tier_name,
      lt.color_hex AS tier_color,
      lt.rank_order,
      ag.brand,
      ag.model,
      ag.msrp AS price,
      ag.category,
      ag.driver_type,
      ag.graph_url
    FROM tier_list_items tli
    JOIN list_tiers lt ON tli.tier_id = lt.id
    JOIN audio_gear ag ON tli.earphone_id = ag.id
    WHERE lt.tier_list_id = $1
    ORDER BY lt.rank_order ASC, tli.user_stars DESC NULLS LAST
  `, [listId]);

  const items = itemsRes.rows;

  // Group items by tier name
  const grouped: Record<string, typeof items> = {};
  items.forEach((item: any) => {
    const key = item.tier_name || 'B-Tier';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header Breadcrumb */}
      <nav className="text-xs font-mono text-zinc-400">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/tier-lists" className="hover:text-zinc-200 transition-colors">
              Tier Lists
            </Link>
          </li>
          <li className="text-zinc-600">&gt;</li>
          <li className="text-amber-400 font-bold">{tierList.title}</li>
        </ol>
      </nav>

      {/* Main Header Card */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <span className="px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 font-bold uppercase">
            {tierList.category || 'Audiophile'}
          </span>
          <span className="text-zinc-500">
            Created on {new Date(tierList.created_at).toLocaleDateString()}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-100">{tierList.title}</h1>

        <p className="text-sm text-zinc-300 leading-relaxed font-sans max-w-3xl">
          {tierList.description || 'Custom audio gear power rankings.'}
        </p>

        <div className="flex items-center gap-3 pt-2 border-t border-zinc-800/80 text-xs font-mono">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 font-black">
            {tierList.author_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="text-zinc-200 font-bold block">{tierList.author_name}</span>
            <span className="text-zinc-500 text-[10px]">Tier List Author</span>
          </div>
        </div>
      </div>

      {/* Tier Rows Display */}
      <div className="space-y-6">
        {Object.keys(grouped).length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-zinc-500 bg-zinc-900/90 border border-zinc-800 rounded-2xl">
            No items recorded in this tier list yet.
          </div>
        ) : (
          Object.entries(grouped).map(([tierName, tierItems]) => (
            <div
              key={tierName}
              className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
                <span className="px-3 py-1 rounded-xl bg-amber-400 text-zinc-950 font-black text-xs font-mono">
                  {tierName}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  {tierItems.length} earphone{tierItems.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tierItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-zinc-100">
                          {item.brand} {item.model}
                        </h4>
                        <span className="text-[10px] font-mono text-zinc-500">
                          ${item.price} &bull; {item.driver_type || item.category}
                        </span>
                      </div>
                      {item.user_stars && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/30">
                          {Number(item.user_stars).toFixed(1)}
                        </span>
                      )}
                    </div>

                    {item.user_notes && (
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/50">
                        {item.user_notes}
                      </p>
                    )}

                    {item.graph_url && (
                      <ImageWithLightbox
                        src={item.graph_url}
                        alt={`${item.model} graph`}
                        caption="Squiglink Frequency Response"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
