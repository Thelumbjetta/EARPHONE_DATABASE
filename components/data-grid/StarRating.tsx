'use client';

/**
 * components/data-grid/StarRating.tsx
 * =============================================================
 * Interactive 5-Star Rating Component (QC/Service Column)
 * =============================================================
 *
 * WHAT DOES THIS COMPONENT DO?
 *   Renders a row of 5 star icons that the user can click to set
 *   a rating. Supports half-star increments — clicking the left
 *   half of a star sets X.5, clicking the right half sets X+1.
 *
 * VISUAL THEME (Red/White/Black):
 *   - Empty stars: light gray outlines
 *   - Filled stars: deep red (text-red-700)
 *   - Hover preview: stars light up before you click
 *
 * HOW HALF-STARS WORK:
 *   Each star is a single <span> element. On click, we calculate
 *   whether the mouse was on the LEFT half or RIGHT half of the star:
 *     Left half  → starIndex + 0.5 (e.g., clicking left of star 3 → 2.5)
 *     Right half → starIndex + 1.0 (e.g., clicking right of star 3 → 3.0)
 *
 *   The visual fill uses SVG clip-path: a star can be 0%, 50%, or 100%
 *   filled. The clip-path `inset(0 50% 0 0)` clips the right half away,
 *   showing only the left half of the filled star.
 *
 * KEYWORD: 'use client'
 *   Required because this component uses useState (hover state)
 *   and handles browser mouse events.
 * =============================================================
 */

import { useState, useCallback } from 'react';


// ── Props Interface ────────────────────────────────────────────
interface StarRatingProps {
  /** Current rating value: 0 to 5, in 0.5 increments. */
  value: number;

  /** Called when the user clicks a star. Receives the new rating. */
  onChange: (value: number) => void;
}


export default function StarRating({ value, onChange }: StarRatingProps) {

  // ── Hover State ─────────────────────────────────────────────
  //
  // `hoverValue` is the rating the user WOULD get if they clicked
  // right now. It's null when the mouse isn't over any star.
  // We use this to show a live preview of the rating before committing.
  // ────────────────────────────────────────────────────────────
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  // Show hover preview if hovering, otherwise show the actual value.
  const displayValue = hoverValue !== null ? hoverValue : value;

  // ── Click Handler ───────────────────────────────────────────
  //
  // `starIndex` is 0-based (0 = first star, 4 = fifth star).
  //
  // `getBoundingClientRect()` returns the star element's position/size.
  // `e.clientX - rect.left` gives the mouse's X offset within the star.
  // If that offset is less than half the star's width, it's a "left click"
  // → half star. Otherwise → full star.
  // ────────────────────────────────────────────────────────────
  const handleClick = useCallback((starIndex: number, e: React.MouseEvent<HTMLSpanElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    const newValue = isHalf ? starIndex + 0.5 : starIndex + 1;
    onChange(newValue);
  }, [onChange]);

  // ── Mouse Move Handler (Hover Preview) ──────────────────────
  const handleMouseMove = useCallback((starIndex: number, e: React.MouseEvent<HTMLSpanElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    setHoverValue(isHalf ? starIndex + 0.5 : starIndex + 1);
  }, []);

  // Clear hover preview when the mouse leaves the star row.
  const handleMouseLeave = useCallback(() => {
    setHoverValue(null);
  }, []);

  return (
    <div
      className="flex items-center gap-px h-full justify-center"
      onMouseLeave={handleMouseLeave}
    >
      {/* Render 5 stars. [0, 1, 2, 3, 4].map(...) creates 5 elements. */}
      {[0, 1, 2, 3, 4].map((starIndex) => {
        // `fillLevel` is how much of this star is filled (0 to 1).
        //   displayValue = 3.5, starIndex = 3 → fillLevel = 0.5 (half filled)
        //   displayValue = 3.5, starIndex = 2 → fillLevel = 1.0 (fully filled)
        //   displayValue = 3.5, starIndex = 4 → fillLevel = 0.0 (empty)
        const fillLevel = Math.min(1, Math.max(0, displayValue - starIndex));

        return (
          <span
            key={starIndex}
            onClick={(e) => handleClick(starIndex, e)}
            onMouseMove={(e) => handleMouseMove(starIndex, e)}
            className="relative cursor-pointer text-sm leading-none select-none w-[14px] h-[14px]"
            role="button"
            aria-label={`Rate ${starIndex + 1} stars`}
          >
            {/* Layer 1: Empty star (always visible, gray background) */}
            <svg
              viewBox="0 0 24 24"
              className="absolute inset-0 w-full h-full text-gray-300"
              fill="currentColor"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>

            {/* Layer 2: Filled star (deep red, clipped by fillLevel) */}
            {fillLevel > 0 && (
              <svg
                viewBox="0 0 24 24"
                className="absolute inset-0 w-full h-full text-red-700"
                fill="currentColor"
                style={{
                  // clipPath clips AWAY the unfilled portion.
                  // For fillLevel = 0.5: inset(0 50% 0 0) hides the right 50%.
                  // For fillLevel = 1.0: inset(0 0% 0 0) hides nothing (fully visible).
                  clipPath: `inset(0 ${(1 - fillLevel) * 100}% 0 0)`,
                }}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
          </span>
        );
      })}
    </div>
  );
}
