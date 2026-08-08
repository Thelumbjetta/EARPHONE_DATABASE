'use client';

import { useDroppable } from '@dnd-kit/core';
import type { DraggableItem } from './types';
import EarphoneCard from './EarphoneCard';
import SmartGearInput from './SmartGearInput';
import { Headphones, Sparkles, Search } from 'lucide-react';

interface Props {
  items: DraggableItem[];
  onAddGear?: (gear: {
    brand: string;
    model: string;
    category: string;
    price: number;
    driver_type: string;
    graph_url: string;
  }) => void;
}

export default function UnrankedPool({ items, onAddGear }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unranked' });

  return (
    <div className="mt-8 pb-8 space-y-4 font-sans">
      {/* Smart Gear Finder Bar */}
      <div className="bg-white border border-[#eaefec] p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h4 className="text-xs font-extrabold text-[#10b981] uppercase tracking-wider flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            <span>Smart Gear Finder</span>
          </h4>
          <p className="text-xs text-gray-500 font-normal mt-0.5">Search audio database for auto-populated graphs &amp; metadata</p>
        </div>

        <SmartGearInput
          onSelectGear={(gear) => {
            if (onAddGear) {
              onAddGear(gear);
            }
          }}
        />
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[#111827] text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <span>Unranked Pool</span>
          </h3>
          <span className="bg-[#e6f7f0] text-[#059669] border border-[#a7f3d0] text-xs font-bold px-2.5 py-0.5 rounded-full">
            {items.length} gear item{items.length !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-gray-400 text-xs font-medium hidden sm:block">Drag gear into tiers above to rank them</p>
      </div>

      {/* Droppable Pool Area */}
      <div
        ref={setNodeRef}
        className={`
          min-h-[140px] rounded-2xl border-2 border-dashed p-4
          flex flex-wrap gap-2.5 items-start content-start
          transition-all duration-200 bg-[#f8faf9]
          ${isOver
            ? 'border-[#10b981] bg-[#e6f7f0]/60 ring-2 ring-[#10b981]/20'
            : 'border-gray-200 hover:border-gray-300'
          }
        `}
      >
        {items.length > 0 ? (
          items.map((item) => (
            <EarphoneCard key={item.id} item={item} />
          ))
        ) : (
          <div className="w-full flex flex-col items-center justify-center py-8 gap-2">
            <Headphones className="w-8 h-8 text-gray-300 stroke-[1.5]" />
            <p className="text-gray-500 text-xs font-medium text-center">
              {isOver ? (
                <span className="text-[#10b981] font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Drop here to unrank
                </span>
              ) : (
                'All gear items have been ranked! Drag from any tier row back here to unrank.'
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
