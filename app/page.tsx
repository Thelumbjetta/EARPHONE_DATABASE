/**
 * app/page.tsx
 * =============================================================
 * Root Page: /
 * =============================================================
 *
 * WHAT THIS FILE DOES:
 *   Redirects the root URL (/) to the forum board index (/forum).
 *   The community forum is now the main entry point of the application.
 *
 * WHY REDIRECT INSTEAD OF RENDERING?
 *   The old home page rendered the <DataGrid /> component (the YouTube
 *   dashboard / IEM database). With the pivot to a forum architecture,
 *   the forum becomes the primary experience. We redirect rather than
 *   delete the old components — they are still accessible at /grid.
 *
 * HOW redirect() WORKS:
 *   `redirect()` is a Next.js Server Component utility from 'next/navigation'.
 *   It immediately stops rendering and sends a 307 Temporary Redirect
 *   HTTP response to the browser, which then navigates to /forum.
 *
 *   307 vs 301:
 *   - 301 Permanent Redirect: browsers and search engines cache this forever.
 *     Use when the old URL will NEVER return.
 *   - 307 Temporary Redirect (default in Next.js): not cached — easier to
 *     change later. Use during development or when you may reconsider.
 *
 * PRESERVING OLD ROUTES:
 *   - /grid          → the old DataGrid component
 *   - /tier-list     → the existing tier list views
 *   These remain functional and are not deleted.
 * =============================================================
 */

// redirect() is a Next.js server-side navigation utility.
// Calling it stops the current render and issues an HTTP redirect.
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/r');
}
