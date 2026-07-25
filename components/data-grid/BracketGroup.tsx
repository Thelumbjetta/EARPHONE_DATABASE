'use client';

/**
 * components/data-grid/BracketGroup.tsx
 * =============================================================
 * Collapsible Price Bracket Group
 * =============================================================
 *
 * WHAT DOES THIS COMPONENT DO?
 *   Renders one price bracket section in the data grid:
 *     1. A thick, deep red header bar with the bracket label
 *        (e.g., "FLAGSHIPS · $2000+")
 *     2. The IEM rows that fall within this price range
 *
 *   The header is clickable — clicking it collapses or expands
 *   the rows beneath it. A chevron icon rotates to indicate state.
 *
 * VISUAL THEME (Red/White/Black):
 *   - Header: deep red background (bg-red-950) with bold white text
 *   - Entry count badge: subtle red-900 background
 *   - Chevron: white, rotates 90° when collapsed
 *   - Left border: 4px solid red-800 accent
 *
 * WHY COLLAPSIBLE?
 *   With 20+ IEMs across 5 brackets, the grid can get very long.
 *   Collapsing brackets the user isn't interested in reduces
 *   visual clutter and makes scrolling faster.
 * =============================================================
 */

import { useState, useCallback } from 'react';
import type { IEMEntry, PriceBracket } from './types';
import DataRow from './DataRow';


interface BracketGroupProps {
  /** The bracket definition (label, price range). */
  bracket: PriceBracket;

  /** IEM entries that belong to this bracket (pre-filtered by parent). */
  entries: IEMEntry[];

  /** Generic cell update handler — passed through to each DataRow. */
  onUpdate: (id: string, field: keyof IEMEntry, value: IEMEntry[keyof IEMEntry]) => void;

  /** Called when a row is clicked — passed through to each DataRow. */
  onSelect: (entry: IEMEntry) => void;

  /** ID of the currently selected row (for highlighting). */
  selectedId: string | null;
}


export default function BracketGroup({
  bracket,
  entries,
  onUpdate,
  onSelect,
  selectedId,
}: BracketGroupProps) {

  // ── Collapse State ──────────────────────────────────────────
  //
  // `isCollapsed = false` means the rows are visible (expanded).
  // `isCollapsed = true`  means the rows are hidden (collapsed).
  //
  // Starts expanded so the user sees all data on first load.
  // ────────────────────────────────────────────────────────────
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // Don't render empty brackets (e.g., if no IEMs cost $2000+).
  if (entries.length === 0) return null;

  return (
    <div className="mb-0">

      {/* ── Bracket Header Bar ──────────────────────────────── */}
      <button
        onClick={toggleCollapse}
        className="w-full flex items-center gap-3 px-4 py-2.5
                   bg-red-950 border-l-4 border-l-red-700
                   hover:bg-red-900 transition-colors duration-200
                   select-none group"
        /* ↑ `group` is a Tailwind utility that marks this element as a
             "group parent." Children can use `group-hover:` to style
             themselves when the PARENT is hovered, not just themselves. */
      >
        {/* Collapse chevron — rotates when collapsed */}
        <svg
          viewBox="0 0 24 24"
          className={`w-3.5 h-3.5 text-red-400 transition-transform duration-200
                      ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>

        {/* Bracket label — bold, white, spaced-out tracking */}
        <span className="text-xs font-black tracking-[0.2em] text-white">
          {bracket.label}
        </span>

        {/* Price range subtitle */}
        <span className="text-[10px] font-mono text-red-300">
          {bracket.sublabel}
        </span>

        {/* Entry count — right-aligned */}
        <span className="ml-auto text-[10px] font-mono text-red-400
                         group-hover:text-red-300 transition-colors
                         bg-red-900/50 px-2 py-0.5 rounded-full">
          {entries.length} {entries.length === 1 ? 'IEM' : 'IEMs'}
        </span>
      </button>

      {/* ── Rows Container ──────────────────────────────────── */}
      {/* max-h transition creates a smooth expand/collapse animation.
          When collapsed: max-h-0 + opacity-0 (hidden).
          When expanded:  max-h-[5000px] + opacity-100 (visible).

          WHY 5000px?
            CSS `max-height: auto` cannot be animated. So we use a very
            large fixed value that's guaranteed to be taller than any
            realistic number of rows. The actual height is still determined
            by content — max-height just sets the upper limit for animation. */}
      <div
        className={`transition-all duration-200 overflow-hidden
                    ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'}`}
      >
        {entries.map((entry) => (
          <DataRow
            key={entry.id}
            entry={entry}
            onUpdate={onUpdate}
            onSelect={onSelect}
            isSelected={selectedId === entry.id}
          />
        ))}
      </div>
    </div>
  );
}
