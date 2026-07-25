'use client';
/**
 * components/tier-list/EarphoneCard.tsx
 * =============================================================
 * Draggable Earphone Card Component
 * =============================================================
 *
 * WHAT IS THIS COMPONENT?
 *   A small, draggable "chip" or "card" representing one earphone.
 *   These cards appear both inside tier rows AND in the unranked pool.
 *   Users pick them up (click and drag) and drop them into tier rows.
 *
 * KEY CONCEPT: useDraggable (from @dnd-kit/core)
 *   `useDraggable` is a React Hook provided by the @dnd-kit library.
 *   It makes a DOM element draggable by the user's pointer (mouse/touch).
 *
 *   It returns several things we attach to the element:
 *     - `setNodeRef` — a function we pass as `ref` to the element.
 *       This tells dnd-kit which DOM element IS the draggable thing.
 *     - `attributes` — accessibility properties (aria-* attributes for
 *       keyboard users and screen readers). Always spread these.
 *     - `listeners` — event handlers (onPointerDown, etc.) that trigger
 *       the drag. Without spreading these, dragging won't start.
 *     - `transform` — the current x/y offset while dragging.
 *       We convert this to a CSS `transform` string to visually move
 *       the element while it's being dragged.
 *     - `isDragging` — true while this element is actively being dragged.
 *
 * KEY CONCEPT: CSS.Translate.toString (from @dnd-kit/utilities)
 *   While dragging, dnd-kit gives us a `transform` object like:
 *     { x: 120, y: -30, scaleX: 1, scaleY: 1 }
 *   This means "the user has moved their pointer 120px right and 30px up."
 *   We need to convert this to a CSS string: "translate3d(120px, -30px, 0)"
 *   CSS.Translate.toString() does this conversion for us.
 *
 * KEY CONCEPT: isOverlay prop
 *   When dnd-kit renders the DragOverlay (the ghost card that follows the cursor),
 *   it clones this component. We pass isOverlay=true to the overlay copy so
 *   it can show slightly different styles (grabbing cursor, full opacity, shadow).
 * =============================================================
 */

// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useDraggable } from '@dnd-kit/core';
// ↑ The Hook that makes an element draggable.

import { CSS } from '@dnd-kit/utilities';
// ↑ Utility functions from dnd-kit. We use CSS.Translate.toString() to
//   convert the transform object to a CSS string.

import type { DraggableItem } from './types';
// ↑ The type of the item data this card displays.
// ─────────────────────────────────────────────────────────────────────────────


// ── PROPS INTERFACE ────────────────────────────────────────────────────────────
interface Props {
  item: DraggableItem; // The earphone data to display on this card
  isOverlay?: boolean; // Optional: true when rendered inside DragOverlay
  //                      The `?` makes it optional — callers don't have to provide it.
  //                      If not provided, it defaults to undefined (treated as false).
}


// ── STAR RATING RENDERER ───────────────────────────────────────────────────────
//
// A small helper function that returns the right JSX for displaying a star rating.
// We define it OUTSIDE the component so it's not re-created on every render.
//
// PARAMETER: stars: number | null
//   Either a decimal number (like 9.5) or null (not rated).
// ─────────────────────────────────────────────────────────────────────────────
function StarDisplay({ stars }: { stars: number | null }) {
  // null means "not rated yet"
  if (stars === null) {
    return (
      <span className="text-zinc-500 text-xs">Unrated</span>
    );
  }

  // Generate filled and empty stars based on the rating (out of 10, shown as /5 visually)
  // We divide by 2 to convert a 0–10 scale to a 0–5 star scale.
  const outOf5 = stars / 2;
  const fullStars = Math.floor(outOf5);         // whole stars
  const hasHalfStar = outOf5 - fullStars >= 0.5; // is there a half star?
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <span className="flex items-center gap-0.5">
      {/* Array(n).fill(0).map(...) — creates an array of n items and maps over it.
        * This is a common React pattern for rendering N copies of something.
        * key={i} — React requires a unique `key` prop on list items so it can
        *   efficiently update the DOM. We use the index `i` as the key here.
        */}
      {Array(fullStars).fill(0).map((_, i) => (
        <span key={`full-${i}`} className="text-amber-400 text-xs">★</span>
      ))}
      {hasHalfStar && <span className="text-amber-400 text-xs opacity-60">★</span>}
      {Array(emptyStars).fill(0).map((_, i) => (
        <span key={`empty-${i}`} className="text-zinc-600 text-xs">★</span>
      ))}
      <span className="text-zinc-400 text-xs ml-0.5">{stars}</span>
    </span>
  );
}


// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function EarphoneCard({ item, isOverlay = false }: Props) {
  //                                               ↑ `= false` is a default parameter value.
  //                                                 If isOverlay is not passed by the caller,
  //                                                 it defaults to false.

  // ── useDraggable Hook ────────────────────────────────────────────────────────
  //
  // WHAT IS A REACT HOOK?
  //   A Hook is a special function provided by React (or a library like dnd-kit)
  //   that "hooks into" React's internal systems.
  //
  //   React Hooks have two rules:
  //   1. Only call them at the TOP LEVEL of a component function — never inside
  //      loops, conditions, or nested functions. React relies on the ORDER hooks
  //      are called to track their state correctly.
  //   2. Only call them inside React function components or other custom Hooks.
  //      Never in plain JavaScript functions or class components.
  //
  // useDraggable({ id }) — registers this element as a draggable.
  //   `id`: a unique string identifier for this draggable element.
  //   We use `item.id` which is "item-1", "ear-8", etc.
  //   dnd-kit uses this id to track which element is being dragged.
  // ─────────────────────────────────────────────────────────────────────────────
  const {
    attributes,  // object: aria-* accessibility attributes
    listeners,   // object: pointer/keyboard event handlers for drag initiation
    setNodeRef,  // function: attach this to the element's `ref` prop
    transform,   // object | null: { x, y, scaleX, scaleY } while dragging
    isDragging,  // boolean: true while this specific card is being dragged
  } = useDraggable({
    id: item.id,
    // `data` allows passing extra info to the onDragEnd handler.
    // We pass the item itself so we can access it in TierListEditor.
    data: { item },
  });

  // ── Build inline style ───────────────────────────────────────────────────────
  //
  // WHAT IS THE STYLE PROP?
  //   In React JSX, `style` accepts a JavaScript OBJECT (not a CSS string).
  //   Each CSS property is written in camelCase:
  //     CSS: "background-color"  →  JS style object: backgroundColor
  //     CSS: "border-radius"     →  JS style object: borderRadius
  //
  // CSS.Translate.toString(transform):
  //   Converts { x: 120, y: -30, scaleX: 1, scaleY: 1 } → "translate3d(120px, -30px, 0)"
  //   When transform is null (not currently dragging), toString(null) returns "".
  //
  // WHY translate3d INSTEAD OF translate?
  //   translate3d activates GPU hardware acceleration in the browser.
  //   This makes the drag animation 60fps+ smooth — no jank or stuttering.
  //   `translate(x, y)` uses CPU which can stutter on slower devices.
  // ─────────────────────────────────────────────────────────────────────────────
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    // While dragging, make the ORIGINAL card semi-transparent.
    // The fully opaque "ghost" card following the cursor is the DragOverlay.
    // This visual separation makes it clear which card is being moved.
    opacity: isDragging ? 0.35 : 1,
    // Change cursor to show "grabbing" interaction state.
    cursor: isOverlay ? 'grabbing' : 'grab',
    // The overlay copy should appear above everything else.
    zIndex: isOverlay ? 9999 : undefined,
  };

  // ── JSX ─────────────────────────────────────────────────────────────────────
  //
  // The `ref={setNodeRef}` prop:
  //   In React, `ref` is a special prop that gives you a reference to the
  //   actual DOM element. We pass `setNodeRef` so dnd-kit can measure the
  //   element's position and size for collision detection.
  //
  // `{...attributes}` spread syntax:
  //   `{...object}` in JSX spreads all properties of the object as individual props.
  //   If attributes = { role: "button", tabIndex: 0, "aria-pressed": false },
  //   then {...attributes} is equivalent to:
  //     role="button" tabIndex={0} aria-pressed={false}
  //
  // `{...listeners}` spread:
  //   Same idea — attaches all the event handlers dnd-kit needs.
  //   These handle onPointerDown, onKeyDown, etc. for drag initiation.
  //
  // TAILWIND CLASSES:
  //   select-none      → user-select: none (prevents text selection while dragging)
  //   touch-action-none → tells the browser not to scroll when touching this element
  //   (mobile drag support)
  //   transition-all   → animate all CSS property changes
  //   duration-150     → animation duration: 150ms (snappy feel)
  //   rounded-xl       → border-radius: 0.75rem (12px) — noticeably rounded
  //   ring-2 ring-white/20 → a subtle white border ring when in overlay mode
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        relative select-none touch-action-none
        bg-zinc-700/80 border border-zinc-600/50
        rounded-xl px-3 py-2.5
        min-w-[130px] max-w-[200px]
        transition-all duration-150
        hover:bg-zinc-600/80 hover:border-zinc-500
        hover:-translate-y-0.5 hover:shadow-lg
        ${isOverlay
          ? 'shadow-2xl ring-2 ring-white/20 scale-105'
          : ''
        }
      `}
    >
      {/* Brand name — white, bold */}
      <p className="text-white text-xs font-bold leading-tight truncate">
        {item.brand}
      </p>

      {/* Model name — lighter grey */}
      <p className="text-zinc-300 text-xs leading-tight truncate mt-0.5">
        {item.model}
      </p>

      {/* Price — small dim text */}
      <p className="text-zinc-500 text-xs mt-1">${item.price}</p>

      {/* Star rating row */}
      <div className="mt-1.5">
        <StarDisplay stars={item.userStars} />
      </div>
    </div>
  );
}
