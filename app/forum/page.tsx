/**
 * app/forum/page.tsx
 * =============================================================
 * Page: /forum  —  Board Index (Forum Home)
 * =============================================================
 * Styled with modern high-contrast Tailwind CSS dark theme.
 * Sleek cards, category badges, stats indicators, and high-contrast CTAs.
 * =============================================================
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { getForumCategories } from '@/lib/forum-queries';

export const metadata: Metadata = {
  title: 'Forum — HBB Audiophile Community',
  description:
    'Browse the HBB audiophile community forum. Discuss IEMs, headphones, DACs, amps, measurements, and gear rankings with fellow enthusiasts.',
};

// Helper SVG icons for category cards
function getCategoryIcon(slug: string) {
  switch (slug) {
    case 'head-gear':
      return (
        <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
      );
    case 'sound-science':
      return (
        <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'marketplace':
      return (
        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      );
    default:
      return (
        <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
  }
}

export default async function ForumBoardIndexPage() {
  const categories = await getForumCategories();

  return (
    <main className="space-y-6 font-sans">

      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl bg-white p-6 sm:p-10 border border-[#eaefec] shadow-sm">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#a7f3d0] bg-[#e6f7f0] px-3.5 py-1 text-xs font-bold text-[#059669]">
            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
            Official Audiophile Forum Architecture
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#111827]">
            HBB Audiophile Community Forum
          </h1>

          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed font-normal">
            Discuss IEMs, over-ear headphones, DAC/amps, frequency response measurements, and community rankings. Select a section below to join the discussion.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/forum/threads/new"
              className="inline-flex items-center gap-2 rounded-full bg-[#10b981] hover:bg-[#059669] text-white font-bold px-5 py-2.5 text-xs shadow-sm transition-all duration-200 ease-in-out active:scale-95"
            >
              <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Start a New Thread
            </Link>

            <Link
              href="/tier-lists"
              className="inline-flex items-center gap-2 rounded-full bg-[#f3f5f4] hover:bg-[#e8ebea] text-[#111827] border border-gray-200 font-bold px-5 py-2.5 text-xs transition-all duration-200 ease-in-out"
            >
              Community Tier Lists
            </Link>
          </div>
        </div>
      </section>


      {/* ── Category Cards ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold tracking-tight text-[#111827] flex items-center gap-2">
            <span>📋</span> Board Index
          </h2>
          <span className="text-xs font-bold text-gray-400">
            {categories.length} Sections Available
          </span>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-2xl border border-[#eaefec] bg-white p-8 text-center text-gray-500">
            No forum categories have been created yet. Check back later.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((category) => (
              <div
                key={category.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-[#eaefec] bg-white p-6 transition-all duration-200 ease-in-out hover:border-[#10b981]/50 hover:shadow-md"
              >
                <div>
                  {/* Category Header */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f8faf9] border border-gray-200 shadow-xs text-[#10b981]">
                      {getCategoryIcon(category.slug)}
                    </div>
                    <span className="text-[11px] font-bold text-[#059669] bg-[#e6f7f0] border border-[#a7f3d0] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      /{category.slug}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-extrabold text-[#111827] group-hover:text-[#10b981] transition-colors mb-2">
                    <Link href={`/r/${category.slug}`} className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true" />
                      {category.name}
                    </Link>
                  </h3>

                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 mb-6 font-normal">
                    {category.description ?? 'General discussions and impressions.'}
                  </p>
                </div>

                {/* Footer Action */}
                <div className="pt-4 border-t border-[#eaefec] flex items-center justify-between text-xs text-gray-400 font-bold">
                  <span>Order: #{category.display_order}</span>
                  <span className="text-[#10b981] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Enter Board &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>


      {/* ── Quick Navigation Footer Bar ──────────────────────────────────── */}
      <nav aria-label="Forum navigation" className="rounded-2xl border border-[#eaefec] bg-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-[#10b981]" />
          <span className="text-xs sm:text-sm text-[#111827] font-bold">Ready to contribute to the community?</span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/forum/threads/new"
            className="flex-1 sm:flex-none text-center bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-5 py-2.5 rounded-full transition-all duration-200 ease-in-out shadow-sm active:scale-95"
          >
            Start a New Thread
          </Link>
          <Link
            href="/tier-lists"
            className="flex-1 sm:flex-none text-center bg-[#f3f5f4] hover:bg-[#e8ebea] text-[#111827] font-bold text-xs px-5 py-2.5 rounded-full border border-gray-200 transition-all duration-200 ease-in-out"
          >
            Browse Tier Lists
          </Link>
        </div>
      </nav>

    </main>
  );
}
