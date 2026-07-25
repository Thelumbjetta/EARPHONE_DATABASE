/**
 * app/grid/page.tsx
 * =============================================================
 * Server Component: IEM Data Grid Page
 * =============================================================
 *
 * ROUTE: /grid
 *   When a user visits http://localhost:3000/grid, Next.js renders
 *   this file. The filename `page.tsx` inside the `app/grid/`
 *   directory tells Next.js this is the page for the /grid URL.
 *
 * WHY IS THIS FILE SO SHORT?
 *   This is a Server Component — its only job is to:
 *     1. Set SEO metadata (title, description)
 *     2. Render the <DataGrid /> client component
 *
 *   All the interactive logic (state, editing, drawer) lives in
 *   DataGrid.tsx. This separation is the recommended Next.js pattern:
 *     Server Component = data fetching + metadata
 *     Client Component = interactivity + state
 *
 * NOTE: In the future, this page could fetch IEM data from the
 *   PostgreSQL database using getTierListPageData() and pass it
 *   to DataGrid as the `initialData` prop. For now, DataGrid
 *   uses its internal mock data.
 * =============================================================
 */

import type { Metadata } from 'next';
import DataGrid from '@/components/data-grid/DataGrid';

// ── SEO Metadata ──────────────────────────────────────────────
export const metadata: Metadata = {
  title: 'IEM Database — HBB Tier List',
  description:
    'High-density interactive data grid for IEM reviews. Inline editing, red heatmap scoring, and detailed review panel. Built by HBB.',
};

export default function GridPage() {
  return (
    <main className="min-h-screen bg-white">
      <DataGrid />
    </main>
  );
}
