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
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";

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

export const metadata: Metadata = {
  title: "audiothread — Audiophile Communities, Gear Discussions & Tier Lists",
  description: "Crowdsourced audiophile community hub for IEMs, headphones, sound impressions, and tier lists.",
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
    >
      <body className="min-h-full flex flex-col bg-[#f4f6f8] text-[#111827] selection:bg-[#10b981]/20 selection:text-[#10b981]">
        <Providers>
          {/* Sticky Global Top Header */}
          <Navbar />

          {/* Main Content Area — pt-20 guarantees zero top clipping under sticky navbar */}
          <div className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
            {children}
          </div>

          {/* audiothread Footer */}
          <footer className="w-full border-t border-[#eaefec] bg-white py-6 mt-12 text-xs text-gray-500 font-sans">
            <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span className="font-bold text-[#111827]">audiothread</span>
                <span>&bull; Audiophile Discussions & Community Hub</span>
              </div>
              <div className="flex items-center gap-6 font-medium text-gray-500">
                <a href="/r" className="hover:text-[#10b981] transition-colors">Popular</a>
                <a href="/r/all" className="hover:text-[#10b981] transition-colors">Communities</a>
                <a href="/tier-lists" className="hover:text-[#10b981] transition-colors">Tier Lists</a>
                <a href="/messages" className="hover:text-[#10b981] transition-colors">Messages</a>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
