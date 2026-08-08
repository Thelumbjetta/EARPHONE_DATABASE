'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { ListTier, DraggableItem } from './types';
import EarphoneCard from './EarphoneCard';
import { Palette } from 'lucide-react';

interface Props {
  tier: ListTier;
  items: DraggableItem[];
  onColorChange: (tierId: number, newColor: string) => void;
}

export default function TierRow({ tier, items, onColorChange }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: String(tier.id),
  });

  function handleColorChange(event: React.ChangeEvent<HTMLInputElement>) {
    onColorChange(tier.id, event.target.value);
  }

  return (
    <div
      ref={setNodeRef}
      className={`
        flex min-h-[90px] rounded-xl border border-gray-200 bg-white
        transition-all duration-200 font-sans shadow-xs overflow-hidden
        ${isOver
          ? 'bg-[#e6f7f0] border-[#10b981] ring-2 ring-[#10b981]/20 shadow-md'
          : 'hover:border-gray-300'
        }
      `}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: tier.colorHex,
      }}
    >
      {/* ── LEFT LABEL SECTION ─────────────────────────────────────────────── */}
      <div
        className="w-32 flex-shrink-0 flex flex-col items-center justify-center gap-1.5 p-3 border-r border-gray-200 bg-gray-50/60 select-none"
      >
        {/* TIER NAME */}
        <span
          className="text-base font-extrabold tracking-tight text-center leading-none font-sans"
          style={{ color: tier.colorHex }}
        >
          {tier.name}
        </span>

        {/* COLOR PICKER BUTTON */}
        <div className="relative">
          <button
            type="button"
            className="text-[11px] font-bold text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 bg-white rounded-full px-2.5 py-0.5 transition-colors flex items-center gap-1 shadow-2xs"
            title="Change tier color"
          >
            <Palette className="w-3 h-3 text-gray-400" />
            <span>Color</span>
          </button>
          <input
            type="color"
            value={tier.colorHex}
            onChange={handleColorChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            title="Pick a tier color"
          />
        </div>
      </div>

      {/* ── EARPHONE CARDS AREA ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2.5 p-3 flex-1 items-start content-start bg-white">
        {items.map((item) => (
          <EarphoneCard key={item.id} item={item} />
        ))}

        {/* EMPTY STATE */}
        {items.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-xs py-4 font-medium">
            {isOver ? (
              <span className="text-[#10b981] font-bold">Drop gear here!</span>
            ) : (
              <span>Drag gear here to rank</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
