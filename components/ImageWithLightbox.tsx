/**
 * components/ImageWithLightbox.tsx
 * =============================================================
 * Interactive Image Component with Lightbox Trigger
 * =============================================================
 * Displays an image attachment with hover zoom hint.
 * When clicked, triggers the interactive full-screen Lightbox modal.
 * =============================================================
 */

'use client';

import { useState } from 'react';
import GraphModal from '@/components/GraphModal';

interface ImageWithLightboxProps {
  src: string;
  alt?: string;
  caption?: string;
  className?: string;
}

export default function ImageWithLightbox({
  src,
  alt = 'Attachment Image / Frequency Response Graph',
  caption = 'Click to inspect full resolution / graph lightbox',
  className = '',
}: ImageWithLightboxProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [displaySrc, setDisplaySrc] = useState<string>(
    src.startsWith('http') ? `/api/proxy-graph?url=${encodeURIComponent(src)}` : src
  );

  if (!src) return null;

  return (
    <>
      <figure className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-2 transition-all hover:border-amber-400/60 shadow-lg ${className}`}>
        <div
          className="relative overflow-hidden rounded-xl bg-zinc-900"
          onClick={() => setIsOpen(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displaySrc}
            alt={alt}
            onError={() => setDisplaySrc('/api/proxy-graph')}
            className="w-full h-auto max-h-96 object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
          />

          {/* Hover Overlay Hint */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs font-mono font-bold text-amber-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            Inspect Graph / Image Lightbox
          </div>
        </div>

        {caption && (
          <figcaption className="mt-2 text-[11px] font-mono text-zinc-500 text-center flex items-center justify-center gap-1">
            <svg className="w-3.5 h-3.5 text-amber-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {caption}
          </figcaption>
        )}
      </figure>

      {/* Lightbox Modal */}
      {isOpen && (
        <GraphModal
          src={src}
          alt={alt}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
