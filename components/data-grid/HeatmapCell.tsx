'use client';

/**
 * components/data-grid/HeatmapCell.tsx
 * =============================================================
 * Inline-Editable Numeric Cell with Red Heatmap Background
 * =============================================================
 *
 * WHAT DOES THIS COMPONENT DO?
 *   Renders a single numeric value (0–10 scale) inside a grid cell.
 *   The cell's background color changes automatically based on the
 *   number: high scores get deep red, low scores get pale pink.
 *
 *   Clicking the cell activates an inline text input so the user
 *   can type a new number. Pressing Enter or clicking away (blur)
 *   saves the change; pressing Escape cancels it.
 *
 * VISUAL THEME:
 *   - Background: Red gradient from `bg-red-100` (low) to `bg-red-900` (high)
 *   - Text: White on dark reds, black on light reds
 *   - Input field: White background with red border when editing
 *
 * KEYWORD: 'use client'
 *   This MUST be the first line (after comments) in any Next.js file
 *   that uses React hooks (useState, useEffect, etc.) or handles
 *   browser events (onClick, onBlur). It tells Next.js to send this
 *   component's JavaScript to the browser (not just render it on the server).
 * =============================================================
 */

// ── IMPORTS ────────────────────────────────────────────────────
//
// useState:    React hook to store local state (is the cell in edit mode? what's the draft value?)
// useRef:      React hook to get a direct reference to a DOM element (the <input>), so we can .focus() it.
// useEffect:   React hook to run side effects (auto-focus the input when edit mode activates).
// useCallback: React hook to memoize functions so they don't get recreated every render.
//
// getHeatmapColor: Our utility function from types.ts that maps a 0–10 number to Tailwind classes.
// ────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, useCallback } from 'react';
import { getHeatmapColor } from './types';


// ── Props Interface ────────────────────────────────────────────
/**
 * Props (short for "properties") are the inputs a React component receives.
 * Think of them as function parameters:
 *   <HeatmapCell value={8.5} onChange={handleChange} />
 *   is like calling: HeatmapCell({ value: 8.5, onChange: handleChange })
 */
interface HeatmapCellProps {
  /** The current numeric score (0–10). Displayed and used for heatmap color. */
  value: number;

  /** Callback function invoked when the user commits a new value. */
  onChange: (value: number) => void;
}


// ── Component ──────────────────────────────────────────────────
/**
 * KEYWORD: export default function
 *   `export default` = this is the main thing this file provides.
 *   Other files import it as: import HeatmapCell from './HeatmapCell';
 *
 * DESTRUCTURING: ({ value, onChange }: HeatmapCellProps)
 *   Instead of receiving `props` and writing `props.value`,
 *   we destructure directly: { value, onChange } pulls those
 *   two fields out of the props object.
 */
export default function HeatmapCell({ value, onChange }: HeatmapCellProps) {

  // ── Local State ─────────────────────────────────────────────
  //
  // `isEditing`: boolean — is the cell currently in edit mode?
  //   true  = showing an <input> field
  //   false = showing the formatted number
  //
  // `draft`: string — the text in the input field while editing.
  //   We use a string (not number) because the user might type "8." (incomplete)
  //   and we don't want to lose the trailing dot during typing.
  // ────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  // A "ref" — a persistent reference to the actual <input> DOM element.
  // We need this so we can call .focus() and .select() on it programmatically.
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Sync draft with external value changes ──────────────────
  //
  // If the parent component changes the `value` prop (e.g., data reload),
  // we update our draft to match — but ONLY if we're not currently editing.
  // Otherwise the user's in-progress typing would be overwritten.
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditing) {
      setDraft(String(value));
    }
  }, [value, isEditing]);

  // ── Auto-focus input when entering edit mode ────────────────
  //
  // When `isEditing` flips to true, this effect runs and focuses
  // the input element, then selects all text so the user can
  // immediately type a replacement value.
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // ── Commit function ─────────────────────────────────────────
  //
  // Called when the user finishes editing (Enter key or blur).
  // Parses the draft string into a number, clamps it to 0–10,
  // and calls the parent's onChange callback.
  //
  // KEYWORD: useCallback
  //   Wraps a function so React reuses the same function instance
  //   between renders (unless its dependencies change). This is
  //   a performance optimization — without it, a new function
  //   object is created every render, which can cause unnecessary
  //   re-renders in child components.
  // ────────────────────────────────────────────────────────────
  const commit = useCallback(() => {
    setIsEditing(false);
    const parsed = parseFloat(draft);
    if (!isNaN(parsed)) {
      // Math.min/Math.max clamp the value to the 0–10 range.
      // Math.round(...* 100) / 100 rounds to 2 decimal places.
      const clamped = Math.min(10, Math.max(0, Math.round(parsed * 100) / 100));
      onChange(clamped);
    } else {
      // Invalid input (e.g., "abc") — revert to the original value.
      setDraft(String(value));
    }
  }, [draft, onChange, value]);

  // ── Keyboard handler ────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commit();
    } else if (e.key === 'Escape') {
      // Cancel editing — revert draft and exit edit mode.
      setDraft(String(value));
      setIsEditing(false);
    }
  }, [commit, value]);

  // ── Determine the heatmap background class ──────────────────
  //
  // This runs every render. When the value changes, the color
  // class changes, and Tailwind applies the new background.
  // The CSS transition (defined in globals.css) makes the color
  // shift smoothly instead of snapping instantly.
  // ────────────────────────────────────────────────────────────
  const colorClass = getHeatmapColor(value);

  // ── EDIT MODE: Render an inline input ───────────────────────
  if (isEditing) {
    return (
      <div className={`h-full flex items-center justify-center px-1 ${colorClass}`}>
        <input
          ref={inputRef}
          type="number"
          min={0}
          max={10}
          step={0.1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="w-full h-6 bg-white border-2 border-red-600 rounded text-center text-xs
                     text-black font-mono outline-none
                     focus:ring-2 focus:ring-red-400
                     [appearance:textfield]
                     [&::-webkit-outer-spin-button]:appearance-none
                     [&::-webkit-inner-spin-button]:appearance-none"
          /* ↑ The [appearance:textfield] and ::-webkit lines hide the
             browser's default up/down spinner arrows on number inputs.
             We don't want them — the cell is too small and they look ugly. */
        />
      </div>
    );
  }

  // ── DISPLAY MODE: Render the formatted number ───────────────
  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`h-full flex items-center justify-center cursor-pointer
                  transition-colors duration-300 select-none
                  hover:brightness-110 ${colorClass}`}
      title={`Click to edit (${value})`}
    >
      {/* toFixed(1) formats 8 → "8.0", 9.25 → "9.3" — always 1 decimal. */}
      {/* tabular-nums makes all digits the same width so columns align. */}
      <span className="text-xs font-mono tabular-nums">{value.toFixed(1)}</span>
    </div>
  );
}
