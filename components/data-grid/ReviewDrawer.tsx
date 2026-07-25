'use client';

/**
 * components/data-grid/ReviewDrawer.tsx
 * =============================================================
 * Sliding Review Panel (Right-Side Drawer)
 * =============================================================
 *
 * WHAT DOES THIS COMPONENT DO?
 *   When the user clicks an IEM row in the data grid, this panel
 *   slides in from the right edge of the screen. It displays:
 *     - IEM name, brand, price
 *     - All six audio metric scores as horizontal bars
 *     - A total score "hero" number
 *     - A link to the frequency response graph
 *     - A large textarea for writing/editing the full review
 *
 * VISUAL THEME (Black background, white text, red accents):
 *   - Panel background: pure black (bg-black)
 *   - Text: white
 *   - Accents: red-700, red-600 for buttons, badges, bars
 *   - Metric bars use the same red heatmap gradient as the grid
 *
 * PATTERN: "Sheet / Drawer"
 *   A common mobile-friendly pattern. Instead of a modal that blocks
 *   the center of the screen, a drawer slides in from the edge,
 *   leaving part of the main content visible. The semi-transparent
 *   backdrop signals "click here to close" without fully obscuring
 *   the grid behind it.
 *
 * ACCESSIBILITY:
 *   - role="dialog" + aria-modal="true" for screen readers
 *   - Escape key closes the drawer
 *   - Body scroll is locked while the drawer is open
 * =============================================================
 */

import { useEffect, useCallback, useRef } from 'react';
import type { IEMEntry } from './types';
import { getHeatmapColor, calculateTotal, getTotalHeatmapColor } from './types';


interface ReviewDrawerProps {
  /** The IEM entry to display. Null when no row is selected. */
  entry: IEMEntry | null;

  /** Whether the drawer is currently visible. */
  isOpen: boolean;

  /** Called when the user requests the drawer to close. */
  onClose: () => void;

  /** Called when the user edits the review notes textarea. */
  onUpdateNotes: (id: string, notes: string) => void;
}


export default function ReviewDrawer({ entry, isOpen, onClose, onUpdateNotes }: ReviewDrawerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Close on Escape Key ─────────────────────────────────────
  //
  // We add a keydown listener to the entire document (not just the drawer)
  // because the drawer might not have focus when Escape is pressed.
  //
  // The cleanup function (returned arrow function) removes the listener
  // when the drawer closes or the component unmounts — preventing
  // memory leaks and ghost event handlers.
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // ── Lock Body Scroll ────────────────────────────────────────
  //
  // When the drawer is open, we set `overflow: hidden` on <body>
  // so the background page can't scroll while the user interacts
  // with the drawer. This prevents the disorienting effect of
  // two scrollable areas competing for scroll input.
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // ── Notes Change Handler ────────────────────────────────────
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (entry) {
      onUpdateNotes(entry.id, e.target.value);
    }
  }, [entry, onUpdateNotes]);

  // Don't render anything if there's no entry selected.
  if (!entry) return null;

  // Calculate the total score for the hero display.
  const total = calculateTotal(entry);

  // Array of metric labels + values for the bars section.
  const metrics = [
    { label: 'Bass',         value: entry.bass },
    { label: 'Mids',         value: entry.mids },
    { label: 'Treble',       value: entry.treble },
    { label: 'Tonality',     value: entry.tonality },
    { label: 'Technicality', value: entry.technicality },
    { label: 'Bias/Pref',    value: entry.biasPref },
  ];

  return (
    <>
      {/* ── Backdrop ────────────────────────────────────────────
          A semi-transparent overlay behind the drawer.
          Clicking it closes the drawer.
          When open: dark overlay. When closed: transparent + non-interactive.
      ───────────────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300
                    ${isOpen
                      ? 'bg-black/50 backdrop-blur-sm'
                      : 'bg-transparent pointer-events-none backdrop-blur-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Drawer Panel ────────────────────────────────────────
          Slides in from the right.
          transform: translate-x-full = off-screen right.
          transform: translate-x-0    = on-screen (visible).
      ───────────────────────────────────────────────────────── */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md
                    bg-black border-l-4 border-red-800
                    shadow-2xl shadow-black/80
                    transition-transform duration-300 ease-out
                    flex flex-col
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Review: ${entry.brand} ${entry.model}`}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-red-900/50 bg-red-950 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {/* Brand name — small, muted */}
              <p className="text-xs font-mono text-red-300 uppercase tracking-wider mb-1">
                {entry.brand}
              </p>
              {/* Model name — large, prominent */}
              <h2 className="text-xl font-bold text-white truncate">
                {entry.model}
              </h2>
              {/* Metadata badges */}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm font-mono font-bold text-white">
                  ${entry.price.toLocaleString()}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded
                               bg-red-900/80 text-red-200 border border-red-700/50">
                  {entry.source}
                </span>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center
                         rounded-lg bg-red-900 border border-red-700
                         text-red-200 hover:text-white hover:bg-red-800
                         transition-colors"
              aria-label="Close drawer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Scrollable Content ────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* ── Total Score Hero ────────────────────────────── */}
          <div className={`rounded-lg p-4 text-center ${getTotalHeatmapColor(total)}`}>
            <p className="text-xs font-mono uppercase tracking-wider opacity-70 mb-1">
              Total Score
            </p>
            <p className="text-3xl font-black font-mono tabular-nums">
              {total.toFixed(1)}
            </p>
            <p className="text-xs font-mono opacity-50 mt-0.5">out of 60</p>
          </div>

          {/* ── Audio Metric Bars ───────────────────────────── */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono text-red-400 uppercase tracking-wider">
              Audio Metrics
            </h3>
            {metrics.map((m) => (
              <div key={m.label} className="flex items-center gap-2">
                {/* Label (right-aligned for neatness) */}
                <span className="text-xs text-gray-400 w-20 text-right font-mono">
                  {m.label}
                </span>

                {/* Progress bar container */}
                <div className="flex-1 h-5 bg-gray-900 rounded overflow-hidden relative">
                  {/* Filled bar — width proportional to score (0–10 → 0–100%) */}
                  <div
                    className={`h-full rounded transition-all duration-500 ${getHeatmapColor(m.value)}`}
                    style={{ width: `${(m.value / 10) * 100}%` }}
                  />
                  {/* Score number overlay — centered on the bar */}
                  <span className="absolute inset-0 flex items-center justify-center
                                   text-[10px] font-mono text-white drop-shadow-sm">
                    {m.value.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Graph Link ──────────────────────────────────── */}
          {entry.graphUrl && (
            <div>
              <h3 className="text-xs font-mono text-red-400 uppercase tracking-wider mb-2">
                Frequency Response
              </h3>
              <a
                href={entry.graphUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg
                           bg-red-950 border border-red-800
                           text-xs text-red-300 hover:text-white
                           hover:bg-red-900 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                </svg>
                View FR Graph
              </a>
            </div>
          )}

          {/* ── Review Notes (Rich Text Editor Placeholder) ── */}
          <div>
            <h3 className="text-xs font-mono text-red-400 uppercase tracking-wider mb-2">
              Review Notes
            </h3>
            {/* This textarea serves as the placeholder for the Rich Text Editor
                mentioned in the spec. It provides full multi-paragraph text editing
                with monospaced font for a technical/raw feel. A real WYSIWYG editor
                (e.g., TipTap, Slate) could replace this <textarea> later. */}
            <textarea
              ref={textareaRef}
              value={entry.reviewNotes}
              onChange={handleNotesChange}
              placeholder="Write your detailed review here..."
              rows={12}
              className="w-full bg-gray-950 border-2 border-red-900/50 rounded-lg p-3
                         text-sm text-white placeholder-gray-600
                         outline-none resize-y
                         focus:border-red-600 focus:ring-2 focus:ring-red-800/50
                         transition-colors font-sans leading-relaxed"
            />
            <p className="text-[10px] text-gray-600 mt-1 font-mono">
              Rich Text Editor — plain text mode. Supports multi-paragraph notes.
            </p>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-red-900/50 p-4 bg-red-950/50">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-red-800 border border-red-700
                       text-sm text-white font-bold uppercase tracking-wider
                       hover:bg-red-700 active:bg-red-900
                       transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
