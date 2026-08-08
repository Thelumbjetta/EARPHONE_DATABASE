/**
 * components/tier-list/types.ts
 * =============================================================
 * Shared TypeScript Type Definitions — Tier List Feature
 * =============================================================
 *
 * WHAT IS THIS FILE?
 *   A "type definition" file. It contains no logic, no functions,
 *   no React components — only DESCRIPTIONS of data shapes.
 *
 *   Think of a TypeScript type like a contract that says:
 *   "Any object labelled as type X MUST have these fields with
 *   these exact data types." TypeScript then enforces this contract
 *   everywhere the type is used, catching mistakes BEFORE the code runs.
 *
 * WHY A SEPARATE FILE FOR TYPES?
 *   If we defined types inside each component file, we'd have to
 *   copy them whenever another component needs the same shape.
 *   Centralizing them here means:
 *     - One source of truth.
 *     - Change a field here → every file using the type gets updated
 *       automatically (TypeScript shows errors everywhere the old
 *       field name is still used).
 *
 * HOW TO USE THIS FILE:
 *   import type { TierListMeta, DraggableItem } from './types';
 *   (The `import type` keyword tells TypeScript this import is only
 *    used for type-checking — it disappears completely at runtime.)
 * =============================================================
 */


// =============================================================
// SECTION 1: Database-mirroring types
// These match the shape of rows returned by our PostgreSQL queries.
// Column names are converted from snake_case (SQL convention) to
// camelCase (JavaScript convention). e.g., banner_image_url → bannerImageUrl
// =============================================================


// ── TierListMeta ──────────────────────────────────────────────────────────────
//
// KEYWORD: export
//   Makes this type available to other files via import.
//   Without export, the type is private to this file.
//
// KEYWORD: interface
//   Defines the shape of an object. An "interface" is a blueprint:
//   "Any object of type TierListMeta must have ALL these fields."
//
// This mirrors a row from the `tier_lists` database table (migration 007).
// ─────────────────────────────────────────────────────────────────────────────
export interface TierListMeta {
  id: number;               // The tier list's unique database ID (SERIAL in SQL)
  userId: number;           // The ID of the user who owns this list
  title: string;            // e.g., "HBB's Budget IEM Rankings 2026"
  description: string | null; // Optional long-form description.
  //                            The `| null` means this field can be EITHER a string
  //                            OR the special null value (meaning "no description set").
  //                            This matches the nullable column in the database.
  bannerImageUrl: string | null; // URL to a custom background image, or null if not set
  themeColorHex: string;    // Hex color for UI accents, e.g., "#e85d04"
  isPublic: boolean;        // true = visible to everyone, false = private
  createdAt: string;        // ISO date string from the database TIMESTAMPTZ column
}


// ── ListTier ──────────────────────────────────────────────────────────────────
//
// Mirrors a row from the `list_tiers` table (migration 008).
// Each ListTier is one colored row in a tier list.
// e.g., { name: "S-Tier", colorHex: "#ffd60a", rankOrder: 1 }
// ─────────────────────────────────────────────────────────────────────────────
export interface ListTier {
  id: number;          // Unique ID for this tier row
  tierListId: number;  // Which tier list this row belongs to (FK to tier_lists)
  name: string;        // Display label: "S-Tier", "Garbage", "Not Yet Tried"
  colorHex: string;    // Row accent color: "#ffd60a" for gold, "#e63946" for red
  rankOrder: number;   // Sort position: 1 = top (best), 5 = bottom (worst)
}


// ── TierItem ──────────────────────────────────────────────────────────────────
//
// Mirrors a JOIN result from tier_list_items + earphones tables.
// Represents an earphone that has been PLACED into a specific tier row.
// ─────────────────────────────────────────────────────────────────────────────
export interface TierItem {
  id: number;               // tier_list_items.id (the placement record's ID)
  tierId: number;           // Which tier row this earphone was placed in
  earphoneId: number;       // The earphone's ID from the master catalog
  brand: string;            // e.g., "Moondrop" — from earphones.brand
  model: string;            // e.g., "Aria"     — from earphones.model
  price: number;            // Price in dollars — from earphones.price
  userStars: number | null; // Personal rating 0.0–10.0, or null if not rated
  userNotes: string | null; // Personal mini-review text, or null if not written
}


// =============================================================
// SECTION 2: Editor-specific types
// These are used by the React components in the UI layer,
// not directly returned from the database.
// =============================================================


// ── DraggableItem ─────────────────────────────────────────────────────────────
//
// A unified type for any earphone card that can be dragged — whether it's
// currently placed in a tier row OR sitting in the unranked pool.
//
// WHY A SEPARATE TYPE FROM TierItem?
//   TierItem has `id` = the tier_list_items database record ID.
//   DraggableItem has `id` = a STRING used by the drag-and-drop library.
//   The DnD library needs a unique string ID for every draggable element
//   on the page. Using "item-55" vs "ear-23" as prefixes ensures that
//   items placed in tiers and items in the unranked pool never clash,
//   even if their numeric IDs happen to be the same number.
// ─────────────────────────────────────────────────────────────────────────────
export interface DraggableItem {
  id: string;               // Unique string ID for dnd-kit: "item-{id}" or "ear-{earphoneId}"
  earphoneId: number;       // The earphone's database ID (for saving changes to the server)
  brand: string;            // Display: brand name
  model: string;            // Display: model name
  price: number;            // Display: price in dollars
  userStars: number | null; // Display: star rating, or null
  userNotes: string | null; // Display: notes text, or null
  graphUrl?: string | null; // Frequency response graph URL
}


// ── TierListPageData ──────────────────────────────────────────────────────────
//
// The complete dataset for the tier list editor page.
// This is what the API route returns and what TierListEditor receives as props.
//
// STRUCTURE:
//   meta    → describes the tier list itself (title, colors, banner)
//   tiers   → the tier ROWS in display order (S-Tier, A-Tier, etc.)
//   items   → earphones PLACED in tiers (with their tier association)
//   unranked → earphones NOT yet placed in any tier (the "pool")
// ─────────────────────────────────────────────────────────────────────────────
export interface TierListPageData {
  meta: TierListMeta;
  tiers: ListTier[];           // Sorted by rankOrder ASC (best tier first)
  items: TierItem[];           // All placed earphones across all tiers
  unranked: DraggableItem[];   // Earphones not yet placed in any tier
}
