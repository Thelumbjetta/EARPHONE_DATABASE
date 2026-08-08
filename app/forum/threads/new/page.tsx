/**
 * app/forum/threads/new/page.tsx
 * =============================================================
 * Page: /forum/threads/new  —  Create New Thread Form
 * =============================================================
 * Styled with high-contrast Tailwind CSS dark mode.
 * Integrates CreateThreadForm with Drag-and-Drop file uploads
 * and NextAuth user session detection.
 * =============================================================
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { getForumCategories } from '@/lib/forum-queries';
import CreateThreadForm from '@/components/CreateThreadForm';

export const metadata: Metadata = {
  title: 'Create New Thread — HBB Audiophile Forum',
  description: 'Start a new discussion thread on the HBB audiophile community forum.',
};

export default async function CreateThreadPage({
  searchParams,
}: {
  searchParams: Promise<{ category_id?: string }>;
}) {
  const { category_id: preselectedCategoryId } = await searchParams;
  const categories = await getForumCategories();

  return (
    <main className="space-y-6 font-sans">

      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="text-xs text-gray-500">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/r" className="hover:text-[#10b981] transition-all duration-200 ease-in-out font-bold">
              Forum
            </Link>
          </li>
          <li className="text-gray-400">&gt;</li>
          <li aria-current="page" className="text-[#10b981] font-bold">
            New Thread
          </li>
        </ol>
      </nav>


      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-[#059669] bg-[#e6f7f0] border border-[#a7f3d0] px-3 py-1 rounded-full uppercase">
          New Discussion Topic
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
          Create a New Thread
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 max-w-2xl leading-relaxed">
          Share a review, ask a technical question, start a comparison, or post gear impressions.
        </p>
      </header>


      {/* ── Main Layout: Form + Guidelines Sidebar ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form Card (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <CreateThreadForm
            categories={categories}
            preselectedCategoryId={preselectedCategoryId}
          />
        </div>


        {/* Right Column: Posting Guidelines Sidebar (1 col) */}
        <aside aria-label="Posting guidelines" className="space-y-4">
          <div className="rounded-2xl border border-[#a7f3d0] bg-[#e6f7f0] p-6 space-y-3 shadow-sm">
            <h2 className="text-sm font-bold text-[#059669] flex items-center gap-2">
              <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Posting Guidelines
            </h2>

            <ul className="space-y-2.5 text-xs text-[#065f46] leading-relaxed font-medium">
              <li className="flex items-start gap-2">
                <span className="text-[#10b981] font-bold">&bull;</span>
                <span>Select the appropriate board section (Head Gear, Sound Science, Marketplace).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#10b981] font-bold">&bull;</span>
                <span>Use clear, descriptive titles indicating gear models and comparisons.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#10b981] font-bold">&bull;</span>
                <span>For sound reviews: detail your source gear, ear tips, and test tracks.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#10b981] font-bold">&bull;</span>
                <span>For frequency response measurements: attach PNG/JPG graphs via drag and drop.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#10b981] font-bold">&bull;</span>
                <span>Keep discussion constructive and respectful across all sound signatures.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[#eaefec] bg-white p-5 space-y-1.5 shadow-sm">
            <h3 className="text-xs font-bold text-[#111827] uppercase">Attachment Limit</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Image uploads support .png, .jpg, .webp, and .gif formats up to 10MB each.
            </p>
          </div>
        </aside>

      </div>


      {/* ── Back Navigation ───────────────────────────────────────────────── */}
      <nav aria-label="Form navigation" className="pt-2">
        <Link
          href="/r"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#10b981] hover:underline transition-all duration-200 ease-in-out"
        >
          &larr; Return to Home Board
        </Link>
      </nav>

    </main>
  );
}
