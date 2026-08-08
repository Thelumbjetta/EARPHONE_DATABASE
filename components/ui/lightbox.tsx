/**
 * components/ui/lightbox.tsx
 * =============================================================
 * Interactive Image Lightbox Modal Component
 * =============================================================
 * Renders a full-screen high-contrast dark overlay with zoom,
 * pan, reset, and close controls for inspectable frequency response
 * graphs and gear attachments.
 * =============================================================
 */

'use client';

import { useState, useEffect, KeyboardEvent } from 'react';

interface LightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export default function Lightbox({ src, alt = 'Frequency Response Graph / Attachment', onClose }: LightboxProps) {
  const [scale, setScale] = useState<number>(1);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!src) return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleReset = () => setScale(1);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      {/* Top Bar: Controls */}
      <div
        className="w-full max-w-7xl flex items-center justify-between z-10 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl px-4 py-2.5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="truncate max-w-xs sm:max-w-md">{alt}</span>
        </div>

        {/* Zoom & Close Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-bold flex items-center justify-center transition-colors cursor-pointer"
            title="Zoom Out"
          >
            -
          </button>
          <span className="font-mono text-xs text-amber-400 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-bold flex items-center justify-center transition-colors cursor-pointer"
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 font-mono text-xs text-zinc-300 transition-colors cursor-pointer"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={onClose}
            className="ml-2 w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold flex items-center justify-center transition-colors cursor-pointer"
            title="Close Lightbox (Esc)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Image Container with Zoom Scale */}
      <div
        className="flex-1 w-full flex items-center justify-center overflow-auto p-4 select-none cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{ transform: `scale(${scale})` }}
          className="transition-transform duration-150 ease-out"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl shadow-black border border-zinc-800/80 object-contain"
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="z-10 font-mono text-[11px] text-zinc-500 text-center">
        Click background or press Esc to exit &bull; Use zoom buttons to inspect measurement details
      </div>
    </div>
  );
}
