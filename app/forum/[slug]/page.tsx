/**
 * app/forum/[slug]/page.tsx
 * =============================================================
 * Page: /forum/:slug  —  Thread Listing (Category View)
 * =============================================================
 * Styled with high-contrast Tailwind CSS dark mode.
 * Styled thread rows, pinned/locked badges, author cards, pagination.
 * =============================================================
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategoryBySlug, getThreadsByCategory } from '@/lib/forum-queries';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return { title: 'Category Not Found — HBB Forum' };
  }

  return {
    title: `${category.name} — HBB Audiophile Forum`,
    description: category.description ?? `Browse ${category.name} threads on the HBB audiophile community forum.`,
  };
}

export default async function CategoryThreadListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;

  const page = parseInt(pageStr || '1', 10) || 1;
  const LIMIT = 20;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const { data: threads, total, totalPages } = await getThreadsByCategory(
    category.id,
    page,
    LIMIT
  );

  return (
    <main className="space-y-8">

      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="text-xs font-mono text-zinc-400">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/forum" className="hover:text-zinc-200 transition-colors">
              Forum
            </Link>
          </li>
          <li className="text-zinc-600">&gt;</li>
          <li aria-current="page" className="text-amber-400 font-semibold">
            {category.name}
          </li>
        </ol>
      </nav>


      {/* ── Category Header Card ───────────────────────────────────────────── */}
      <header className="rounded-3xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900/90 via-zinc-900/70 to-zinc-950 p-6 sm:p-8 shadow-xl shadow-black/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
              /{category.slug}
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-100 tracking-tight">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-sm sm:text-base text-zinc-400 max-w-3xl leading-relaxed">
                {category.description}
              </p>
            )}
          </div>

          <Link
            href={`/forum/threads/new?category_id=${category.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold px-4 py-2.5 text-xs sm:text-sm shadow-lg shadow-amber-400/10 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Start a New Thread
          </Link>
        </div>

        {/* Stats summary bar */}
        <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <strong className="text-zinc-200">{total}</strong> total discussion{total !== 1 ? 's' : ''}
          </span>
          <span>
            Page <strong className="text-amber-400">{page}</strong> of <strong>{totalPages || 1}</strong>
          </span>
        </div>
      </header>


      {/* ── Thread Listing Section ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            Discussions
          </h2>
        </div>

        {threads.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400">
              💬
            </div>
            <p className="text-zinc-400 text-sm font-medium">
              No threads in this category yet. Be the first to post a review or question!
            </p>
            <Link
              href={`/forum/threads/new?category_id=${category.id}`}
              className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs px-4 py-2 rounded-xl"
            >
              Post First Thread
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {threads.map((thread) => (
              <li
                key={thread.id}
                className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900 hover:shadow-xl shadow-black/40"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                  {/* Left: Badges & Title */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {thread.is_pinned && (
                        <span className="inline-flex items-center gap-1 bg-amber-400/10 text-amber-300 border border-amber-400/30 text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full">
                          📌 Pinned
                        </span>
                      )}
                      {thread.is_locked && (
                        <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/30 text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full">
                          🔒 Locked
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-zinc-100 group-hover:text-amber-400 transition-colors leading-snug">
                      <Link href={`/forum/threads/${thread.id}`}>
                        {thread.title}
                      </Link>
                    </h3>

                    {/* Metadata line */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                        <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 text-amber-400 font-mono font-bold text-[10px] flex items-center justify-center">
                          {thread.author_username.charAt(0).toUpperCase()}
                        </span>
                        {thread.author_username}
                      </span>
                      <span>&bull;</span>
                      <span className="font-mono text-zinc-400">
                        Last active: {new Date(thread.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Right: Stats Counters */}
                  <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                    <div className="flex flex-col items-center bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl min-w-[70px]">
                      <span className="font-mono font-bold text-sm text-indigo-400">{thread.reply_count}</span>
                      <span className="text-[10px] font-mono uppercase text-indigo-300/70">Replies</span>
                    </div>

                    <div className="flex flex-col items-center bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl min-w-[70px]">
                      <span className="font-mono font-semibold text-sm text-zinc-300">{thread.view_count.toLocaleString()}</span>
                      <span className="text-[10px] font-mono uppercase text-zinc-500">Views</span>
                    </div>
                  </div>

                </div>
              </li>
            ))}
          </ul>
        )}
      </section>


      {/* ── Pagination Bar ─────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <nav aria-label="Thread list pagination" className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div>
            {page > 1 ? (
              <Link
                href={`/forum/${slug}?page=${page - 1}`}
                className="inline-flex items-center gap-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium px-4 py-2 transition-all border border-zinc-700/80"
              >
                &larr; Previous Page
              </Link>
            ) : (
              <span className="text-xs font-mono text-zinc-600 px-4 py-2 select-none">&larr; Previous Page</span>
            )}
          </div>

          <span className="text-xs font-mono text-zinc-400">
            Page <strong className="text-amber-400">{page}</strong> of <strong>{totalPages}</strong>
          </span>

          <div>
            {page < totalPages ? (
              <Link
                href={`/forum/${slug}?page=${page + 1}`}
                className="inline-flex items-center gap-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium px-4 py-2 transition-all border border-zinc-700/80"
              >
                Next Page &rarr;
              </Link>
            ) : (
              <span className="text-xs font-mono text-zinc-600 px-4 py-2 select-none">Next Page &rarr;</span>
            )}
          </div>
        </nav>
      )}


      {/* ── Footer Navigation ─────────────────────────────────────────────── */}
      <nav aria-label="Category navigation" className="pt-2">
        <Link
          href="/forum"
          className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-amber-400 transition-colors"
        >
          &larr; Return to Forum Board Index
        </Link>
      </nav>

    </main>
  );
}
