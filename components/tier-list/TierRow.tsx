'use client';
/**
 * components/tier-list/TierRow.tsx
 * =============================================================
 * Droppable Tier Row Component
 * =============================================================
 *
 * WHAT IS THIS COMPONENT?
 *   One horizontal colored row in the tier list. Examples:
 *     ▌ S-Tier [gold border] │ [Moondrop Aria] [7Hz Zero] ...
 *     ▌ A-Tier [green border] │ [CCA CRA] ...
 *     ▌ Garbage [red border] │ [Sony MDR-EX15AP]
 *
 *   The left colored border is applied dynamically from `tier.colorHex`
 *   (a database value — can't be a Tailwind class, must use style prop).
 *
 * KEY CONCEPT: useDroppable (from @dnd-kit/core)
 *   `useDroppable` makes an area accept dropped elements.
 *   It works alongside `useDraggable` — when a draggable element
 *   is released over a droppable area, dnd-kit fires the onDragEnd event.
 *
 *   It returns:
 *     - `setNodeRef` — attach to the element that is the drop target.
 *     - `isOver`     — true when a draggable is currently hovering over this area.
 *       We use `isOver` to visually highlight the row: "you can drop here!"
 *
 * KEY CONCEPT: Visual Feedback
 *   Good drag-and-drop UX requires visual feedback at every step:
 *   - DRAG START: the original card becomes semi-transparent (in EarphoneCard).
 *   - HOVERING: the tier row glows and highlights (in this component, with isOver).
 *   - DROP: the card appears in the new row (handled by TierListEditor's state).
 *   Without these cues, drag-and-drop feels confusing and unresponsive.
 * =============================================================
 */

// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useState } from 'react';
// ↑ useState: a React Hook for managing local state in this component.
//   We use it to track whether the color picker popover is open.

import { useDroppable } from '@dnd-kit/core';
// ↑ Makes this component a valid drag-and-drop target.

import type { ListTier, DraggableItem } from './types';
import EarphoneCard from './EarphoneCard';
// ↑ We render one EarphoneCard per item inside this tier row.
// ─────────────────────────────────────────────────────────────────────────────


// ── PROPS INTERFACE ────────────────────────────────────────────────────────────
interface Props {
  tier: ListTier;            // The tier row data (name, color, rank order)
  items: DraggableItem[];    // Earphones currently placed in this tier
  onColorChange: (tierId: number, newColor: string) => void;
  // ↑ A CALLBACK function passed from the parent (TierListEditor).
  //   When the user picks a new color, we call this function to update
  //   the color in the parent's state.
  //
  // WHY PASS A CALLBACK INSTEAD OF UPDATING DIRECTLY?
  //   The tier row doesn't "own" the tier data — TierListEditor does.
  //   React data always flows DOWN (parent → child via props).
  //   To send data UP (child → parent), we use callback functions.
  //   The parent defines the function and passes it down; the child calls it.
  //   This pattern is called "lifting state up."
}


// ── COMPONENT DEFINITION ───────────────────────────────────────────────────────
export default function TierRow({ tier, items, onColorChange }: Props) {

  // ── useState: Color Picker Visibility ────────────────────────────────────────
  //
  // WHAT IS useState?
  //   useState is the most fundamental React Hook. It lets a component
  //   remember a value that can change over time. When state changes,
  //   React automatically re-renders the component to show the new value.
  //
  // SYNTAX: const [value, setValue] = useState(initialValue);
  //   - `value` — the current state value. Read-only — never set it directly.
  //   - `setValue` — a function to UPDATE the state. Calling it triggers a re-render.
  //   - `initialValue` — the starting value (used only on the FIRST render).
  //
  // EXAMPLE OF STATE IN ACTION:
  //   Initially: showColorPicker = false (picker is hidden)
  //   User clicks "Change Color": setShowColorPicker(true) → React re-renders
  //   Now:       showColorPicker = true  (picker appears)
  //   User picks a color: setShowColorPicker(false) → React re-renders
  //   Now:       showColorPicker = false (picker hides again)
  //
  // WHY NOT JUST USE A REGULAR VARIABLE?
  //   If you wrote: let showPicker = false; setShowPicker = () => { showPicker = true; }
  //   The variable changes but React doesn't know about it.
  //   React would NOT re-render, so the UI would never update.
  //   useState is the mechanism that ties your data changes to UI updates.
  // ─────────────────────────────────────────────────────────────────────────────
  const [showColorPicker, setShowColorPicker] = useState(false);

  // ── useDroppable Hook ─────────────────────────────────────────────────────────
  //
  // `id`: must be UNIQUE across all droppable areas on the page.
  //   We use String(tier.id) to convert the numeric tier ID to a string.
  //   String(1) → "1", String(42) → "42"
  //   dnd-kit uses this id in onDragEnd: `over.id` will equal this string.
  //   In TierListEditor, we use `over.id` to know which tier was dropped into.
  // ─────────────────────────────────────────────────────────────────────────────
  const { setNodeRef, isOver } = useDroppable({
    id: String(tier.id),
  });

  // ── Color picker change handler ───────────────────────────────────────────────
  //
  // EVENT HANDLER PATTERN: (event) => { ... }
  //   This is an arrow function that handles the browser event when the user
  //   picks a new color from the HTML color input.
  //
  // event.target.value — the color input's current value as a hex string: "#ff0000"
  //
  // We call onColorChange (the callback from the parent) to pass the new color up.
  // ─────────────────────────────────────────────────────────────────────────────
  function handleColorChange(event: React.ChangeEvent<HTMLInputElement>) {
    onColorChange(tier.id, event.target.value);
  }

  // ── JSX RETURN ─────────────────────────────────────────────────────────────
  return (
    <div
      ref={setNodeRef}  // Register this element as the droppable area
      className={`
        flex min-h-[88px] rounded-xl border-l-8
        transition-all duration-200
        ${isOver
          // isOver = true: user is hovering a card over this tier row
          // Add a ring and lighten the background as visual "drop here!" feedback
          ? 'bg-zinc-700/70 ring-2 ring-white/20 shadow-lg'
          // isOver = false: normal resting state
          : 'bg-zinc-800/60 border-zinc-700/30 hover:bg-zinc-800'
        }
      `}
      style={{
        // Dynamic left border color — from the database tier color.
        // We can't use a Tailwind class like `border-l-[${tier.colorHex}]`
        // because Tailwind v4 only generates classes it can see at build time.
        // Dynamic database values must always use the `style` prop.
        borderLeftColor: tier.colorHex,
        // When dragging over, add a glow shadow using the tier's color.
        // `+ '40'` appends hex opacity: 40 = 25% opacity glow.
        boxShadow: isOver ? `0 0 30px ${tier.colorHex}40` : undefined,
      }}
    >

      {/* ── LEFT LABEL SECTION ─────────────────────────────────────────────── */}
      <div
        className="w-32 flex-shrink-0 flex flex-col items-center justify-center gap-2 p-3 border-r border-zinc-700/40"
        style={{
          // Subtle colored background on the label area — 15% opacity tint.
          // This ties the label color to the tier row color without being
          // too loud. The `+ '26'` appends hex '26' = ~15% opacity.
          backgroundColor: tier.colorHex + '26',
        }}
      >
        {/* TIER NAME */}
        <span
          className="text-base font-black tracking-tight text-center leading-tight"
          style={{ color: tier.colorHex }}
        >
          {tier.name}
        </span>

        {/* ── COLOR PICKER BUTTON ──────────────────────────────────────────── */}
        {/*
         * The color picker uses the NATIVE HTML <input type="color"> element.
         * This opens the operating system's built-in color picker dialog.
         * No third-party library needed — fully supported in all modern browsers.
         *
         * We use a trick to style it: the input is invisible but overlays a button.
         * When the user clicks the visible button, they're really clicking the input.
         *
         * ALTERNATIVELY, we could use:
         *   setShowColorPicker(true) → render a custom popover with color swatches
         * But native <input type="color"> is simpler for now.
         */}
        <div className="relative">
          {/* Visible styled button */}
          <button
            type="button"
            className="text-xs text-zinc-400 hover:text-white border border-zinc-600 hover:border-zinc-400 rounded-md px-2 py-0.5 transition-colors"
            title="Change tier color"
          >
            🎨 Color
          </button>
          {/* Invisible color input overlaid ON TOP of the button */}
          <input
            type="color"
            value={tier.colorHex}
            onChange={handleColorChange}
            // `absolute inset-0` → fills the parent div exactly
            // `opacity-0` → invisible (the button above is what the user sees)
            // `cursor-pointer w-full h-full` → the entire button area is clickable
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            title="Pick a tier color"
          />
        </div>
      </div>

      {/* ── EARPHONE CARDS AREA ─────────────────────────────────────────────── */}
      {/*
       * This area holds the draggable earphone cards.
       * `flex flex-wrap` → cards wrap to the next line when they run out of space
       * `gap-2`          → 8px gap between cards
       * `p-3`            → 12px padding inside the card area
       * `flex-1`         → takes up all remaining width after the label
       * `items-start`    → cards align to the top, not center
       * `content-start`  → wrapped rows also stay at the top
       */}
      <div className="flex flex-wrap gap-2 p-3 flex-1 items-start content-start">

        {/*
         * ARRAY RENDERING with .map():
         * `items` is an array of DraggableItem objects.
         * `.map()` transforms each item into a JSX element (EarphoneCard).
         * React renders all returned JSX elements.
         *
         * KEYWORD: key={item.id}
         *   React requires a unique `key` prop on every element in a list.
         *   This helps React efficiently update the DOM when items are added,
         *   removed, or reordered — it can identify which card changed.
         *   Without key, React re-renders ALL items on any change (slow).
         *   With key, React only re-renders the changed items (fast).
         */}
        {items.map(item => (
          <EarphoneCard key={item.id} item={item} />
        ))}

        {/* EMPTY STATE: shown when no items are in this tier yet */}
        {items.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm py-2">
            {/* isOver changes the empty state message too */}
            {isOver
              ? <span className="text-zinc-400 font-medium">Drop here!</span>
              : <span>Drag earphones here to rank them</span>
            }
          </div>
        )}
      </div>
    </div>
  );
}
