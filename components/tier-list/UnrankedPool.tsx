'use client';
/**
 * components/tier-list/UnrankedPool.tsx
 * =============================================================
 * Unranked Earphone Pool — The Source Zone
 * =============================================================
 *
 * WHAT IS THIS COMPONENT?
 *   The bottom section of the tier list editor that holds all earphones
 *   that haven't been placed into a tier yet. It looks like:
 *
 *   ┌────────────────────────────────────────────────────────┐
 *   │  UNRANKED POOL                                         │
 *   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
 *   │  │ Tangzu   │ │ Moondrop │ │ KZ ZAS   │ │ BLON     │  │
 *   │  │ Wan'er   │ │ Chu II   │ │          │ │ BL-03    │  │
 *   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
 *   └────────────────────────────────────────────────────────┘
 *
 *   Users drag earphones OUT of this pool INTO tier rows.
 *   Users drag earphones back into this pool to "unrank" them.
 *
 * KEY CONCEPT: "Source" vs "Target" Drop Zones
 *   In drag-and-drop terminology:
 *   - SOURCE: where the drag starts (the pool or a tier row).
 *   - TARGET: where the item is dropped (a tier row or the pool).
 *
 *   Both the pool AND the tier rows are droppable.
 *   The pool is special — it's both the initial source AND a valid target
 *   (so users can drag from any tier back to the unranked state).
 *
 *   The id "unranked" is recognized in TierListEditor's onDragEnd handler:
 *     if (over.id === 'unranked') { ... move item to unranked pool ... }
 * =============================================================
 */

// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useDroppable } from '@dnd-kit/core';
// ↑ Same Hook as in TierRow — makes this area accept dropped items.

import type { DraggableItem } from './types';
import EarphoneCard from './EarphoneCard';
// ─────────────────────────────────────────────────────────────────────────────


// ── PROPS INTERFACE ────────────────────────────────────────────────────────────
interface Props {
  items: DraggableItem[]; // Earphones currently in the unranked pool
}


// ── COMPONENT DEFINITION ───────────────────────────────────────────────────────
export default function UnrankedPool({ items }: Props) {

  // ── useDroppable with id="unranked" ───────────────────────────────────────────
  //
  // The string "unranked" is the unique identifier for this drop zone.
  // In TierListEditor's onDragEnd handler:
  //   over.id === 'unranked' → the user dropped onto THIS area.
  //   over.id === '1' → dropped onto tier row with id=1.
  //   over.id === '3' → dropped onto tier row with id=3.
  //
  // The id must be a string. All tier row ids are numeric strings ("1", "2", etc.).
  // "unranked" is deliberately non-numeric so there's no ID collision.
  // ─────────────────────────────────────────────────────────────────────────────
  const { setNodeRef, isOver } = useDroppable({ id: 'unranked' });

  return (
    <div className="mt-8 pb-8">

      {/* ── Section header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
            Unranked Pool
          </h3>
          {/* Item count badge */}
          <span className="bg-zinc-700 text-zinc-300 text-xs font-mono px-2 py-0.5 rounded-full">
            {/* items.length: the number of items in the array.
              * If items = [a, b, c], items.length = 3.
              */}
            {items.length} earphone{items.length !== 1 ? 's' : ''}
            {/* 
              * CONDITIONAL PLURALIZATION:
              *   items.length !== 1 ? 's' : ''
              * If count is NOT 1 → append 's' (plural: "3 earphones")
              * If count IS 1    → append '' (singular: "1 earphone")
              */}
          </span>
        </div>
        <p className="text-zinc-600 text-xs">Drag earphones into tiers above to rank them</p>
      </div>

      {/* ── The droppable pool area ──────────────────────────────────────────── */}
      <div
        ref={setNodeRef}
        className={`
          min-h-[140px] rounded-2xl border-2 border-dashed p-4
          flex flex-wrap gap-2 items-start content-start
          transition-all duration-200
          ${isOver
            // HOVERING STATE: user is dragging a card over this pool.
            // Border becomes visible (zinc-500) and background lightens.
            ? 'border-zinc-500 bg-zinc-800'
            // RESTING STATE: dashed border, semi-transparent background.
            // The `/50` suffix on Tailwind colors means 50% opacity.
            : 'border-zinc-700 bg-zinc-800/50'
          }
        `}
      >
        {/*
         * CONDITIONAL RENDERING PATTERN:
         *   {items.length > 0 ? <A> : <B>}
         *   If there are items → render the earphone cards (option A).
         *   If the pool is empty → render an empty state message (option B).
         *
         * This is the TERNARY OPERATOR:  condition ? valueIfTrue : valueIfFalse
         */}
        {items.length > 0 ? (
          // RENDER EARPHONE CARDS
          items.map(item => (
            <EarphoneCard key={item.id} item={item} />
          ))
        ) : (
          // EMPTY STATE
          <div className="w-full flex flex-col items-center justify-center py-8 gap-2">
            <div className="text-4xl opacity-30">🎧</div>
            <p className="text-zinc-500 text-sm text-center">
              {isOver
                ? '✨ Drop here to unrank'
                : 'All earphones have been ranked! Drag from a tier row to unrank.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
