/**
 * components/data-grid/types.ts
 * =============================================================
 * Shared Type Definitions & Configuration — IEM Data Grid
 * =============================================================
 *
 * WHAT IS THIS FILE?
 *   This file contains NO visual components — only TYPE DEFINITIONS
 *   (descriptions of data shapes) and CONFIGURATION CONSTANTS
 *   (settings that control how the grid looks and behaves).
 *
 *   Think of types as "contracts." If a variable is typed as
 *   `IEMEntry`, TypeScript guarantees it has ALL the fields
 *   listed in the IEMEntry interface — at compile time, before
 *   the code ever runs.
 *
 * WHY A SEPARATE FILE?
 *   Multiple components (DataGrid, DataRow, ReviewDrawer, etc.)
 *   all need to agree on the same data shapes. Defining types
 *   here in one place means a change automatically propagates
 *   everywhere — no copy-paste drift.
 *
 * HOW TO USE:
 *   import type { IEMEntry } from './types';
 *   import { GRID_COLUMNS, getHeatmapColor } from './types';
 *
 *   `import type` = TypeScript-only import, zero runtime cost.
 *   Regular `import` = brings in runtime values (constants, functions).
 * =============================================================
 */


// =============================================================
// SECTION 1: DATA TYPES
// =============================================================


// ── IEMEntry ──────────────────────────────────────────────────
/**
 * Represents a single IEM (In-Ear Monitor) row in the data grid.
 * Every field maps to one column in the table.
 *
 * KEYWORD: export interface
 *   `export` = available to other files via import.
 *   `interface` = describes the SHAPE of an object.
 *   An object typed as IEMEntry MUST have ALL these fields.
 */
export interface IEMEntry {
  /** Unique identifier string. Used as React `key` and for lookups. */
  id: string;

  /** Manufacturer brand name, e.g., "Moondrop", "64 Audio". */
  brand: string;

  /** Product model name, e.g., "Variations", "U12t". */
  model: string;

  /** Retail price in whole US dollars. */
  price: number;

  /**
   * QC / Service rating — 0 to 5, supporting half-star increments.
   * 0   = not rated
   * 2.5 = 2½ stars
   * 5   = perfect 5 stars
   */
  qcStars: number;

  /**
   * URL to the frequency response graph for this IEM.
   * Empty string "" means no graph is available.
   */
  graphUrl: string;

  /**
   * Where the IEM was obtained.
   * Examples: "Purchased", "Review Unit", "Tour Unit", "Loaner".
   */
  source: string;

  // ── Audio Metric Scores ──────────────────────────────────────
  // Each is a number on a 0–10 scale (decimals allowed).
  // These six columns get the heatmap background treatment.

  /** Bass quality and quantity. 0 = terrible, 10 = exceptional. */
  bass: number;

  /** Midrange quality. 0 = terrible, 10 = exceptional. */
  mids: number;

  /** Treble quality. 0 = terrible, 10 = exceptional. */
  treble: number;

  /** Overall tonal balance / tuning accuracy. */
  tonality: number;

  /** Technical performance: detail, imaging, staging. */
  technicality: number;

  /** Personal bias / preference bonus. */
  biasPref: number;

  /**
   * Long-form review text displayed in the side drawer.
   * Can be multi-paragraph. Edited via the drawer's textarea.
   */
  reviewNotes: string;
}


// ── PriceBracket ──────────────────────────────────────────────
/**
 * Defines one price range group in the grid.
 * IEM entries are sorted into brackets by their `price` field.
 *
 * Visual styling uses deep red headers with white text —
 * all brackets share the red/white/black palette, differentiated
 * only by label and price range.
 */
export interface PriceBracket {
  /** Unique slug, e.g., "flagships". Used as React key. */
  id: string;

  /** Bold header label, e.g., "FLAGSHIPS". */
  label: string;

  /** Price range subtitle, e.g., "$2000+". */
  sublabel: string;

  /**
   * Inclusive lower bound of this bracket.
   * An IEM with price >= min AND price < max falls into this bracket.
   */
  min: number;

  /**
   * Exclusive upper bound. Use `Infinity` for the top bracket
   * (anything $2000 and above).
   */
  max: number;
}


// ── GridColumn ────────────────────────────────────────────────
/**
 * Describes one column in the grid header.
 * The `width` values are CSS Grid track sizes that control
 * how wide each column is.
 *
 * WHAT IS `minmax(180px, 2fr)`?
 *   CSS Grid function: "be at least 180px wide, but grow up to
 *   2 fractional units of remaining space." This keeps the Name
 *   column readable on narrow screens but lets it breathe on wide ones.
 */
export interface GridColumn {
  /** Machine key matching IEMEntry field name (or 'total'/'name'). */
  key: string;

  /** Human-readable header label shown in the column header row. */
  label: string;

  /** CSS Grid column width. Can be fixed (e.g., "62px") or flexible. */
  width: string;

  /** Text alignment within the cell. */
  align?: 'left' | 'center' | 'right';

  /**
   * Determines which cell renderer to use:
   *   'name'     → clickable brand+model (opens drawer)
   *   'stars'    → interactive 5-star rating
   *   'link'     → external link icon button
   *   'text'     → inline-editable text
   *   'heatmap'  → inline-editable number with red heatmap background
   *   'total'    → read-only auto-calculated sum
   *   'price'    → formatted currency display
   */
  type: 'text' | 'stars' | 'link' | 'heatmap' | 'total' | 'price' | 'name';
}


// =============================================================
// SECTION 2: CONFIGURATION CONSTANTS
// =============================================================


// ── Price Brackets ────────────────────────────────────────────
/**
 * The five price tiers that IEMs are grouped into.
 * Order matters — they render top-to-bottom in this order.
 *
 * KEYWORD: `as const`
 *   Tells TypeScript to treat this array as deeply immutable.
 *   Without it, TypeScript widens string values to `string` type.
 *   With it, TypeScript knows the exact literal values, enabling
 *   better autocompletion and type safety.
 *
 * NOTE: We use `satisfies PriceBracket[]` instead of `: PriceBracket[]`
 *   so TypeScript checks the shape while preserving literal types.
 *   (We don't actually use `as const` here for simplicity.)
 */
export const PRICE_BRACKETS: PriceBracket[] = [
  {
    id: 'flagships',
    label: 'FLAGSHIPS',
    sublabel: '$2000+',
    min: 2000,
    max: Infinity,
  },
  {
    id: 'summit-fi',
    label: 'SUMMIT-FI',
    sublabel: '$500 – $2000',
    min: 500,
    max: 2000,
  },
  {
    id: 'mid-fi',
    label: 'MID-FI',
    sublabel: '$300 – $500',
    min: 300,
    max: 500,
  },
  {
    id: 'budget',
    label: 'BUDGET',
    sublabel: '$100 – $300',
    min: 100,
    max: 300,
  },
  {
    id: 'ultra-budget',
    label: 'ULTRA-BUDGET',
    sublabel: 'Under $100',
    min: 0,
    max: 100,
  },
];


// ── Grid Columns ──────────────────────────────────────────────
/**
 * Defines every column in the grid, in display order (left → right).
 *
 * The `width` values form a CSS Grid template string. Together they
 * produce a layout like:
 *   | Name (flexible) | QC (110px) | Graph (58px) | Source (flex) | ... |
 *
 * The template is assembled in DataGrid.tsx by joining all widths
 * with spaces, then applied via a CSS custom property `--grid-template`.
 *
 * NOTE: There are 12 columns (ICV was removed from the spec).
 */
export const GRID_COLUMNS: GridColumn[] = [
  { key: 'name',         label: 'Name',     width: 'minmax(180px, 2fr)', align: 'left',   type: 'name' },
  { key: 'qcStars',      label: 'QC',       width: '110px',              align: 'center', type: 'stars' },
  { key: 'graphUrl',     label: 'Graph',    width: '58px',               align: 'center', type: 'link' },
  { key: 'source',       label: 'Source',   width: 'minmax(90px, 1fr)',  align: 'left',   type: 'text' },
  { key: 'bass',         label: 'Bass',     width: '62px',               align: 'center', type: 'heatmap' },
  { key: 'mids',         label: 'Mids',     width: '62px',               align: 'center', type: 'heatmap' },
  { key: 'treble',       label: 'Treble',   width: '62px',               align: 'center', type: 'heatmap' },
  { key: 'tonality',     label: 'Tonality', width: '72px',               align: 'center', type: 'heatmap' },
  { key: 'technicality', label: 'Tech',     width: '62px',               align: 'center', type: 'heatmap' },
  { key: 'biasPref',     label: 'Bias',     width: '62px',               align: 'center', type: 'heatmap' },
  { key: 'total',        label: 'Total',    width: '72px',               align: 'center', type: 'total' },
  { key: 'price',        label: 'Price',    width: '80px',               align: 'right',  type: 'price' },
];


// =============================================================
// SECTION 3: UTILITY FUNCTIONS
// =============================================================


// ── Heatmap Color Mapping (Individual Scores 0–10) ────────────
/**
 * Maps a single audio metric score (0–10) to a Tailwind CSS class
 * string that sets the cell's background and text color.
 *
 * THEME: Red gradient — light red for low scores, deep red for high.
 *   10 = deep, saturated red (exceptional)
 *    5 = medium red
 *    0 = pale pink (poor)
 *
 * HOW IT WORKS:
 *   The function checks the value against thresholds from highest
 *   to lowest. The first matching condition wins (short-circuit).
 *
 * WHY RETURN A STRING OF CLASS NAMES?
 *   Tailwind CSS works by scanning source code for class name strings.
 *   By returning complete class names like "bg-red-800", Tailwind's
 *   build step detects them and includes the corresponding CSS rules.
 *   If we tried to dynamically construct names (e.g., `bg-red-${n}`),
 *   Tailwind would NOT detect them and the styles would be missing.
 *
 * @param value - A number between 0 and 10.
 * @returns A string of Tailwind utility classes for bg + text color.
 */
export function getHeatmapColor(value: number): string {
  if (value >= 9)   return 'bg-red-900 text-white';
  if (value >= 8)   return 'bg-red-700 text-white';
  if (value >= 7)   return 'bg-red-500 text-white';
  if (value >= 6)   return 'bg-red-400 text-white';
  if (value >= 5)   return 'bg-red-300 text-black';
  return 'bg-red-100 text-black';
}


// ── Heatmap Color for Total Score (0–60 scale) ────────────────
/**
 * Same concept as getHeatmapColor, but calibrated for the Total
 * column which sums six 0–10 metrics (theoretical max = 60).
 *
 * @param value - A number between 0 and 60.
 * @returns Tailwind utility classes for the Total cell.
 */
export function getTotalHeatmapColor(value: number): string {
  if (value >= 54)  return 'bg-red-900 text-white font-bold';
  if (value >= 48)  return 'bg-red-700 text-white font-semibold';
  if (value >= 42)  return 'bg-red-500 text-white font-semibold';
  if (value >= 36)  return 'bg-red-400 text-white';
  if (value >= 30)  return 'bg-red-300 text-black';
  return 'bg-red-100 text-black';
}


// ── Calculate Total from Metrics ──────────────────────────────
/**
 * Computes the auto-calculated Total score by summing all six
 * audio metric fields.
 *
 * IMPORTANT: This is a PURE FUNCTION — given the same entry,
 * it always returns the same result, with no side effects.
 * It does NOT modify the entry object.
 *
 * WHY NOT STORE THE TOTAL?
 *   The Total is always derived from the six sub-scores.
 *   Storing it would create a "derived state" problem: if someone
 *   edits Bass from 8 to 9, the stored Total would be stale.
 *   By computing it on-the-fly, it's ALWAYS correct.
 *
 * Math.round(sum * 100) / 100:
 *   Rounds to 2 decimal places to avoid floating-point artifacts.
 *   Example: 0.1 + 0.2 = 0.30000000000000004 in JavaScript.
 *   Rounding fixes this: Math.round(0.300...04 * 100) / 100 = 0.3.
 *
 * @param entry - The IEM entry whose total to calculate.
 * @returns The sum of all six audio metrics, rounded to 2 decimals.
 */
export function calculateTotal(entry: IEMEntry): number {
  const sum = entry.bass + entry.mids + entry.treble +
              entry.tonality + entry.technicality + entry.biasPref;
  return Math.round(sum * 100) / 100;
}
