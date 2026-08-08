/**
 * app/forum/threads/[id]/page.tsx
 * =============================================================
 * Page: /forum/threads/:id  —  Thread View
 * =============================================================
 * Styled with high-contrast Tailwind CSS dark theme.
 * OP card, reply message bubbles, interactive image lightboxes,
 * drag-and-drop file upload, and NextAuth session integration.
 * =============================================================
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getThreadById, getCommentsByThread } from '@/lib/forum-queries';
import ImageWithLightbox from '@/components/ImageWithLightbox';
import ThreadReplyForm from '@/components/ThreadReplyForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const threadId = parseInt(id, 10);
  if (isNaN(threadId)) return { title: 'Thread Not Found' };

  const thread = await getThreadById(threadId);
  if (!thread) return { title: 'Thread Not Found — HBB Forum' };

  return {
    title: `${thread.title} — HBB Forum`,
    description: `${thread.body.substring(0, 155)}...`,
  };
}

export default async function ThreadViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageStr } = await searchParams;

  const threadId = parseInt(id, 10);
  if (isNaN(threadId)) notFound();

  const page = parseInt(pageStr || '1', 10) || 1;
  const COMMENT_LIMIT = 50;

  const [thread, commentsResult] = await Promise.all([
    getThreadById(threadId),
    getCommentsByThread(threadId, page, COMMENT_LIMIT),
  ]);

  if (!thread) notFound();

  const { data: comments, total: totalComments, totalPages } = commentsResult;

  return (
    <main className="space-y-6 font-sans">

      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="text-xs text-gray-500">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/r" className="hover:text-[#10b981] transition-all duration-200 ease-in-out font-bold">
              Forum
            </Link>
          </li>
          <li className="text-gray-400">&gt;</li>
          <li>
            <Link href={`/r/${thread.category_slug}`} className="hover:text-[#10b981] transition-all duration-200 ease-in-out font-bold">
              {thread.category_name}
            </Link>
          </li>
          <li className="text-gray-400">&gt;</li>
          <li aria-current="page" className="text-[#10b981] font-bold truncate max-w-xs sm:max-w-md">
            {thread.title}
          </li>
        </ol>
      </nav>


      {/* ── Thread Opening Post (OP) Card ──────────────────────────────────── */}
      <article className="rounded-2xl border border-[#eaefec] bg-white p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* OP Header */}
        <header className="space-y-4 border-b border-[#eaefec] pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#059669] bg-[#e6f7f0] border border-[#a7f3d0] px-3 py-1 rounded-full uppercase">
              {thread.category_name}
            </span>
            {thread.is_pinned && (
              <span className="bg-[#e6f7f0] text-[#059669] border border-[#a7f3d0] text-xs font-bold px-3 py-1 rounded-full">
                📌 Pinned
              </span>
            )}
            {thread.is_locked && (
              <span className="bg-red-50 text-red-600 border border-red-200 text-xs font-bold px-3 py-1 rounded-full">
                🔒 Locked
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight leading-snug font-sans">
            {thread.title}
          </h1>

          {/* Author Metadata Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500 pt-1">
            <div className="flex items-center gap-3">
              {thread.author_avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={thread.author_avatar_url}
                  alt={`${thread.author_username}'s avatar`}
                  className="w-9 h-9 rounded-full border border-gray-200 object-cover shadow-xs"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#10b981] text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {thread.author_username.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#111827] text-sm">u/{thread.author_username}</span>
                  <span className="bg-[#e6f7f0] text-[#10b981] border border-[#a7f3d0] text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    AUTHOR
                  </span>
                </div>
                <span className="text-gray-400 text-[11px]">
                  Posted on {new Date(thread.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="bg-[#f8faf9] border border-gray-200 px-3 py-1.5 rounded-full text-gray-600">
                {thread.view_count.toLocaleString()} views
              </span>
              <span className="bg-[#e6f7f0] border border-[#a7f3d0] px-3 py-1.5 rounded-full text-[#059669]">
                {totalComments} repl{totalComments !== 1 ? 'ies' : 'y'}
              </span>
            </div>
          </div>
        </header>


        {/* OP Body Content */}
        <section aria-label="Opening post" className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-[#f8faf9] p-6 text-[#111827] leading-relaxed font-sans text-sm sm:text-base whitespace-pre-wrap break-words">
            {thread.body}
          </div>

          {/* Interactive Lightbox Image Attachment */}
          {thread.media_url && (
            <ImageWithLightbox
              src={thread.media_url}
              alt={`${thread.title} media attachment`}
              caption="Click image to open interactive full-screen Lightbox modal"
            />
          )}
        </section>

      </article>


      {/* ── Comment / Replies Section ──────────────────────────────────────── */}
      <section aria-labelledby="replies-heading" className="space-y-4 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 id="replies-heading" className="text-lg font-bold text-[#111827] tracking-tight flex items-center gap-2">
            <span>💬</span> Community Replies ({totalComments})
          </h2>
          {totalPages > 1 && (
            <span className="text-xs font-bold text-gray-400">
              Page {page} of {totalPages}
            </span>
          )}
        </div>

        {comments.length === 0 ? (
          <div className="rounded-2xl border border-[#eaefec] bg-white p-10 text-center text-gray-500 space-y-2 shadow-sm">
            <p className="font-bold text-sm text-[#111827]">No replies yet.</p>
            <p className="text-xs text-gray-400">Be the first to share your thoughts below!</p>
          </div>
        ) : (
          <ol className="space-y-3">
            {comments.map((comment, index) => (
              <li
                key={comment.id}
                className="rounded-2xl border border-[#eaefec] bg-white p-5 sm:p-6 space-y-3 shadow-sm transition-all duration-200 ease-in-out hover:border-[#10b981]/40"
              >
                {/* Reply Author & Index Header */}
                <div className="flex items-center justify-between border-b border-[#eaefec] pb-3">
                  <div className="flex items-center gap-3">
                    {comment.author_avatar_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={comment.author_avatar_url}
                        alt=""
                        className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#f3f5f4] border border-gray-200 font-bold text-gray-700 text-xs flex items-center justify-center">
                        {comment.author_username.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-[#111827]">u/{comment.author_username}</span>
                      <span className="text-gray-300">&bull;</span>
                      <time
                        dateTime={new Date(comment.created_at).toISOString()}
                        className="text-gray-400"
                      >
                        {new Date(comment.created_at).toLocaleDateString()}
                      </time>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-[#10b981] bg-[#e6f7f0] border border-[#a7f3d0] px-2.5 py-0.5 rounded-full">
                    #{(page - 1) * COMMENT_LIMIT + index + 1}
                  </span>
                </div>

                {/* Reply Content */}
                <p className="text-[#374151] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words pl-1 font-sans">
                  {comment.content}
                </p>

                {/* Reply Media Attachment with Lightbox */}
                {comment.media_url && (
                  <ImageWithLightbox
                    src={comment.media_url}
                    alt="Reply attachment image"
                    caption="Click reply attachment to inspect Lightbox"
                    className="mt-3 max-w-lg"
                  />
                )}

              </li>
            ))}
          </ol>
        )}


        {/* ── Comment Pagination ────────────────────────────────────────── */}
        {totalPages > 1 && (
          <nav aria-label="Comment pagination" className="flex items-center justify-between rounded-2xl border border-[#eaefec] bg-white p-4 shadow-sm">
            {page > 1 ? (
              <Link
                href={`/forum/threads/${threadId}?page=${page - 1}`}
                className="rounded-full bg-[#f3f5f4] hover:bg-[#e8ebea] text-[#111827] text-xs font-bold px-4 py-2 transition-all duration-200 ease-in-out"
              >
                &larr; Older replies
              </Link>
            ) : <span />}

            <span className="text-xs text-gray-500 font-bold">
              Page <strong className="text-[#10b981]">{page}</strong> of <strong>{totalPages}</strong>
            </span>

            {page < totalPages ? (
              <Link
                href={`/forum/threads/${threadId}?page=${page + 1}`}
                className="rounded-full bg-[#f3f5f4] hover:bg-[#e8ebea] text-[#111827] text-xs font-bold px-4 py-2 transition-all duration-200 ease-in-out"
              >
                Newer replies &rarr;
              </Link>
            ) : <span />}
          </nav>
        )}

      </section>


      {/* ── Reply Submission Form Component ───────────────────────────────── */}
      {thread.is_locked ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-600 font-bold text-xs">
          🔒 This thread is locked. New replies are disabled.
        </div>
      ) : (
        <section aria-labelledby="reply-form-heading" className="pt-2">
          <ThreadReplyForm threadId={threadId} />
        </section>
      )}


      {/* ── Back Navigation ───────────────────────────────────────────────── */}
      <nav aria-label="Thread navigation" className="pt-2">
        <Link
          href={`/r/${thread.category_slug}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#10b981] hover:underline transition-all duration-200 ease-in-out"
        >
          &larr; Return to {thread.category_name}
        </Link>
      </nav>

    </main>
  );
}
