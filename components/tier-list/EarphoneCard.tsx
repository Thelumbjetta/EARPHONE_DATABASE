'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { DraggableItem } from './types';
import { Star } from 'lucide-react';

interface Props {
  item: DraggableItem;
  isOverlay?: boolean;
}

function StarDisplay({ stars }: { stars: number | null }) {
  if (stars === null) {
    return <span className="text-gray-400 text-[10px] font-medium">Unrated</span>;
  }

  const outOf5 = stars / 2;
  const fullStars = Math.floor(outOf5);

  return (
    <span className="flex items-center gap-0.5">
      {Array(Math.min(5, Math.max(1, fullStars))).fill(0).map((_, i) => (
        <Star key={i} className="w-3 h-3 text-[#10b981] fill-[#10b981]" />
      ))}
      <span className="text-[10px] font-bold text-gray-500 ml-1">{stars}</span>
    </span>
  );
}

export default function EarphoneCard({ item, isOverlay = false }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: item.id,
    data: { item },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : 1,
    cursor: isOverlay ? 'grabbing' : 'grab',
    zIndex: isOverlay ? 9999 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        relative select-none touch-action-none font-sans
        bg-white border border-gray-200
        rounded-xl px-3 py-2.5
        min-w-[130px] max-w-[190px]
        transition-all duration-150 shadow-2xs
        hover:bg-[#f8faf9] hover:border-[#10b981]
        hover:-translate-y-0.5 hover:shadow-sm
        ${isOverlay
          ? 'shadow-xl ring-2 ring-[#10b981]/30 scale-105 border-[#10b981]'
          : ''
        }
      `}
    >
      {/* Brand name */}
      <p className="text-[#111827] text-xs font-extrabold leading-tight truncate">
        {item.brand}
      </p>

      {/* Model name */}
      <p className="text-gray-600 text-xs font-medium leading-tight truncate mt-0.5">
        {item.model}
      </p>

      {/* Price */}
      <p className="text-gray-400 text-[10px] font-bold mt-1">${item.price}</p>

      {/* Star rating row */}
      <div className="mt-1">
        <StarDisplay stars={item.userStars} />
      </div>
    </div>
  );
}
