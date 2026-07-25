/**
 * app/layout.tsx
 * =============================================================
 * Root Layout — Applied to Every Page
 * =============================================================
 *
 * WHAT IS THIS FILE?
 *   The root layout wraps EVERY page in the application.
 *   It provides the <html> and <body> tags, loads fonts,
 *   imports global CSS, and sets page-level metadata.
 *
 *   In Next.js App Router, layout.tsx files are "persistent" —
 *   when the user navigates between pages, the layout stays
 *   mounted and only the page content inside {children} changes.
 *   This means fonts only load once, not on every navigation.
 *
 * FONTS:
 *   - Inter: Primary UI font. Clean, tight, modern. Used for
 *     all body text, labels, and headers.
 *   - Geist Sans: Fallback sans-serif by Vercel.
 *   - Geist Mono: Monospace font for scores, prices, and
 *     technical data. Tabular numbers ensure digit alignment.
 *
 * THEME:
 *   White background, black text. No dark mode — the grid's
 *   red heatmap cells and deep red headers provide all the
 *   visual contrast needed.
 *
 * KEYWORD: export default function RootLayout
 *   Next.js expects exactly ONE default export per layout.tsx.
 *   The `children` prop is whatever page.tsx renders for the
 *   current route — this layout wraps it in <html><body>.
 * =============================================================
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

// ── Font Loading ──────────────────────────────────────────────
//
// `next/font/google` automatically downloads and self-hosts Google
// Fonts. This means:
//   1. No external network requests at runtime (faster page loads).
//   2. No FOUT (Flash of Unstyled Text) — fonts are available immediately.
//   3. The `variable` option creates a CSS custom property
//      (e.g., --font-inter) that can be referenced in globals.css.
// ──────────────────────────────────────────────────────────────

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// ── Page Metadata ─────────────────────────────────────────────
//
// Generates the <title> and <meta name="description"> tags.
// These appear in:
//   - Browser tab title
//   - Search engine results (Google, Bing)
//   - Social media link previews
// ──────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "HBB IEM Database",
  description: "High-density interactive IEM tier list and review database by HBB.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      /* ↑ antialiased: Enables font smoothing for sharper text rendering.
           h-full: Makes <html> take up the full viewport height. */
    >
      <body className="min-h-full flex flex-col bg-white text-black">
        {children}
      </body>
    </html>
  );
}
