import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublicTierLists } from '@/lib/forum-queries';
import { Plus, Layers, BarChart2, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Community Tier Lists — audiothread',
  description: 'Browse public user-created gear rankings and IEM/headphone tier lists from the community.',
};

export default async function CommunityTierListsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const { page: pageStr, category } = await searchParams;
  const page = parseInt(pageStr || '1', 10) || 1;
  const LIMIT = 20;

  const { data: tierLists, total, totalPages } = await getPublicTierLists(
    page,
    LIMIT,
    category || null
  );

  const CATEGORY_FILTERS = ['IEM', 'Over-Ear', 'DAC/Amp', 'Cables', 'General'];

  return (
    <main className="space-y-6 font-sans">

      {/* ── Breadcrumb ────────────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="text-xs font-medium text-gray-400">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/r" className="hover:text-[#10b981] transition-colors">Home</Link>
          </li>
          <li className="text-gray-300">&gt;</li>
          <li aria-current="page" className="text-[#10b981] font-bold">
            Community Tier Lists
          </li>
        </ol>
      </nav>

      {/* ── Header Banner ──────────────────────────────────────────────────────── */}
      <header className="bg-white border border-[#eaefec] rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#059669] bg-[#e6f7f0] border border-[#a7f3d0] px-3 py-1 rounded-full uppercase tracking-wide">
              <BarChart2 className="w-3.5 h-3.5" />
              Gear Rankings Feed
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
              Community Tier Lists
            </h1>
            <p className="text-sm text-gray-500 max-w-2xl leading-relaxed">
              Explore custom gear rankings created by community members. Filter by category or create your own ranking list.
            </p>
          </div>

          <Link
            href="/tier-lists/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#10b981] hover:bg-[#059669] text-white font-extrabold px-5 py-2.5 text-sm shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Create Tier List
          </Link>
        </div>

        {/* Category Filter Pills */}
        <div className="pt-4 border-t border-[#eaefec] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 font-medium">Filter:</span>
            <Link
              href="/community/tier-lists"
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${
                !category
                  ? 'bg-[#e6f7f0] text-[#10b981] border-[#a7f3d0]'
                  : 'bg-[#f8faf9] border-[#eaefec] text-gray-600 hover:text-[#111827] hover:border-gray-300'
              }`}
            >
              All
            </Link>
            {CATEGORY_FILTERS.map((cat) => (
              <Link
                key={cat}
                href={`/community/tier-lists?category=${cat}`}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${
                  category === cat
                    ? 'bg-[#e6f7f0] text-[#10b981] border-[#a7f3d0]'
                    : 'bg-[#f8faf9] border-[#eaefec] text-gray-600 hover:text-[#111827] hover:border-gray-300'
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
          <span className="text-xs text-gray-400 font-medium">
            Total: <strong className="text-[#111827]">{total}</strong> list{total !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      {/* ── Feed Grid ──────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        {tierLists.length === 0 ? (
          <div className="bg-white border border-[#eaefec] rounded-2xl p-12 text-center shadow-sm space-y-4">
            <Layers className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-gray-500 text-sm font-medium">
              No public tier lists found{category ? ` in category "${category}"` : ''}.
            </p>
            <Link
              href="/tier-lists/new"
              className="inline-flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-5 py-2.5 rounded-full transition-all duration-200"
            >
              <Plus className="w-3.5 h-3.5" />
              Build the First Tier List
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tierLists.map((list) => (
              <div
                key={list.id}
                className="group flex flex-col justify-between bg-white border border-[#eaefec] hover:border-[#10b981] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-extrabold text-[#059669] bg-[#e6f7f0] border border-[#a7f3d0] px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      {list.category || 'General'}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {new Date(list.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-[#111827] group-hover:text-[#10b981] transition-colors mb-1.5 line-clamp-2">
                    <Link href={`/tier-list/${list.id}`}>
                      {list.title}
                    </Link>
                  </h3>

                  <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-4">
                    {list.description || 'Custom audio gear rankings.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#eaefec] flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-700 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#10b981] text-white font-extrabold text-[10px] flex items-center justify-center flex-shrink-0">
                      {list.author_username.charAt(0).toUpperCase()}
                    </span>
                    {list.author_username}
                  </span>

                  <Link
                    href={`/tier-list/${list.id}`}
                    className="font-bold text-[#10b981] hover:text-[#059669] flex items-center gap-1 transition-colors"
                  >
                    View <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Pagination ──────────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <nav
          aria-label="Tier list pagination"
          className="flex items-center justify-between bg-white border border-[#eaefec] rounded-2xl p-4 shadow-sm"
        >
          {page > 1 ? (
            <Link
              href={`/community/tier-lists?page=${page - 1}${category ? `&category=${category}` : ''}`}
              className="rounded-full bg-[#f3f5f4] hover:bg-[#e8ebea] text-[#111827] text-xs font-bold px-4 py-2 border border-[#eaefec] transition-colors"
            >
              &larr; Previous
            </Link>
          ) : <span />}

          <span className="text-xs font-medium text-gray-500">
            Page <strong className="text-[#111827]">{page}</strong> of <strong className="text-[#111827]">{totalPages}</strong>
          </span>

          {page < totalPages ? (
            <Link
              href={`/community/tier-lists?page=${page + 1}${category ? `&category=${category}` : ''}`}
              className="rounded-full bg-[#f3f5f4] hover:bg-[#e8ebea] text-[#111827] text-xs font-bold px-4 py-2 border border-[#eaefec] transition-colors"
            >
              Next &rarr;
            </Link>
          ) : <span />}
        </nav>
      )}

    </main>
  );
}
