'use client';
/**
 * components/tier-list/HeroBanner.tsx
 * =============================================================
 * Hero Banner Component — Top Section of the Tier List Editor
 * =============================================================
 *
 * WHAT IS THIS COMPONENT?
 *   The large, visually striking header at the top of the tier list page.
 *   It displays:
 *     - A background image (from bannerImageUrl) OR a generated gradient
 *       (from themeColorHex when no image is uploaded).
 *     - A dark gradient overlay for legibility over the background.
 *     - The tier list title and description.
 *     - "Upload Banner" and "Edit Settings" action buttons.
 *
 * KEYWORD: 'use client'
 *   This directive MUST be at the very top of the file (above all imports)
 *   for it to work. It tells Next.js: "This component runs in the browser."
 *
 *   WHY DOES THIS NEED 'use client'?
 *   In the future, the "Upload Banner" button will open a file picker
 *   (a browser API). Even though this specific version just has placeholder
 *   buttons, marking it as a Client Component now prepares for that.
 *   Also, any component imported by a Client Component must ALSO be
 *   a Client Component, and TierListEditor (our parent) is a Client Component.
 *
 * WHAT ARE PROPS?
 *   Props are how React components receive data from their parents.
 *   They work like function parameters.
 *
 *   Example: When TierListEditor renders this component:
 *     <HeroBanner meta={data.meta} />
 *   It passes `data.meta` as the `meta` prop.
 *   Inside HeroBanner, we access it via `props.meta` or destructured as `{ meta }`.
 * =============================================================
 */

// ── IMPORTS ────────────────────────────────────────────────────────────────────
import type { TierListMeta } from './types';
// ↑ `import type` brings in the TypeScript type for type-checking only.
//   It costs nothing at runtime. We use TierListMeta to describe the shape
//   of the `meta` prop this component expects.
// ─────────────────────────────────────────────────────────────────────────────


// ── PROPS INTERFACE ────────────────────────────────────────────────────────────
//
// A "Props interface" describes what data this component expects to receive.
// This is the TypeScript contract for the component's API.
//
// Convention: name it `Props` (local to the file) or `ComponentNameProps` (explicit).
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  meta: TierListMeta; // The full tier list metadata — title, colors, banner URL, etc.
}


// ── COMPONENT DEFINITION ───────────────────────────────────────────────────────
//
// SYNTAX: export default function ComponentName({ meta }: Props) { ... }
//
// KEYWORD: export default
//   Makes this the primary export. Other files can import it as:
//   import HeroBanner from '@/components/tier-list/HeroBanner';
//
// PARAMETER: { meta }: Props
//   This is "destructuring" the props object inline.
//   Instead of: function HeroBanner(props: Props) { const meta = props.meta; }
//   We write:   function HeroBanner({ meta }: Props)
//   Both are equivalent. Destructuring is more concise.
//
// RETURN TYPE: JSX.Element (implicit)
//   React components return JSX — a syntax that looks like HTML but is
//   actually JavaScript. The TypeScript compiler converts it to React.createElement calls.
// ─────────────────────────────────────────────────────────────────────────────
export default function HeroBanner({ meta }: Props) {

  // ── Determine background style ─────────────────────────────────────────────
  //
  // CONDITIONAL LOGIC:
  //   If the user uploaded a banner image → use it as a background-image.
  //   If not (bannerImageUrl is null) → generate a gradient from themeColorHex.
  //
  // JAVASCRIPT TERNARY OPERATOR: condition ? valueIfTrue : valueIfFalse
  //   meta.bannerImageUrl ? A : B
  //   If bannerImageUrl is a non-null string (truthy) → use A.
  //   If bannerImageUrl is null (falsy) → use B.
  //
  // WHY `style` PROP INSTEAD OF TAILWIND CLASSES?
  //   Tailwind CSS v4 generates its utility classes at BUILD TIME by scanning
  //   your source files. It can only include classes that appear literally in
  //   the source code as plain strings.
  //
  //   If we tried to write:
  //     className={`bg-[${meta.themeColorHex}]`}
  //   Tailwind would NOT generate a CSS rule for it — the class name is
  //   constructed at runtime and Tailwind's build-time scanner can't see it.
  //
  //   The `style` prop, on the other hand, is just inline CSS applied directly
  //   by the browser at runtime. It works perfectly for dynamic values from
  //   the database. This is the correct pattern for any database-driven color.
  // ─────────────────────────────────────────────────────────────────────────
  const backgroundStyle: React.CSSProperties = meta.bannerImageUrl
    ? {
        // CSS background-image with a URL pointing to the banner.
        // The gradient overlay is handled separately by a child <div>.
        backgroundImage: `url(${meta.bannerImageUrl})`,
        backgroundSize: 'cover',       // scale image to fill the container
        backgroundPosition: 'center',  // center the image if it's cropped
        backgroundRepeat: 'no-repeat',
      }
    : {
        // No banner image: generate a subtle gradient using the theme color.
        // `themeColorHex + '30'` appends "30" to the hex code → 19% opacity.
        // CSS gradient: from transparent accent color → to solid dark background.
        // `135deg` is the angle (diagonal, top-left to bottom-right).
        background: `linear-gradient(135deg, ${meta.themeColorHex}30 0%, #18181b 60%, #09090b 100%)`,
      };


  // ── JSX RETURN ─────────────────────────────────────────────────────────────
  //
  // WHAT IS JSX?
  //   JSX is a special syntax that looks like HTML but is actually JavaScript.
  //   It's NOT HTML — there are differences:
  //   - Use `className` instead of `class` (because `class` is a JS keyword).
  //   - Use `style={{ ... }}` (double curly braces: outer = JSX expression,
  //     inner = JavaScript object literal) instead of `style="..."`.
  //   - All tags must be closed: <div></div> or self-closing <div />.
  //   - Only ONE root element (the outermost <div> here is the root).
  //
  // TAILWIND CLASS BREAKDOWN (for beginner):
  //   relative      → position: relative (children can be absolutely positioned)
  //   h-72          → height: 18rem (288px) — the banner height
  //   overflow-hidden → hides content that extends outside the element
  //   flex-shrink-0 → prevents this element from shrinking in a flex container
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative h-72 overflow-hidden flex-shrink-0"
      style={backgroundStyle}
    >

      {/* ── Dark gradient overlay ───────────────────────────────────────────────
        *
        * This <div> sits on TOP of the background image (or gradient) and adds
        * a dark fade from transparent at the top to nearly-black at the bottom.
        * This makes the white text readable regardless of what the banner image is.
        *
        * TAILWIND CLASSES:
        *   absolute     → position: absolute (taken out of normal flow)
        *   inset-0      → top:0; right:0; bottom:0; left:0 — fills the parent
        *   bg-gradient-to-t → background: linear-gradient(to top, ...) — dark at bottom
        *   from-zinc-950   → the gradient starts with this color at the bottom
        *   via-zinc-950/60 → /60 means 60% opacity at the midpoint
        *   to-transparent  → fully transparent at the top
        *   pointer-events-none → clicks pass through this div to elements behind it
        */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent pointer-events-none" />

      {/* ── Animated accent line at the very top ────────────────────────────────
        * A thin colored stripe using the theme color — a subtle design flourish.
        * Using style={{ backgroundColor }} because it's a dynamic database value.
        */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: meta.themeColorHex }}
      />

      {/* ── Content: title, description, buttons ───────────────────────────────
        *
        * TAILWIND CLASSES:
        *   absolute bottom-0 left-0 right-0 → stick content to the bottom
        *   p-6           → padding: 1.5rem on all sides
        *   flex          → flexbox layout
        *   items-end     → align-items: flex-end (stick content to the bottom)
        *   justify-between → space-between: left content vs right buttons
        *   gap-4         → 1rem gap between flex children
        */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between gap-4 max-w-7xl mx-auto w-full">

        {/* ── Left: title and description ──────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* BADGE: shows visibility status */}
          <span
            className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2 border"
            style={{
              borderColor: meta.themeColorHex + '80', // 50% opacity border
              color: meta.themeColorHex,
              backgroundColor: meta.themeColorHex + '18', // 10% opacity fill
            }}
          >
            {meta.isPublic ? '🌐 Public List' : '🔒 Private List'}
          </span>

          {/* TITLE: truncate-friendly with drop shadow for readability */}
          <h1
            className="text-3xl font-extrabold text-white leading-tight tracking-tight"
            style={{ textShadow: `0 2px 20px ${meta.themeColorHex}60` }}
          >
            {/* {meta.title} — curly braces in JSX evaluate the JS expression */}
            {meta.title}
          </h1>

          {/* DESCRIPTION: only shown if it exists (conditional rendering) */}
          {/* 
            * CONDITIONAL RENDERING with &&:
            *   condition && <JSX />
            * If the condition is truthy, render the JSX. If falsy, render nothing.
            * meta.description is null when not set → null is falsy → nothing renders.
            * meta.description is "some text" → truthy → the <p> renders.
            */}
          {meta.description && (
            <p className="mt-1 text-zinc-300 text-sm line-clamp-2 max-w-xl">
              {/* line-clamp-2 → cap description at 2 lines with "..." overflow */}
              {meta.description}
            </p>
          )}
        </div>

        {/* ── Right: action buttons ────────────────────────────────────────── */}
        <div className="flex gap-2 flex-shrink-0">

          {/* UPLOAD BANNER button: outlined style using theme color */}
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 hover:scale-105 active:scale-95 backdrop-blur-sm"
            style={{
              borderColor: meta.themeColorHex,
              color: meta.themeColorHex,
              backgroundColor: meta.themeColorHex + '18',
            }}
            onClick={() => {
              // PLACEHOLDER: In a future step, this will open a file input dialog.
              // alert() is a browser function that shows a popup. We use it here
              // as a temporary stand-in before building the real upload feature.
              alert('Upload Banner — coming soon! Connect to Vercel Blob or Cloudinary.');
            }}
          >
            {/* 🖼️ is a Unicode emoji rendered directly in JSX */}
            🖼️ Upload Banner
          </button>

          {/* EDIT SETTINGS button: solid filled style */}
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-sm font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95 hover:opacity-90"
            style={{ backgroundColor: meta.themeColorHex }}
            onClick={() => {
              alert('Edit Settings — coming soon! Will open a modal to change title, description, and visibility.');
            }}
          >
            ⚙️ Edit Settings
          </button>
        </div>
      </div>
    </div>
  );
}
