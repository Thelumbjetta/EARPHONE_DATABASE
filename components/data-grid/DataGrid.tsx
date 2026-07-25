'use client';

/**
 * components/data-grid/DataGrid.tsx
 * =============================================================
 * Main Data Grid — Orchestrator Component
 * =============================================================
 *
 * WHAT DOES THIS COMPONENT DO?
 *   This is the ROOT COMPONENT of the entire data grid. It:
 *     1. Holds ALL IEM entry data in React state.
 *     2. Groups entries into price brackets.
 *     3. Renders the sticky column header row.
 *     4. Renders each bracket group (which in turn renders rows).
 *     5. Manages the review drawer (open/close, selected entry).
 *     6. Provides the update handler that flows down to every cell.
 *
 *   Think of this component as the "brain" — it holds the data
 *   and distributes it to the child components. The children are
 *   the "limbs" that render specific visual elements.
 *
 * VISUAL THEME (Red/White/Black):
 *   - Page background: white
 *   - Title bar: bg-red-950 (deep red) with white text
 *   - Column headers: bg-red-900 with white text
 *   - Rows: white with black text, red heatmap cells
 *   - Bracket headers: bg-red-950 with white text
 *
 * DATA FLOW (One-Way, Top-Down):
 *   DataGrid (state lives here)
 *     └─ BracketGroup (receives bracket + entries)
 *          └─ DataRow (receives single entry)
 *               ├─ HeatmapCell (receives value + onChange)
 *               ├─ StarRating (receives value + onChange)
 *               └─ EditableCell (receives value + onChange)
 *
 *   When a cell is edited, the onChange callback flows BACK UP
 *   to DataGrid's `handleUpdate`, which calls `setEntries` to
 *   update the state. React then re-renders the changed row
 *   with the new value. This is called "lifting state up."
 *
 * KEYWORD: 'use client'
 *   This component uses React hooks (useState, useMemo, useCallback)
 *   and must run in the browser. The `'use client'` directive tells
 *   Next.js to include it in the client-side JavaScript bundle.
 * =============================================================
 */

import { useState, useMemo, useCallback } from 'react';
import type { IEMEntry } from './types';
import { PRICE_BRACKETS, GRID_COLUMNS } from './types';
import BracketGroup from './BracketGroup';
import ReviewDrawer from './ReviewDrawer';


// =============================================================
// MOCK DATA
// =============================================================
//
// Realistic IEM entries spanning all five price brackets.
// Each entry has all 12 column values pre-filled.
//
// This data is used for development and testing. In production,
// it would be fetched from the PostgreSQL database and passed
// in via the `initialData` prop.
//
// NOTE: All scores are subjective and based on the HBB review
// style. They are illustrative, not official ratings.
// =============================================================

const INITIAL_DATA: IEMEntry[] = [

  // ────────────────────────────────────────────────────────────
  // FLAGSHIPS ($2000+)
  // ────────────────────────────────────────────────────────────
  {
    id: 'iem-01',
    brand: '64 Audio',
    model: 'U12t',
    price: 2000,
    qcStars: 5,
    graphUrl: 'https://crinacle.com/graphs/iems/64-audio-u12t/',
    source: 'Purchased',
    bass: 9.0, mids: 9.2, treble: 8.8, tonality: 9.5, technicality: 9.6, biasPref: 9.0,
    reviewNotes: 'The benchmark flagship. Incredibly coherent, natural tonality with outstanding technical performance. Bass is tight and authoritative without bleed. Mids are smooth and well-textured. Treble is airy but never harsh. Soundstage is above average for a BA set. The U12t has been my reference point for years — everything else gets compared to this.',
  },
  {
    id: 'iem-02',
    brand: 'Empire Ears',
    model: 'Odin',
    price: 3400,
    qcStars: 4.5,
    graphUrl: 'https://crinacle.com/graphs/iems/empire-ears-odin/',
    source: 'Tour Unit',
    bass: 9.5, mids: 8.8, treble: 9.2, tonality: 9.0, technicality: 9.8, biasPref: 9.2,
    reviewNotes: 'Tribrid powerhouse. The EST treble extension is stunning. Massive bass shelf from the dual W9 drivers. Some may find the upper mids slightly recessed for vocals, but the technical performance is near-unmatched. Build quality and packaging are immaculate — Empire Ears knows how to make a premium product feel premium.',
  },
  {
    id: 'iem-03',
    brand: 'Vision Ears',
    model: 'Phönix',
    price: 2900,
    qcStars: 5,
    graphUrl: '',
    source: 'Loaner',
    bass: 9.3, mids: 9.5, treble: 9.0, tonality: 9.6, technicality: 9.4, biasPref: 9.5,
    reviewNotes: 'Possibly the best-tuned IEM in existence. Dead neutral through the mids with immaculate timbre. Bass is punchy and well-extended without any midbass hump. The treble is smooth silk — detailed without any sibilance. If I could only keep one IEM, this might be it.',
  },

  // ────────────────────────────────────────────────────────────
  // SUMMIT-FI ($500 – $2000)
  // ────────────────────────────────────────────────────────────
  {
    id: 'iem-04',
    brand: 'Moondrop',
    model: 'Variations',
    price: 520,
    qcStars: 4,
    graphUrl: 'https://crinacle.com/graphs/iems/moondrop-variations/',
    source: 'Purchased',
    bass: 9.5, mids: 9.2, treble: 9.1, tonality: 9.3, technicality: 9.4, biasPref: 8.8,
    reviewNotes: 'Exceptional tribrid. The 2DD bass configuration delivers one of the best sub-bass presentations in the IEM world — deep, textured, and visceral. Mids are clean and articulate. EST treble is extended and sparkly without being fatiguing. The value proposition here is insane for what you get.',
  },
  {
    id: 'iem-05',
    brand: 'DUNU',
    model: 'SA6 MK2',
    price: 550,
    qcStars: 4.5,
    graphUrl: 'https://crinacle.com/graphs/iems/dunu-sa6-mk2/',
    source: 'Purchased',
    bass: 9.2, mids: 9.4, treble: 9.0, tonality: 9.5, technicality: 9.1, biasPref: 9.0,
    reviewNotes: 'Full BA set with stunning coherency. The modular tuning switch system is genuinely useful — each configuration sounds intentional, not gimmicky. Default tuning is near-perfect Harman with just enough bass elevation for musicality.',
  },
  {
    id: 'iem-06',
    brand: 'Symphonium',
    model: 'Helios',
    price: 1100,
    qcStars: 3.5,
    graphUrl: 'https://crinacle.com/graphs/iems/symphonium-helios/',
    source: 'Review Unit',
    bass: 8.5, mids: 9.0, treble: 9.5, tonality: 9.2, technicality: 9.7, biasPref: 8.5,
    reviewNotes: 'Treble monster in the best way. The detail retrieval borders on absurd — you will hear things in your music you have never noticed before. Staging is exceptionally wide and layered. Bass is lean but textured and fast. Not for bassheads, but for detail junkies this is nirvana.',
  },
  {
    id: 'iem-07',
    brand: 'Unique Melody',
    model: 'MEST MK2',
    price: 1500,
    qcStars: 4,
    graphUrl: '',
    source: 'Tour Unit',
    bass: 9.0, mids: 8.5, treble: 8.8, tonality: 8.7, technicality: 9.5, biasPref: 8.0,
    reviewNotes: 'The bone conduction driver adds a unique spatial dimension that no other IEM can replicate. Very wide stage with excellent imaging. Bass hits hard and deep. Mids can feel slightly V-shaped on certain tracks. A technical marvel, even if the tuning has minor quirks.',
  },

  // ────────────────────────────────────────────────────────────
  // MID-FI ($300 – $500)
  // ────────────────────────────────────────────────────────────
  {
    id: 'iem-08',
    brand: 'Moondrop',
    model: 'Blessing 3',
    price: 320,
    qcStars: 4,
    graphUrl: 'https://crinacle.com/graphs/iems/moondrop-blessing-3/',
    source: 'Purchased',
    bass: 8.5, mids: 8.8, treble: 8.6, tonality: 8.9, technicality: 8.4, biasPref: 8.2,
    reviewNotes: 'The Blessing line continues to deliver. Neutral-bright signature with excellent timbre through the midrange. Bass is adequate — controlled but not exciting. If you want a reference-tuned IEM at this price, this is the one.',
  },
  {
    id: 'iem-09',
    brand: 'Thieaudio',
    model: 'Monarch MK3',
    price: 450,
    qcStars: 3.5,
    graphUrl: '',
    source: 'Review Unit',
    bass: 9.0, mids: 8.7, treble: 8.5, tonality: 8.8, technicality: 8.6, biasPref: 8.5,
    reviewNotes: 'Tribrid with authoritative bass slam. Mids are slightly warm and lush. Treble could use a touch more air and extension. Overall a very safe, enjoyable listen that few people would dislike.',
  },
  {
    id: 'iem-10',
    brand: 'Yanyin',
    model: 'Canon II',
    price: 380,
    qcStars: 3,
    graphUrl: '',
    source: 'Purchased',
    bass: 8.8, mids: 8.2, treble: 8.0, tonality: 8.3, technicality: 8.0, biasPref: 7.8,
    reviewNotes: 'Fun V-shaped tuning with excellent bass slam. Build is tank-like — heavy but reassuringly solid. The included cable is surprisingly good for the price. A guilty pleasure IEM.',
  },

  // ────────────────────────────────────────────────────────────
  // BUDGET ($100 – $300)
  // ────────────────────────────────────────────────────────────
  {
    id: 'iem-11',
    brand: '7Hz',
    model: 'Timeless AE',
    price: 220,
    qcStars: 3.5,
    graphUrl: 'https://crinacle.com/graphs/iems/7hz-timeless/',
    source: 'Purchased',
    bass: 8.8, mids: 8.2, treble: 8.4, tonality: 8.3, technicality: 9.0, biasPref: 8.0,
    reviewNotes: 'Planar driver with insane speed and resolution for the price. Bass texture is top-tier — you can feel individual bass notes, not just a wall of thump. Treble can be a bit hot for sensitive listeners. Use with foam tips to tame the top end.',
  },
  {
    id: 'iem-12',
    brand: 'Shuoer',
    model: 'S12 Pro',
    price: 170,
    qcStars: 3,
    graphUrl: '',
    source: 'Purchased',
    bass: 8.2, mids: 8.0, treble: 8.5, tonality: 8.0, technicality: 8.8, biasPref: 7.5,
    reviewNotes: 'Another excellent planar. More treble-forward than the Timeless — some might call it bright, others might call it detailed. Resolution punches well above its weight class.',
  },

  // ────────────────────────────────────────────────────────────
  // ULTRA-BUDGET (Under $100)
  // ────────────────────────────────────────────────────────────
  {
    id: 'iem-13',
    brand: 'Truthear',
    model: 'Hexa',
    price: 80,
    qcStars: 4,
    graphUrl: 'https://crinacle.com/graphs/iems/truthear-hexa/',
    source: 'Purchased',
    bass: 7.8, mids: 8.5, treble: 8.0, tonality: 8.6, technicality: 7.5, biasPref: 8.0,
    reviewNotes: 'Crinacle collaboration. Neutral with a slight bass shelf that gives it just enough warmth to not sound clinical. Incredibly clean midrange. Best tuning under $100, period.',
  },
  {
    id: 'iem-14',
    brand: '7Hz',
    model: 'Salnotes Zero',
    price: 20,
    qcStars: 3,
    graphUrl: 'https://crinacle.com/graphs/iems/7hz-salnotes-zero/',
    source: 'Purchased',
    bass: 7.0, mids: 8.0, treble: 7.5, tonality: 8.2, technicality: 6.5, biasPref: 7.5,
    reviewNotes: 'Best sub-$25 IEM. Period. Diffuse-field neutral with slightly warm bass. Incredible value — if someone asks "what IEM should I buy for $20?" the answer is always this.',
  },
  {
    id: 'iem-15',
    brand: 'Moondrop',
    model: 'Chu II',
    price: 20,
    qcStars: 3.5,
    graphUrl: '',
    source: 'Purchased',
    bass: 6.8, mids: 7.8, treble: 7.2, tonality: 8.0, technicality: 6.2, biasPref: 7.0,
    reviewNotes: 'Clean, neutral budget IEM. Classic Moondrop tuning DNA at $20. The spring-loaded ear tips are a nice quality-of-life touch.',
  },
  {
    id: 'iem-16',
    brand: 'CCA',
    model: 'CRA+',
    price: 18,
    qcStars: 2.5,
    graphUrl: '',
    source: 'Purchased',
    bass: 7.5, mids: 7.0, treble: 7.2, tonality: 7.1, technicality: 6.8, biasPref: 7.0,
    reviewNotes: 'V-shaped fun. Surprising bass slam for a chi-fi budget single DD. QC is a lottery though — you might get a great unit or a mediocre one.',
  },
  {
    id: 'iem-17',
    brand: 'Truthear',
    model: 'ZERO:RED',
    price: 55,
    qcStars: 4,
    graphUrl: '',
    source: 'Purchased',
    bass: 8.0, mids: 8.2, treble: 7.8, tonality: 8.5, technicality: 7.2, biasPref: 8.2,
    reviewNotes: 'Dual-driver with Harman-ish tuning. Bass is elevated but controlled — no bloat. Mids are smooth and natural. Excellent daily driver for the price.',
  },
  {
    id: 'iem-18',
    brand: 'KZ',
    model: 'ZSN Pro X',
    price: 22,
    qcStars: 2,
    graphUrl: '',
    source: 'Purchased',
    bass: 7.5, mids: 7.0, treble: 7.2, tonality: 7.1, technicality: 6.8, biasPref: 6.5,
    reviewNotes: 'Decent for the price. Typical KZ V-shape. Treble can sound metallic and artificial. Bass is fun but loose. A fine entry point if expectations are calibrated.',
  },
  {
    id: 'iem-19',
    brand: 'Tangzu',
    model: "Wan'er S.G",
    price: 19,
    qcStars: 3.5,
    graphUrl: '',
    source: 'Purchased',
    bass: 7.2, mids: 7.5, treble: 7.0, tonality: 7.8, technicality: 6.5, biasPref: 7.2,
    reviewNotes: 'Warm, smooth single DD. Great cable and accessories for the price. Non-fatiguing, relaxed listen — perfect for long sessions.',
  },
  {
    id: 'iem-20',
    brand: 'Simgot',
    model: 'EA500LM',
    price: 80,
    qcStars: 4,
    graphUrl: '',
    source: 'Review Unit',
    bass: 8.2, mids: 8.0, treble: 7.8, tonality: 8.0, technicality: 7.5, biasPref: 7.8,
    reviewNotes: 'Tuning switch system at $80 is great value. Default tuning is slightly warm with good bass extension. Detail retrieval is impressive for a single DD at this price.',
  },
];


// =============================================================
// CSS GRID TEMPLATE
// =============================================================
//
// Join all column widths into a single CSS Grid template string.
// This produces something like:
//   "minmax(180px, 2fr) 110px 58px minmax(90px, 1fr) 62px 62px ..."
//
// This string is stored in a CSS custom property `--grid-template`
// on the root container. Both the column header row AND every data
// row reference this variable via `grid-cols-[var(--grid-template)]`,
// guaranteeing their columns align perfectly.
// =============================================================
const gridTemplateValue = GRID_COLUMNS.map((c) => c.width).join(' ');


// ── Component Props ───────────────────────────────────────────
interface DataGridProps {
  /**
   * Optional pre-loaded data. If provided, overrides the mock data.
   * In production, the server component at app/grid/page.tsx would
   * fetch from the database and pass the result here.
   */
  initialData?: IEMEntry[];
}


// =============================================================
// THE MAIN COMPONENT
// =============================================================

export default function DataGrid({ initialData }: DataGridProps) {

  // ── State ───────────────────────────────────────────────────
  //
  // `entries`: The full list of IEM entries. This is the SINGLE
  //   SOURCE OF TRUTH for all data in the grid. Every cell reads
  //   from this state, and every edit writes back to it.
  //
  // `selectedEntry`: The IEM entry currently shown in the review
  //   drawer (or null if the drawer is closed).
  //
  // `drawerOpen`: Whether the review drawer is currently visible.
  //   Separated from selectedEntry because we want the drawer to
  //   animate closed (drawerOpen=false) before we clear the entry
  //   (otherwise the drawer would go blank mid-animation).
  // ────────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<IEMEntry[]>(initialData ?? INITIAL_DATA);
  const [selectedEntry, setSelectedEntry] = useState<IEMEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Group entries by price bracket ──────────────────────────
  //
  // KEYWORD: useMemo
  //   Caches the result of an expensive computation. The grouping
  //   logic only re-runs when `entries` changes — not on every render.
  //   This is important because React re-renders the component
  //   whenever ANY state changes (e.g., opening the drawer),
  //   and we don't want to re-sort 20 entries every time.
  //
  // HOW IT WORKS:
  //   For each price bracket, filter entries where
  //   entry.price >= bracket.min AND entry.price < bracket.max.
  //   Then sort by price descending (most expensive first within group).
  // ────────────────────────────────────────────────────────────
  const groupedEntries = useMemo(() => {
    return PRICE_BRACKETS.map((bracket) => ({
      bracket,
      entries: entries
        .filter((e) => e.price >= bracket.min && e.price < bracket.max)
        .sort((a, b) => b.price - a.price),
    }));
  }, [entries]);

  // ── Generic Cell Update Handler ─────────────────────────────
  //
  // This single function handles edits from ANY cell in ANY row.
  // It receives the entry ID, the field name, and the new value.
  //
  // KEYWORD: useCallback
  //   Memoizes the function so child components don't get a "new"
  //   function reference on every render. This prevents unnecessary
  //   re-renders of BracketGroup and DataRow components.
  //
  // HOW THE UPDATE WORKS:
  //   `setEntries(prev => prev.map(e => ...))` creates a NEW array
  //   where the matching entry has the updated field, and all other
  //   entries are untouched. React detects the new array reference
  //   and re-renders only the affected row.
  //
  //   We also sync `selectedEntry` so the drawer (if open) reflects
  //   the change immediately.
  // ────────────────────────────────────────────────────────────
  const handleUpdate = useCallback(
    (id: string, field: keyof IEMEntry, value: IEMEntry[keyof IEMEntry]) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
      );
      setSelectedEntry((prev) =>
        prev && prev.id === id ? { ...prev, [field]: value } : prev
      );
    },
    []
  );

  // ── Row Selection → Open Drawer ─────────────────────────────
  const handleSelect = useCallback((entry: IEMEntry) => {
    setSelectedEntry(entry);
    setDrawerOpen(true);
  }, []);

  // ── Close Drawer ────────────────────────────────────────────
  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  // ── Update Review Notes from Drawer ─────────────────────────
  const handleUpdateNotes = useCallback((id: string, notes: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, reviewNotes: notes } : e))
    );
    setSelectedEntry((prev) =>
      prev && prev.id === id ? { ...prev, reviewNotes: notes } : prev
    );
  }, []);


  // ── RENDER ──────────────────────────────────────────────────
  return (
    <div
      className="w-full min-h-screen bg-white text-black"
      style={{ '--grid-template': gridTemplateValue } as React.CSSProperties}
      /* ↑ Sets the CSS custom property that all grid rows reference.
           The `as React.CSSProperties` cast is needed because TypeScript
           doesn't know about custom properties by default. */
    >
      {/* ── Title Bar ──────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-red-950 shadow-lg shadow-red-950/20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Animated dot — a subtle "live" indicator */}
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <h1 className="text-sm font-black tracking-wider text-white uppercase">
              HBB IEM Database
            </h1>
            <span className="text-[10px] font-mono text-red-300
                             bg-red-900/50 px-2 py-0.5 rounded-full">
              {entries.length} entries
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-red-300">
              Scores 0–10 · Total /60
            </span>
          </div>
        </div>

        {/* ── Column Headers ────────────────────────────────── */}
        <div className="grid grid-cols-[var(--grid-template)] bg-red-900
                        border-t border-red-800">
          {GRID_COLUMNS.map((col) => (
            <div
              key={col.key}
              className={`flex items-center h-7 px-2
                          border-r border-red-800/50 last:border-r-0
                          text-[10px] font-mono font-bold uppercase tracking-wider text-white/90
                          ${col.align === 'center' ? 'justify-center' :
                            col.align === 'right' ? 'justify-end' : 'justify-start'}
                          ${col.key === 'name' ? 'pl-3' : ''}`}
            >
              {col.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bracket Groups ──────────────────────────────────── */}
      <div className="pb-16">
        {groupedEntries.map(({ bracket, entries: bracketEntries }) => (
          <BracketGroup
            key={bracket.id}
            bracket={bracket}
            entries={bracketEntries}
            onUpdate={handleUpdate}
            onSelect={handleSelect}
            selectedId={selectedEntry?.id ?? null}
          />
        ))}
      </div>

      {/* ── Review Drawer ──────────────────────────────────── */}
      <ReviewDrawer
        entry={selectedEntry}
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        onUpdateNotes={handleUpdateNotes}
      />
    </div>
  );
}
