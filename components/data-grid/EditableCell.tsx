'use client';

/**
 * components/data-grid/EditableCell.tsx
 * =============================================================
 * Generic Inline-Editable Text Cell
 * =============================================================
 *
 * WHAT DOES THIS COMPONENT DO?
 *   Displays a text value. When the user clicks it, an inline
 *   text input appears for editing. Pressing Enter or clicking
 *   away saves the change; Escape cancels it.
 *
 *   Used for the "Source" column (e.g., "Purchased", "Review Unit").
 *
 * VISUAL THEME (Red/White/Black):
 *   - Display mode: Black text on white background
 *   - Edit mode: White input with red border
 *   - Empty cells show a gray placeholder dash "—"
 *
 * PATTERN: "Click-to-Edit"
 *   This is a common UI pattern in spreadsheet apps. The cell
 *   looks like plain text until you click it, then it becomes
 *   an input field. This keeps the grid clean and readable
 *   while still being fully editable.
 * =============================================================
 */

import { useState, useRef, useEffect, useCallback } from 'react';


interface EditableCellProps {
  /** The current text value. */
  value: string;

  /** Called when the user saves a new value. */
  onChange: (value: string) => void;

  /** Text shown when value is empty. Defaults to "—". */
  placeholder?: string;
}


export default function EditableCell({ value, onChange, placeholder = '—' }: EditableCellProps) {

  // ── State ───────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft with external value changes (only when not editing).
  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [value, isEditing]);

  // Auto-focus and select all text when entering edit mode.
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // ── Save the draft and exit edit mode ───────────────────────
  const commit = useCallback(() => {
    setIsEditing(false);
    onChange(draft.trim());
  }, [draft, onChange]);

  // ── Keyboard shortcuts ──────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commit();
    } else if (e.key === 'Escape') {
      setDraft(value);       // Revert to original value
      setIsEditing(false);   // Exit without saving
    }
  }, [commit, value]);

  // ── EDIT MODE ───────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="h-full flex items-center px-2">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="w-full h-6 bg-white border-2 border-red-600 rounded px-1.5 text-xs
                     text-black outline-none
                     focus:ring-2 focus:ring-red-400"
        />
      </div>
    );
  }

  // ── DISPLAY MODE ────────────────────────────────────────────
  return (
    <div
      onClick={() => setIsEditing(true)}
      className="h-full flex items-center px-2 cursor-pointer
                 hover:bg-red-50 transition-colors truncate"
      title={value || placeholder}
    >
      <span className={`text-xs truncate ${value ? 'text-black' : 'text-gray-400'}`}>
        {value || placeholder}
      </span>
    </div>
  );
}
