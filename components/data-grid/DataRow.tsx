'use client';

/**
 * components/data-grid/DataRow.tsx
 * =============================================================
 * Single IEM Row in the Data Grid
 * =============================================================
 *
 * WHAT DOES THIS COMPONENT DO?
 *   Renders one horizontal row in the data grid — all 12 columns
 *   for a single IEM entry. Each column uses the appropriate cell
 *   component based on its type:
 *
 *     Name         → Clickable text (opens review drawer)
 *     QC           → StarRating component (interactive 5-star)
 *     Graph        → External link icon button
 *     Source       → EditableCell (click-to-edit text)
 *     Bass–Bias    → HeatmapCell (click-to-edit number with red gradient)
 *     Total        → Read-only auto-calculated sum (heatmap colored)
 *     Price        → Formatted currency display
 *
 * VISUAL THEME (Red/White/Black):
 *   - White background for rows
 *   - Black text
 *   - Black hairline borders between rows
 *   - Red left border accent on selected row
 *   - Hover: subtle red-50 tint
 *
 * CSS GRID LAYOUT:
 *   The row uses CSS Grid with `grid-cols-[var(--grid-template)]`.
 *   The `--grid-template` custom property is set by the parent
 *   DataGrid component and contains the column widths like:
 *     "minmax(180px, 2fr) 110px 58px minmax(90px, 1fr) 62px ..."
 *
 *   This ensures the row's cells align perfectly with the header row,
 *   because both use the same template via the shared CSS variable.
 * =============================================================
 */

import type { IEMEntry } from './types';
import { calculateTotal, getTotalHeatmapColor } from './types';
import HeatmapCell from './HeatmapCell';
import StarRating from './StarRating';
import EditableCell from './EditableCell';


interface DataRowProps {
  /** The IEM data for this row. */
  entry: IEMEntry;

  /**
   * Generic cell update handler.
   * Called when ANY cell in this row is edited.
   *
   * WHY `keyof IEMEntry`?
   *   TypeScript's `keyof` operator creates a union type of all
   *   field names in IEMEntry: 'id' | 'brand' | 'model' | 'price' | ...
   *   This ensures `field` can only be a valid field name —
   *   passing 'bass' works, but 'bsas' (typo) is a compile error.
   */
  onUpdate: (id: string, field: keyof IEMEntry, value: IEMEntry[keyof IEMEntry]) => void;

  /** Called when the user clicks the row name to open the review drawer. */
  onSelect: (entry: IEMEntry) => void;

  /** Whether this row is the currently-selected row (highlighted). */
  isSelected: boolean;
}


export default function DataRow({ entry, onUpdate, onSelect, isSelected }: DataRowProps) {

  // Auto-calculate the total from all six metric scores.
  // This runs every render — if a metric changes, the total updates instantly.
  const total = calculateTotal(entry);
  const totalColor = getTotalHeatmapColor(total);

  return (
    <div
      className={`grid grid-cols-[var(--grid-template)] items-stretch h-9
                  border-b border-gray-200
                  transition-colors duration-150
                  ${isSelected
                    ? 'bg-red-50 border-l-4 border-l-red-700'
                    : 'hover:bg-red-50/50 border-l-4 border-l-transparent'
                  }`}
    >
      {/* ── NAME COLUMN ────────────────────────────────────────
          Shows brand (small, muted) and model name (bold).
          Clicking opens the review drawer via onSelect.
      ───────────────────────────────────────────────────────── */}
      <div
        onClick={() => onSelect(entry)}
        className="flex items-center px-3 gap-1.5 cursor-pointer
                   hover:bg-red-50 transition-colors min-w-0"
        title={`${entry.brand} ${entry.model} — click for details`}
      >
        <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
          {entry.brand}
        </span>
        <span className="text-xs text-black font-semibold truncate">
          {entry.model}
        </span>
      </div>

      {/* ── QC / SERVICE STARS ─────────────────────────────── */}
      <div className="flex items-center justify-center">
        <StarRating
          value={entry.qcStars}
          onChange={(v) => onUpdate(entry.id, 'qcStars', v)}
        />
      </div>

      {/* ── GRAPH LINK BUTTON ──────────────────────────────── */}
      <div className="flex items-center justify-center">
        {entry.graphUrl ? (
          <a
            href={entry.graphUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-700 hover:text-red-500 transition-colors"
            title="Open FR graph"
            onClick={(e) => e.stopPropagation()}
            /* ↑ stopPropagation prevents the row click (onSelect) from
               also firing when clicking this link. Without it, clicking
               the graph icon would BOTH open the link AND open the drawer. */
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
            </svg>
          </a>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </div>

      {/* ── SOURCE (Editable Text) ─────────────────────────── */}
      <EditableCell
        value={entry.source}
        onChange={(v) => onUpdate(entry.id, 'source', v)}
        placeholder="—"
      />

      {/* ── AUDIO METRICS — 6 Heatmap Cells ────────────────── */}
      {/* Each HeatmapCell is independently editable and colored. */}
      <HeatmapCell
        value={entry.bass}
        onChange={(v) => onUpdate(entry.id, 'bass', v)}
      />
      <HeatmapCell
        value={entry.mids}
        onChange={(v) => onUpdate(entry.id, 'mids', v)}
      />
      <HeatmapCell
        value={entry.treble}
        onChange={(v) => onUpdate(entry.id, 'treble', v)}
      />
      <HeatmapCell
        value={entry.tonality}
        onChange={(v) => onUpdate(entry.id, 'tonality', v)}
      />
      <HeatmapCell
        value={entry.technicality}
        onChange={(v) => onUpdate(entry.id, 'technicality', v)}
      />
      <HeatmapCell
        value={entry.biasPref}
        onChange={(v) => onUpdate(entry.id, 'biasPref', v)}
      />

      {/* ── TOTAL (Auto-Calculated, Read-Only) ─────────────── */}
      <div className={`flex items-center justify-center transition-colors duration-300 ${totalColor}`}>
        <span className="text-xs font-mono tabular-nums">{total.toFixed(1)}</span>
      </div>

      {/* ── PRICE ──────────────────────────────────────────── */}
      <div className="flex items-center justify-end px-3">
        <span className="text-xs font-mono tabular-nums text-black font-semibold">
          ${entry.price.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
