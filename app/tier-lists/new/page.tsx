'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  useDroppable,
  useDraggable,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import SmartGearInput from '@/components/tier-list/SmartGearInput';
import ImageWithLightbox from '@/components/ImageWithLightbox';
import { Save, Search, Layers, BarChart2, X, GripVertical } from 'lucide-react';

export type MatrixItem = {
  id: string;
  brand: string;
  model: string;
  category: string;
  price: number;
  driver_type: string;
  graph_url: string;
  bass: number;
  mids: number;
  treble: number;
  tonality: number;
  technicality: number;
  bias_pref: number;
  total_score: number;
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  review_notes: string;
};

const TIERS: Array<{
  name: 'S' | 'A' | 'B' | 'C' | 'D';
  label: string;
  leftBorderColor: string;
  baselineScore: number;
}> = [
  { name: 'S', label: 'S-Tier (9.0+)',    leftBorderColor: '#f59e0b', baselineScore: 9.5 },
  { name: 'A', label: 'A-Tier (8.0-8.9)', leftBorderColor: '#10b981', baselineScore: 8.5 },
  { name: 'B', label: 'B-Tier (7.0-7.9)', leftBorderColor: '#3b82f6', baselineScore: 7.5 },
  { name: 'C', label: 'C-Tier (6.0-6.9)', leftBorderColor: '#f97316', baselineScore: 6.5 },
  { name: 'D', label: 'D-Tier (< 6.0)',   leftBorderColor: '#ef4444', baselineScore: 5.0 },
];

function DroppableTierRow({
  tierName,
  label,
  leftBorderColor,
  items,
}: {
  tierName: string;
  label: string;
  leftBorderColor: string;
  items: MatrixItem[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: tierName });

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-xl border border-[#eaefec] bg-white transition-all duration-200 overflow-hidden
        flex min-h-[90px] items-start
        ${isOver ? 'bg-[#e6f7f0] border-[#10b981] ring-2 ring-[#10b981]/20 shadow-sm' : 'hover:border-gray-300'}
      `}
      style={{ borderLeftWidth: '4px', borderLeftColor: leftBorderColor }}
    >
      {/* Left label */}
      <div className="w-32 flex-shrink-0 flex flex-col items-center justify-center gap-1 py-3 px-3 border-r border-[#eaefec] bg-gray-50/60 self-stretch select-none min-h-[90px]">
        <span className="text-sm font-extrabold" style={{ color: leftBorderColor }}>
          {tierName}
        </span>
        <span className="text-[9px] text-gray-400 font-medium text-center">{label}</span>
        <span className="text-[9px] font-bold text-gray-400 bg-[#f3f5f4] border border-[#eaefec] px-2 py-0.5 rounded-full mt-0.5">
          {items.length}
        </span>
      </div>

      {/* Cards area */}
      <div className="flex-1 flex flex-wrap gap-2 p-3 items-start content-start min-h-[90px] bg-white">
        {items.length === 0 ? (
          <span className="text-xs font-medium text-gray-400 italic select-none py-4 w-full text-center">
            {isOver ? (
              <span className="text-[#10b981] font-bold not-italic">Drop here</span>
            ) : (
              `Drag gear here to place in ${tierName}-Tier`
            )}
          </span>
        ) : (
          items.map((item) => <DraggableGearBadge key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

function DraggableGearBadge({ item, isOverlay = false }: { item: MatrixItem; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        px-3 py-2 rounded-xl bg-white border border-[#eaefec] shadow-xs
        flex items-center gap-2 cursor-grab active:cursor-grabbing select-none transition-all
        ${isOverlay
          ? 'scale-105 shadow-xl border-[#10b981] ring-2 ring-[#10b981]/20 z-50'
          : 'hover:border-[#10b981] hover:shadow-sm hover:-translate-y-0.5'
        }
      `}
    >
      <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
      <span className="font-extrabold text-xs text-[#111827]">{item.brand} {item.model}</span>
      <span className="text-[10px] font-bold text-[#059669] bg-[#e6f7f0] border border-[#a7f3d0] px-1.5 py-0.5 rounded-full flex-shrink-0">
        {item.total_score.toFixed(1)}
      </span>
    </div>
  );
}

function getTierBadgeClass(tier: string) {
  switch (tier) {
    case 'S': return 'bg-[#111827] text-white font-black';
    case 'A': return 'bg-[#e6f7f0] text-[#059669] border border-[#a7f3d0] font-bold';
    case 'B': return 'bg-blue-50 text-blue-600 border border-blue-200 font-semibold';
    case 'C': return 'bg-orange-50 text-orange-600 border border-orange-200';
    default:  return 'bg-red-50 text-red-600 border border-red-200';
  }
}

export default function InteractiveTierListBuilder() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('audiophile');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<MatrixItem[]>([]);
  const [activeItem, setActiveItem] = useState<MatrixItem | null>(null);
  const [activeDrawerIndex, setActiveDrawerIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateScores = (
    bass: number, mids: number, treble: number,
    tonality: number, technicality: number, bias_pref: number
  ) => {
    const weighted =
      tonality * 0.25 + technicality * 0.25 +
      bass * 0.15 + mids * 0.15 + treble * 0.1 + bias_pref * 0.1;
    const total_score = Math.round(weighted * 10) / 10;
    let tier: 'S' | 'A' | 'B' | 'C' | 'D' = 'B';
    if (total_score >= 9.0) tier = 'S';
    else if (total_score >= 8.0) tier = 'A';
    else if (total_score >= 7.0) tier = 'B';
    else if (total_score >= 6.0) tier = 'C';
    else tier = 'D';
    return { total_score, tier };
  };

  const handleAddGear = (gear: {
    brand: string; model: string; category: string;
    price: number; driver_type: string; graph_url: string;
  }) => {
    const defaultSub = 8.5;
    const { total_score, tier } = calculateScores(defaultSub, defaultSub, defaultSub, defaultSub, defaultSub, defaultSub);
    const newItem: MatrixItem = {
      id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...gear,
      category: gear.category || 'IEM',
      price: gear.price || 0,
      driver_type: gear.driver_type || 'Dynamic',
      bass: defaultSub, mids: defaultSub, treble: defaultSub,
      tonality: defaultSub, technicality: defaultSub, bias_pref: defaultSub,
      total_score, tier, review_notes: '',
    };
    setItems((prev) => [newItem, ...prev]);
  };

  const handleUpdateScore = (index: number, field: keyof MatrixItem, value: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: value };
      const { total_score, tier } = calculateScores(
        field === 'bass'         ? value : target.bass,
        field === 'mids'         ? value : target.mids,
        field === 'treble'       ? value : target.treble,
        field === 'tonality'     ? value : target.tonality,
        field === 'technicality' ? value : target.technicality,
        field === 'bias_pref'    ? value : target.bias_pref,
      );
      target.total_score = total_score;
      target.tier = tier;
      copy[index] = target;
      return copy;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const found = items.find((i) => i.id === event.active.id);
    if (found) setActiveItem(found);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    if (!over) return;
    const targetTier = over.id as 'S' | 'A' | 'B' | 'C' | 'D';
    const tierMeta = TIERS.find((t) => t.name === targetTier);
    if (!tierMeta) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === active.id) {
          const baseline = tierMeta.baselineScore;
          return { ...item, tier: targetTier, bass: baseline, mids: baseline, treble: baseline, tonality: baseline, technicality: baseline, bias_pref: baseline, total_score: baseline };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    if (activeDrawerIndex === index) setActiveDrawerIndex(null);
  };

  const handleSaveAndPublish = async () => {
    if (!title.trim()) { setError('Please provide a title for your tier list.'); return; }
    if (items.length === 0) { setError('Please add at least one gear item to your tier list.'); return; }
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/tier-lists/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), category, description: description.trim(), is_public: true, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save tier list.');
      router.push(`/tier-list/${data.tier_list_id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-5 max-w-7xl mx-auto pb-16 font-sans">

        {/* ── HEADER & CONFIG ──────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#eaefec] rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#eaefec] pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827]">
                Interactive Tier List Builder
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Drag-and-drop tiering with synchronized multi-variable rating matrix
              </p>
            </div>

            <button
              onClick={handleSaveAndPublish}
              disabled={isSaving}
              className="flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-white font-extrabold text-sm px-6 py-3 rounded-full shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Publishing...' : 'Save & Publish'}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-extrabold text-[#111827]">
                Tier List Title
              </label>
              <input
                type="text"
                placeholder="e.g. My Flagship IEM Rankings 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#f8faf9] text-sm text-[#111827] placeholder-gray-400 rounded-xl px-4 py-2.5 border border-[#eaefec] focus:outline-none focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-[#111827]">
                Category / Subreddit
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#f8faf9] text-sm text-[#111827] rounded-xl px-4 py-2.5 border border-[#eaefec] focus:outline-none focus:bg-white focus:border-[#10b981] transition-all font-sans"
              >
                <option value="audiophile">r/audiophile</option>
                <option value="iem">r/iem</option>
                <option value="budgettier">r/budgettier</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-[#111827]">
              Description & Methodology Notes
            </label>
            <textarea
              rows={2}
              placeholder="Describe your testing source, music tracks, and rating philosophy..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#f8faf9] text-xs sm:text-sm text-[#111827] placeholder-gray-400 rounded-xl px-4 py-2.5 border border-[#eaefec] focus:outline-none focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all font-sans resize-none"
            />
          </div>
        </div>

        {/* ── SMART GEAR SEARCH ────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#eaefec] rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-[#111827] flex items-center gap-1.5">
                <Search className="w-4 h-4 text-[#10b981]" />
                Smart IEM Search & Graph Auto-Fetcher
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Type any IEM name to automatically pull frequency response graphs and baseline specs
              </p>
            </div>
          </div>
          <SmartGearInput onSelectGear={handleAddGear} />
        </div>

        {/* ── VISUAL DRAG-AND-DROP TIER ROWS ───────────────────────────────────── */}
        <div className="bg-white border border-[#eaefec] rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#eaefec] pb-3">
            <h3 className="text-sm font-extrabold text-[#111827] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#10b981]" />
              Visual Tier Rows (Drag & Drop)
            </h3>
            <span className="text-xs font-medium text-gray-400">
              Drag gear cards between tiers to instantly reassign scores
            </span>
          </div>

          <div className="space-y-2.5">
            {TIERS.map((tier) => (
              <DroppableTierRow
                key={tier.name}
                tierName={tier.name}
                label={tier.label}
                leftBorderColor={tier.leftBorderColor}
                items={items.filter((i) => i.tier === tier.name)}
              />
            ))}
          </div>
        </div>

        {/* ── SYNCHRONIZED RATING MATRIX ───────────────────────────────────────── */}
        <div className="bg-white border border-[#eaefec] rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#eaefec] pb-3">
            <h3 className="text-sm font-extrabold text-[#111827] flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-[#10b981]" />
              Sound Rating Matrix ({items.length} gear items)
            </h3>
            <span className="text-xs font-medium text-gray-400">
              Editing scores updates total score & shifts tier placement
            </span>
          </div>

          {items.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-[#eaefec] rounded-xl">
              <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-gray-400">
                No IEMs added yet. Use the Smart Gear Search above to add gear!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#eaefec]">
              <table className="w-full text-left border-collapse text-xs min-w-[700px] font-sans">
                <thead>
                  <tr className="border-b border-[#eaefec] bg-[#f8faf9] text-gray-500 uppercase text-[10px] font-extrabold">
                    <th className="py-3 px-4">Gear Model</th>
                    <th className="py-3 px-2 text-center">Bass</th>
                    <th className="py-3 px-2 text-center">Mids</th>
                    <th className="py-3 px-2 text-center">Treble</th>
                    <th className="py-3 px-2 text-center">Tonality</th>
                    <th className="py-3 px-2 text-center">Tech</th>
                    <th className="py-3 px-2 text-center">Bias</th>
                    <th className="py-3 px-3 text-center">Score</th>
                    <th className="py-3 px-2 text-center">Tier</th>
                    <th className="py-3 px-2 text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eaefec]">
                  {items.map((item, idx) => (
                    <tr
                      key={item.id}
                      onClick={() => setActiveDrawerIndex(idx)}
                      className="hover:bg-[#f8faf9] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-[#111827] group-hover:text-[#10b981] transition-colors block">
                          {item.brand} {item.model}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          ${item.price} &bull; {item.driver_type}
                        </span>
                      </td>

                      {(['bass', 'mids', 'treble', 'tonality', 'technicality', 'bias_pref'] as const).map((field) => (
                        <td key={field} className="py-2 px-1 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            value={item[field]}
                            onChange={(e) => handleUpdateScore(idx, field, parseFloat(e.target.value) || 0)}
                            className="w-12 bg-[#f8faf9] text-center font-bold text-[#111827] py-1.5 rounded-lg border border-[#eaefec] focus:outline-none focus:border-[#10b981] focus:bg-white text-xs transition-all"
                          />
                        </td>
                      ))}

                      <td className="py-3 px-3 text-center font-extrabold text-sm text-[#10b981]">
                        {item.total_score.toFixed(1)}
                      </td>

                      <td className="py-3 px-2 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs uppercase font-mono ${getTierBadgeClass(item.tier)}`}>
                          {item.tier}
                        </span>
                      </td>

                      <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove gear"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── SIDE DRAWER REVIEW PANEL ─────────────────────────────────────────── */}
        {activeDrawerIndex !== null && items[activeDrawerIndex] && (
          <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white border-l border-[#eaefec] shadow-2xl z-50 p-6 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-[#eaefec] pb-4">
              <div>
                <span className="text-[10px] font-extrabold text-[#10b981] uppercase tracking-wider">
                  Detailed Review
                </span>
                <h2 className="text-lg font-extrabold text-[#111827] mt-0.5">
                  {items[activeDrawerIndex].brand} {items[activeDrawerIndex].model}
                </h2>
              </div>
              <button
                onClick={() => setActiveDrawerIndex(null)}
                className="text-gray-400 hover:text-[#111827] p-1.5 rounded-xl border border-[#eaefec] hover:border-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {items[activeDrawerIndex].graph_url && (
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-gray-500 uppercase tracking-wide">
                  Frequency Response Graph
                </h4>
                <ImageWithLightbox
                  src={items[activeDrawerIndex].graph_url}
                  alt={`${items[activeDrawerIndex].model} graph`}
                  caption="Squiglink / CrinGraph open-source frequency curve"
                />
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-gray-500 uppercase tracking-wide">
                Long-Form Sound Notes & Review
              </h4>
              <textarea
                rows={8}
                placeholder="Write your detailed impressions on soundstage, imaging, cable build, ear tips, and comparisons..."
                value={items[activeDrawerIndex].review_notes}
                onChange={(e) => {
                  const val = e.target.value;
                  setItems((prev) => {
                    const copy = [...prev];
                    copy[activeDrawerIndex].review_notes = val;
                    return copy;
                  });
                }}
                className="w-full bg-[#f8faf9] text-xs sm:text-sm text-[#111827] placeholder-gray-400 rounded-xl px-4 py-3 border border-[#eaefec] focus:outline-none focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all font-sans leading-relaxed resize-none"
              />
            </div>

            <button
              onClick={() => setActiveDrawerIndex(null)}
              className="w-full py-2.5 rounded-full bg-[#10b981] hover:bg-[#059669] text-white font-extrabold text-xs transition-all duration-200"
            >
              Save Review & Close
            </button>
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
        {activeItem ? <DraggableGearBadge item={activeItem} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
