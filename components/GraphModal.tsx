'use client';

import { useState, useEffect } from 'react';

type GraphModalProps = {
  src: string | null;
  alt?: string;
  onClose: () => void;
};

export default function GraphModal({ src, alt = 'Frequency Response Graph', onClose }: GraphModalProps) {
  const [scale, setScale] = useState(1);
  const [imgSrc, setImgSrc] = useState<string>('');

  useEffect(() => {
    if (src) {
      if (src.startsWith('http')) {
        setImgSrc(`/api/proxy-graph?url=${encodeURIComponent(src)}`);
      } else {
        setImgSrc(src);
      }
    }
  }, [src]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  const getSquiglinkUrl = () => {
    if (src.includes('squig.link') || src.includes('crinacle.com')) {
      return src;
    }
    const cleanName = encodeURIComponent(alt.replace(/[^a-zA-Z0-9\s]/g, '').trim());
    return `https://squig.link/?share=${cleanName}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Controls Header */}
      <div
        className="w-full max-w-7xl flex flex-wrap items-center justify-between gap-3 z-10 bg-zinc-950/90 border border-zinc-800 rounded-2xl px-4 py-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-200">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-bold truncate max-w-xs sm:max-w-md">{alt}</span>
        </div>

        {/* Zoom & External Tool Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-bold flex items-center justify-center transition-colors cursor-pointer"
            title="Zoom Out"
          >
            -
          </button>

          <span className="font-mono text-xs text-amber-400 min-w-[50px] text-center font-bold">
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
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 font-mono text-xs text-zinc-300 transition-colors cursor-pointer"
          >
            Reset
          </button>

          <a
            href={getSquiglinkUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-mono text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <span>📈</span> Open Full Interactive Squiglink Tool &rarr;
          </a>

          <button
            type="button"
            onClick={onClose}
            className="ml-2 w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold flex items-center justify-center transition-colors cursor-pointer"
            title="Close Modal (Esc)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Image Viewport with Zoom Scale */}
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
            src={imgSrc}
            alt={alt}
            onError={() => {
              setImgSrc('/api/proxy-graph');
            }}
            className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl border border-zinc-800 bg-zinc-950 object-contain"
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="z-10 font-mono text-[11px] text-zinc-400 text-center bg-zinc-950/80 px-4 py-1.5 rounded-xl border border-zinc-800/60">
        Click background or press Esc to exit &bull; Hover / Pinch / Scale to inspect frequency graph details
      </div>
    </div>
  );
}
