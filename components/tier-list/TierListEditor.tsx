'use client';
/**
 * components/tier-list/TierListEditor.tsx
 * =============================================================
 * THE ORCHESTRATOR — Interactive Tier List Editor
 * =============================================================
 *
 * WHAT IS THIS COMPONENT?
 *   The main controller component for the entire tier list editing experience.
 *   It:
 *     1. Owns ALL the state (which earphone is in which tier).
 *     2. Sets up the DnD context that makes drag-and-drop work.
 *     3. Renders all child components and passes them what they need.
 *     4. Handles the logic of WHAT HAPPENS when a card is dropped.
 *
 * WHY IS THIS A SEPARATE COMPONENT FROM page.tsx?
 *   page.tsx is a Server Component — it can't use React Hooks like useState.
 *   useState, useEffect, and all interactivity REQUIRE a Client Component.
 *   By splitting them:
 *     - page.tsx = Server: fetches data once, renders fast, SEO-friendly.
 *     - TierListEditor = Client: handles all user interactions.
 *
 * STATE MANAGEMENT DEEP DIVE:
 *   This component uses a "zones" state object to track every earphone's location.
 *   The shape is: Record<string, DraggableItem[]>
 *
 *   Imagine it as a whiteboard divided into sections:
 *     {
 *       "unranked": [Tangzu Wan'er, Moondrop Chu II, KZ ZAS, ...],
 *       "1":        [7Hz Salnotes Zero, Moondrop Aria],    ← S-Tier (id=1)
 *       "2":        [CCA CRA, Tripowin Olina SE],           ← A-Tier (id=2)
 *       "3":        [KZ ZSN Pro X],                         ← B-Tier (id=3)
 *       "4":        [],                                      ← C-Tier (empty)
 *       "5":        [Sony MDR-EX15AP],                       ← Garbage (id=5)
 *     }
 *
 *   When the user drags "Tangzu Wan'er" from unranked into A-Tier:
 *     zones["unranked"] removes Tangzu Wan'er
 *     zones["2"]        adds Tangzu Wan'er
 *   React detects the state change and re-renders, showing Wan'er in A-Tier.
 *
 * DRAG-AND-DROP LIFECYCLE:
 *   1. User presses pointer on an EarphoneCard → dnd-kit detects drag start.
 *   2. onDragStart fires → we record WHICH item is being dragged (activeItem).
 *   3. User moves pointer → DragOverlay (the ghost card) follows the cursor.
 *   4. User releases pointer over a TierRow → dnd-kit detects the drop.
 *   5. onDragEnd fires → we move the item to the new zone in state.
 *   6. React re-renders → item appears in the new tier row, disappears from old.
 * =============================================================
 */

// ── IMPORTS ────────────────────────────────────────────────────────────────────

// ── React Hooks ───────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
//
// `useState`: stores state that persists across renders and triggers re-renders on change.
//
// `useCallback`: returns a memoized version of a callback function.
// WHY USECALLBACK?
//   Every time a component re-renders, functions defined inside it are
//   recreated (they're new objects in memory). If we pass a function to a
//   child component, the child thinks its props changed (new function object)
//   and may unnecessarily re-render.
//   useCallback(fn, [deps]) creates the function ONCE and only recreates it
//   when values in the `deps` (dependencies) array change.
//   For onColorChange, we only need it recreated when `zones` changes.

// ── @dnd-kit: the drag-and-drop engine ───────────────────────────────────────
import {
  DndContext,        // The Context Provider that wraps everything — enables DnD
  DragOverlay,       // The "ghost" card that follows the cursor while dragging
  PointerSensor,     // Detects mouse/touchpad drag events
  KeyboardSensor,    // Detects keyboard (Tab + Space/Enter) drag events for accessibility
  useSensor,         // Activates a single sensor
  useSensors,        // Combines multiple sensors into one collection
  type DragStartEvent, // TypeScript type for the onDragStart event object
  type DragEndEvent,   // TypeScript type for the onDragEnd event object
} from '@dnd-kit/core';

// ── Our own types and components ──────────────────────────────────────────────
import type { TierListPageData, DraggableItem, ListTier } from './types';
import HeroBanner from './HeroBanner';
import TierRow from './TierRow';
import UnrankedPool from './UnrankedPool';
import EarphoneCard from './EarphoneCard';
// ─────────────────────────────────────────────────────────────────────────────


// ── PROPS INTERFACE ────────────────────────────────────────────────────────────
interface Props {
  data: TierListPageData; // Complete tier list data from the Server Component page
}

// ── ZONE STATE TYPE ────────────────────────────────────────────────────────────
//
// `Record<K, V>` is a TypeScript built-in generic type that means:
//   "An object with keys of type K and values of type V."
//
// Record<string, DraggableItem[]> means:
//   "An object where every key is a string, and every value is an array of DraggableItem."
//
// This maps perfectly to our zones model:
//   { "unranked": [...], "1": [...], "2": [...] }
//   All keys are strings. All values are arrays.
// ─────────────────────────────────────────────────────────────────────────────
type ZoneState = Record<string, DraggableItem[]>;


// =============================================================
// HELPER FUNCTION: buildInitialZones
// =============================================================
//
// Converts the flat data structure from the server (lists of items
// with a tierId field) into the zones object our state needs
// (items grouped by their tier's string ID).
//
// This is called ONCE when the component first mounts.
// After that, all changes are done via state updates (not by calling this again).
//
// We define it OUTSIDE the component so it's only created once, not
// re-created on every render. Since it doesn't use any component state
// or props, it doesn't need to be inside the component.
// =============================================================
function buildInitialZones(data: TierListPageData): ZoneState {
  // Start with an empty object.
  const zones: ZoneState = {};

  // Initialize a zone (empty array) for every tier row.
  // This ensures every tier row has an entry even before items are placed.
  data.tiers.forEach(tier => {
    // String(tier.id) converts number 1 → string "1"
    zones[String(tier.id)] = [];
  });

  // Always initialize the unranked pool zone.
  zones['unranked'] = [];

  // Place the already-ranked items into their correct tier zones.
  data.items.forEach(item => {
    const zoneKey = String(item.tierId); // "1", "2", "3", etc.
    const draggableItem: DraggableItem = {
      id: `item-${item.id}`,          // "item-1", "item-2", etc.
      earphoneId: item.earphoneId,
      brand: item.brand,
      model: item.model,
      price: item.price,
      userStars: item.userStars,
      userNotes: item.userNotes,
    };

    // Safety check: if for some reason a tier zone doesn't exist, skip.
    // `?. push` = "only call push if zones[zoneKey] exists (isn't undefined)."
    zones[zoneKey]?.push(draggableItem);
  });

  // Place unranked earphones into the unranked pool zone.
  data.unranked.forEach(item => {
    zones['unranked'].push(item);
  });

  return zones;
}


// =============================================================
// MAIN COMPONENT
// =============================================================
export default function TierListEditor({ data }: Props) {

  // ── STATE: zones ──────────────────────────────────────────────────────────────
  //
  // `useState` with a LAZY INITIALIZER:
  //   useState(() => buildInitialZones(data))
  //                   ↑ arrow function wrapping the initializer
  //
  // WHY A LAZY INITIALIZER?
  //   Without it: useState(buildInitialZones(data))
  //     buildInitialZones() is called on EVERY render (including re-renders).
  //     This is wasteful — we only need the initial value once.
  //
  //   With it: useState(() => buildInitialZones(data))
  //     React calls this arrow function only on the FIRST render.
  //     On subsequent renders, React ignores the initializer and uses the
  //     current state value instead. More efficient for expensive calculations.
  // ─────────────────────────────────────────────────────────────────────────────
  const [zones, setZones] = useState<ZoneState>(
    () => buildInitialZones(data)
  );

  // ── STATE: tier colors (for live color updates) ───────────────────────────────
  //
  // When the user picks a new color for a tier row, we need to update the color
  // immediately without re-fetching from the server.
  //
  // We store tier colors in local state as a Record<tierId, colorHex>.
  // Initial value: extract colors from data.tiers.
  //
  // `.reduce()` is an array method that accumulates a value:
  //   array.reduce((accumulator, item) => nextAccumulator, initialValue)
  //   Starting from an empty object {}, we add each tier's color keyed by id.
  // ─────────────────────────────────────────────────────────────────────────────
  const [tierColors, setTierColors] = useState<Record<number, string>>(
    () => data.tiers.reduce((acc, tier) => {
      acc[tier.id] = tier.colorHex;
      return acc;
    }, {} as Record<number, string>)
  );

  // ── STATE: activeItem (what's being dragged right now) ────────────────────────
  //
  // While a card is being dragged, we store it here.
  // The DragOverlay renders this item as a "ghost" that follows the cursor.
  // When the drag ends, we reset it to null.
  // ─────────────────────────────────────────────────────────────────────────────
  const [activeItem, setActiveItem] = useState<DraggableItem | null>(null);

  // ── SENSORS: how dnd-kit detects drag gestures ────────────────────────────────
  //
  // `useSensor(PointerSensor, options)`:
  //   Listens for mouse, touch, and stylus (pointer) events.
  //
  //   `activationConstraint: { distance: 8 }`:
  //   A drag only STARTS after the pointer moves 8px from where it was pressed.
  //   WHY? Without this, clicking a card (a tiny tap or accidental movement)
  //   would immediately start a drag. The 8px constraint means you have to
  //   INTENTIONALLY move the element — accidental drags are prevented.
  //
  // `useSensor(KeyboardSensor)`:
  //   Allows keyboard users to drag with Tab (focus) + Space (pick up) + Arrow keys.
  //   This is critical for ACCESSIBILITY — not everyone uses a mouse.
  //
  // `useSensors(...sensors)`:
  //   Combines multiple sensors into one configuration object.
  //   dnd-kit will use whichever sensor detects an interaction first.
  // ─────────────────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );


  // ── EVENT HANDLER: onDragStart ────────────────────────────────────────────────
  //
  // WHEN CALLED: The moment the user starts dragging (pointer moves 8px+).
  // PARAMETER: event (DragStartEvent)
  //   event.active.id = the id of the draggable element being picked up.
  //   event.active.data.current = the `data` object we passed to useDraggable.
  //
  // WHAT WE DO:
  //   Find which DraggableItem matches the active id, then save it in `activeItem`
  //   state. The DragOverlay uses this to render the ghost card.
  //
  // PATTERN: Object.values(obj)
  //   Returns an array of all the VALUES in an object.
  //   Object.values({ a: [1,2], b: [3,4] }) → [[1,2], [3,4]]
  //   We then use .flat() to merge all arrays: [[1,2], [3,4]] → [1,2,3,4]
  //   This gives us a flat list of ALL items across ALL zones to search through.
  // ─────────────────────────────────────────────────────────────────────────────
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;

    // Search ALL zones for the item that matches the dragged id.
    const allItems = Object.values(zones).flat();
    //                       ↑ array of arrays     ↑ merges into one flat array
    const found = allItems.find(item => item.id === active.id);
    //                          ↑ .find() returns the FIRST matching item, or undefined

    // Set activeItem — triggers DragOverlay to render the ghost card.
    setActiveItem(found ?? null);
    //                    ↑ `??` = "if `found` is undefined, use null"
  }


  // ── EVENT HANDLER: onDragEnd ───────────────────────────────────────────────────
  //
  // WHEN CALLED: The user releases the pointer (drops the card).
  // PARAMETER: event (DragEndEvent)
  //   event.active.id = the id of the draggable that was dropped.
  //   event.over.id   = the id of the droppable area it was dropped onto.
  //                     null if dropped outside any droppable.
  //
  // THE IMMUTABLE UPDATE PATTERN:
  //   React state must NEVER be mutated directly. This means:
  //     zones["1"].push(item)  ← WRONG — mutates existing state array
  //
  //   Instead, we create NEW arrays and a NEW state object:
  //     const next = { ...zones }      ← shallow copy of the zones object
  //     next["1"] = [...zones["1"], item]  ← new array for the destination zone
  //     setZones(next)                 ← replace state with the new object
  //
  //   WHY? React compares old state and new state using reference equality.
  //   If we mutate the existing array, the reference stays the same, React
  //   thinks nothing changed, and the component doesn't re-render. Bug!
  //   Creating new arrays/objects gives new references → React detects the change.
  // ─────────────────────────────────────────────────────────────────────────────
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    // Always clear the active item — stops the DragOverlay from rendering.
    setActiveItem(null);

    // `over` is null when dropped outside any droppable area.
    // In that case, do nothing (the card snaps back to its original position).
    if (!over) return;

    const fromZoneKey = findZoneForItem(zones, String(active.id));
    const toZoneKey = String(over.id);

    // If dropped back onto the same zone it came from → no change needed.
    if (!fromZoneKey || fromZoneKey === toZoneKey) return;

    // ── PERFORM THE MOVE ────────────────────────────────────────────────────────
    //
    // setZones(prev => newState) — the FUNCTIONAL UPDATE pattern.
    //
    // WHY FUNCTIONAL UPDATE (prev =>)?
    //   When multiple state updates happen quickly (fast dragging), React
    //   may batch them. Using `setZones(newState)` based on the current
    //   `zones` variable might miss the latest batched state.
    //   Using `setZones(prev => ...)` always receives the MOST RECENT state,
    //   making it safe for rapid updates.
    // ─────────────────────────────────────────────────────────────────────────────
    setZones(prev => {
      // Find the actual item object (we need it to add to the destination).
      const draggedItem = prev[fromZoneKey].find(i => i.id === String(active.id));
      if (!draggedItem) return prev; // safety: item not found, no change

      // Create the new zones object.
      // `{ ...prev }` creates a shallow copy — a new object with the same keys/values.
      // We then overwrite the two affected zones (source and destination).
      return {
        ...prev,
        // SOURCE zone: remove the dragged item using .filter()
        // .filter(fn) returns a NEW array containing only items where fn returns true.
        // We keep all items EXCEPT the one being dragged.
        [fromZoneKey]: prev[fromZoneKey].filter(i => i.id !== String(active.id)),
        //  ↑ [fromZoneKey] is a "computed property key" — use a variable as an object key.
        //  Equivalent to: obj[fromZoneKey] = ...

        // DESTINATION zone: add the dragged item at the end using spread + item.
        [toZoneKey]: [...prev[toZoneKey], draggedItem],
        //             ↑ spread existing items   ↑ append the dropped item at the end
      };
    });
  }


  // ── CALLBACK: onColorChange (passed to TierRow) ───────────────────────────────
  //
  // useCallback(fn, [deps]) — memoizes the function.
  // This function is recreated only when `setTierColors` changes (it never does,
  // so effectively this is created once). Prevents unnecessary TierRow re-renders.
  //
  // When the user picks a new color in TierRow's color picker:
  //   TierRow calls: onColorChange(tier.id, "#ff0000")
  //   We update tierColors state for that tier id.
  //   React re-renders TierRow with the new color (via the updated tierColors prop).
  // ─────────────────────────────────────────────────────────────────────────────
  const handleColorChange = useCallback((tierId: number, newColor: string) => {
    setTierColors(prev => ({
      ...prev,          // keep all existing tier colors
      [tierId]: newColor, // override just the one that changed
    }));
  }, []);


  // ── Merge tier data with live color state ─────────────────────────────────────
  //
  // data.tiers has the ORIGINAL colors from the server.
  // tierColors has potentially UPDATED colors from the user's color picker.
  // We merge them: if a user updated tier 1's color, use the new color.
  //
  // .map() returns a new array where each tier has its colorHex overridden
  // by the live state value (if one exists for that tier id).
  // ─────────────────────────────────────────────────────────────────────────────
  const tiersWithLiveColors: ListTier[] = data.tiers.map(tier => ({
    ...tier,                                 // copy all tier properties
    colorHex: tierColors[tier.id] ?? tier.colorHex, // use live color if set, else original
  }));


  // ── JSX RETURN ─────────────────────────────────────────────────────────────
  //
  // WHAT IS DndContext?
  //   DndContext is a React "Provider" — a component that wraps children and
  //   makes shared data (drag state, drop detection, sensors) available to
  //   ALL descendant components without manually passing it through props.
  //
  //   Any component inside DndContext can use useDroppable/useDraggable Hooks.
  //   Components outside DndContext cannot — the Hooks would throw an error.
  //
  //   This is the same "Context" pattern used by React Router, Redux, etc.
  //   It solves "prop drilling" — passing data through many layers of components.
  //
  // WHAT IS DragOverlay?
  //   A special portal component that renders the dragged card's "ghost"
  //   outside the normal DOM flow — directly inside <body>.
  //   This means the ghost card is ALWAYS on top of everything else (z-index
  //   isn't needed) and it can freely move across the entire screen without
  //   being clipped by overflow:hidden on parent elements.
  //
  //   We render `null` inside DragOverlay when activeItem is null (no drag active).
  //   We render a copy of EarphoneCard with isOverlay=true while dragging.
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* ── Full page container ───────────────────────────────────────────────
        * min-h-screen  → at least as tall as the viewport
        * bg-zinc-900   → very dark grey background (#18181b)
        * text-white    → default text color for all descendants
        */}
      <div className="min-h-screen bg-zinc-900 text-white">

        {/* HERO BANNER — the banner image / gradient + title + buttons */}
        <HeroBanner meta={data.meta} />

        {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
        {/* A slim info bar showing a quick summary of the tier list */}
        <div className="bg-zinc-800/50 border-b border-zinc-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-6 text-sm text-zinc-400 overflow-x-auto">
            <span className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-zinc-300 font-semibold">{data.tiers.length}</span> tiers
            </span>
            <span className="text-zinc-600">·</span>
            <span className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-zinc-300 font-semibold">
                {/* Count all items across all tier zones (exclude unranked) */}
                {Object.entries(zones)
                  .filter(([key]) => key !== 'unranked')
                  .reduce((total, [, items]) => total + items.length, 0)}
              </span> ranked
            </span>
            <span className="text-zinc-600">·</span>
            <span className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-zinc-300 font-semibold">{zones['unranked']?.length ?? 0}</span> unranked
            </span>
            <span className="ml-auto flex-shrink-0 text-xs text-zinc-600">
              Drag cards to re-rank · Changes auto-save (coming soon)
            </span>
          </div>
        </div>

        {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

          {/* ── TIER ROWS ──────────────────────────────────────────────────── */}
          {/*
           * Render one TierRow component for each tier in the list.
           * tiersWithLiveColors is sorted by rankOrder (from the DB query).
           *
           * For each tier, we pass:
           *   tier={tier}                 → the tier metadata (name, color, etc.)
           *   items={zones[String(tier.id)]} → the current items in this tier
           *   onColorChange={handleColorChange} → color update callback
           *
           * `?? []` → if zones[String(tier.id)] is undefined (shouldn't happen,
           *           but as a safety net), use an empty array.
           */}
          <div className="flex flex-col gap-2.5">
            {tiersWithLiveColors.map(tier => (
              <TierRow
                key={tier.id}
                tier={tier}
                items={zones[String(tier.id)] ?? []}
                onColorChange={handleColorChange}
              />
            ))}
          </div>

          {/* ── UNRANKED POOL ──────────────────────────────────────────────── */}
          <UnrankedPool items={zones['unranked'] ?? []} />
        </div>
      </div>

      {/* ── DRAG OVERLAY ──────────────────────────────────────────────────────
        *
        * DragOverlay renders OUTSIDE the normal React tree — directly inside
        * the document body. This ensures the ghost card floats above everything.
        *
        * Inside DragOverlay, we render a copy of EarphoneCard for the item
        * currently being dragged. The isOverlay prop:
        *   - Disables useDraggable inside this copy (the overlay isn't draggable itself)
        *   - Changes cursor to 'grabbing'
        *   - Adds extra shadow and slight scale for the "picked up" effect
        *
        * When no drag is happening (activeItem is null):
        *   We render null inside DragOverlay → nothing extra rendered.
        *
        * dropAnimation={{ duration: 300, easing: 'ease' }}:
        *   After a successful drop, the ghost smoothly animates to the
        *   drop target position and fades out. Duration: 300ms.
        */}
      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {activeItem ? (
          <EarphoneCard item={activeItem} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}


// =============================================================
// HELPER FUNCTION (outside component for performance)
// =============================================================

/**
 * findZoneForItem
 * Searches all zones to find which zone key an item (by its id) currently lives in.
 *
 * @param zones - The current ZoneState object
 * @param itemId - The id of the DraggableItem to find (e.g., "item-1", "ear-8")
 * @returns The zone key (e.g., "1", "unranked") or undefined if not found
 */
function findZoneForItem(zones: ZoneState, itemId: string): string | undefined {
  // Object.entries() returns an array of [key, value] pairs.
  // Example: Object.entries({ a: [1], b: [2] }) → [["a", [1]], ["b", [2]]]
  //
  // We search through all [zoneKey, items] pairs.
  // .find() returns the first pair where the condition is true.
  // The condition: does the items array contain an item with our target id?
  const entry = Object.entries(zones).find(
    ([, items]) => items.some(item => item.id === itemId)
    //                         ↑ .some(fn) returns true if ANY item satisfies fn
    //  ↑ [, items] destructures [key, value] but ignores the key with `,`
  );

  // entry is [zoneKey, items] or undefined. We want just the key.
  return entry?.[0]; // entry?.[0] → safely access index 0 (the key) if entry exists
}
