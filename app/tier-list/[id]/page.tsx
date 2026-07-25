/**
 * app/tier-list/[id]/page.tsx
 * =============================================================
 * Server Component Page: Tier List Viewer/Editor
 * =============================================================
 *
 * WHAT IS THIS FILE?
 *   The page that renders when a user visits /tier-list/1 or /tier-list/42.
 *   It is a "Server Component" — code in this file runs ONLY on the server,
 *   never in the browser.
 *
 * WHAT IS A SERVER COMPONENT?
 *   In Next.js App Router (the file-based routing system we use),
 *   every component is a Server Component BY DEFAULT unless you put
 *   "use client" at the top of the file.
 *
 *   SERVER COMPONENT (this file):
 *   - Runs only on the server (Node.js).
 *   - Can directly call database functions, read environment variables,
 *     access the file system — all server-only capabilities.
 *   - Cannot use React Hooks (useState, useEffect) — those need a browser.
 *   - Cannot have click handlers, user interactions, or browser APIs.
 *   - Output: renders HTML on the server, sends it to the browser.
 *
 *   CLIENT COMPONENT ("use client" at top):
 *   - Code sent to the browser, where it runs as JavaScript.
 *   - CAN use React Hooks (useState, useEffect) for interactivity.
 *   - CANNOT import server-only libraries (like pg, fs, etc.).
 *
 *   STRATEGY:
 *   This page (Server Component) fetches data from the database,
 *   then passes that data as "props" (parameters) to TierListEditor
 *   (a Client Component that handles all the interactive drag-and-drop).
 *
 *   Server → fetches data → passes it down → Client → makes it interactive.
 *   This is the modern Next.js pattern for maximum performance.
 *
 * WHY NOT FETCH IN THE BROWSER?
 *   If TierListEditor fetched data itself (in a useEffect), the page would:
 *     1. Load with empty/loading state.
 *     2. Show a spinner while fetching.
 *     3. Re-render once data arrives.
 *   This causes a "layout shift" and feels slow.
 *
 *   By fetching on the server, the browser receives a FULLY RENDERED page
 *   with real data already inside it — no waiting, no spinner, no shift.
 * =============================================================
 */

// ── IMPORTS ────────────────────────────────────────────────────────────────────
//
// `notFound` — a Next.js function that renders the 404 page.
// When called, it immediately stops this component from rendering
// and shows the app's "Page Not Found" page instead.
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

// Our database query function from lib/tier-list-queries.ts
import { getTierListPageData } from '@/lib/tier-list-queries';

// The interactive editor Client Component — it receives data as props
// and handles all the drag-and-drop interactivity in the browser.
import TierListEditor from '@/components/tier-list/TierListEditor';


// ── Dynamic Metadata ───────────────────────────────────────────────────────────
//
// Next.js supports "dynamic metadata" — the <title> and <meta description>
// tags in the <head> can be generated from data, not just hardcoded.
//
// `generateMetadata` is a SPECIAL FUNCTION NAME that Next.js looks for.
// When Next.js finds this export, it calls it to build the page's <head>.
//
// PARAMETER: { params }
//   Same dynamic route params as the page itself.
//   We await params, then fetch the tier list title to use in the page title.
// ─────────────────────────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const data = await getTierListPageData(parseInt(id, 10));

  // If data exists, use the real title. Otherwise, use a generic fallback.
  const title = data?.meta.title ?? 'Tier List';
  //                           ↑
  // `?.` = optional chaining: safely access .meta.title even if data is null.
  // If data is null → data?.meta.title → undefined.
  // `??` = nullish coalescing: "use the right side if the left side is null/undefined."
  // So: undefined ?? 'Tier List' → 'Tier List'

  return {
    title: `${title} — HBB Tier List`,
    description: data?.meta.description ?? 'A community tier list on HBB.',
  };
}


// ── Page Component ─────────────────────────────────────────────────────────────
//
// KEYWORD: export default
//   `export` — makes this function importable.
//   `default` — marks this as the PRIMARY export of the file.
//   Every page.tsx file must have exactly one `export default` function.
//   Next.js automatically uses it as the page component for this route.
//
// KEYWORD: async function
//   This page function is async because it awaits two things:
//   1. `await params` — reading the dynamic route params.
//   2. `await getTierListPageData()` — the database query.
//   Server Components can be async! Client Components cannot.
//
// PARAMETER: { params }
//   Next.js passes the dynamic route segments as `params`.
//   For the URL /tier-list/42, params = Promise<{ id: "42" }>.
// ─────────────────────────────────────────────────────────────────────────────
export default async function TierListPage(
  { params }: { params: Promise<{ id: string }> }
) {

  // ── Step 1: Read the dynamic ID from the URL ─────────────────────────────
  //
  // `await params` unpacks the Promise to get { id: "42" } (for example).
  // We then destructure `id` out of that object.
  //
  // parseInt(id, 10) converts "42" (string) to 42 (number).
  // The second argument `10` means base-10 (standard decimal numbers).
  // parseInt("42", 10) → 42
  // parseInt("0x1F", 16) → 31 (hexadecimal, but we always use base 10 for IDs)
  // ─────────────────────────────────────────────────────────────────────────
  const { id } = await params;
  const numericId = parseInt(id, 10);

  // ── Step 2: Fetch data from the database ─────────────────────────────────
  //
  // This runs ON THE SERVER — the database connection happens here,
  // never in the browser. The browser only receives the result.
  //
  // `getTierListPageData` returns `TierListPageData | null`.
  // We await it to get the resolved value.
  // ─────────────────────────────────────────────────────────────────────────
  const data = await getTierListPageData(numericId);

  // ── Step 3: Handle not found ──────────────────────────────────────────────
  //
  // If data is null (invalid ID AND the mock fallback failed), show 404.
  // `notFound()` is a Next.js function — it throws a special error that
  // Next.js catches to render the not-found page. Code after it never runs.
  // ─────────────────────────────────────────────────────────────────────────
  if (!data) {
    notFound();
  }

  // ── Step 4: Render the interactive editor ─────────────────────────────────
  //
  // JSX SYNTAX: <TierListEditor data={data} />
  //   This renders the TierListEditor Client Component.
  //   `data={data}` passes our fetched data as a "prop" (property/parameter).
  //
  //   A "prop" in React is like a function argument.
  //   Just as you write:  myFunction(data)
  //   In JSX you write:   <MyComponent data={data} />
  //
  //   The curly braces { } inside JSX mean "evaluate this as JavaScript."
  //   So {data} inserts the value of the `data` variable into the prop.
  //
  // WHY IS THE PAGE A <main> WITH NO STYLING?
  //   All the visual layout lives in TierListEditor and its children.
  //   The page's only job is to fetch data and pass it down.
  //   This separation of concerns keeps the code clean:
  //   Server Component = data fetching. Client Component = UI.
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main>
      <TierListEditor data={data} />
    </main>
  );
}
