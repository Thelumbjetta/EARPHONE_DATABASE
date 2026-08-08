/**
 * app/api/community/tier-lists/[id]/route.ts
 * =============================================================
 * API Routes: GET + PATCH + DELETE /api/community/tier-lists/:id
 * =============================================================
 *
 * THIS FILE EXPORTS THREE HANDLERS (GET, PATCH, DELETE):
 *
 *   GET    /api/community/tier-lists/42
 *     → Returns a single tier list with its tiers and items.
 *       Reuses the existing `getTierListPageData` query from the
 *       older tier-list system — no duplication of DB logic.
 *
 *   PATCH  /api/community/tier-lists/42
 *     → Partially updates a tier list's metadata.
 *       Only the fields you send get updated. Fields you omit stay unchanged.
 *       This is the "PATCH" semantic (partial update), not "PUT" (full replace).
 *
 *   DELETE /api/community/tier-lists/42
 *     → Deletes a tier list by ID.
 *       Validates ownership (user_id must match the list's owner).
 *
 * CRUD DEFINITION (for beginners):
 *   CRUD stands for: Create, Read, Update, Delete — the four basic operations
 *   for managing data. Almost every data entity in a web app needs these.
 *     Create → POST /api/community/tier-lists        (in route.ts)
 *     Read   → GET  /api/community/tier-lists/[id]  (this file)
 *     Update → PATCH /api/community/tier-lists/[id] (this file)
 *     Delete → DELETE /api/community/tier-lists/[id] (this file)
 *
 * PATCH REQUEST BODY (all fields optional):
 *   {
 *     "user_id":          1,              // required for ownership check
 *     "title":            "Updated Title",
 *     "description":      "New description",
 *     "banner_image_url": "https://...",
 *     "theme_color_hex":  "#FF5733",
 *     "is_public":        false,
 *     "category":         "Over-Ear"
 *   }
 *
 * DELETE REQUEST BODY:
 *   { "user_id": 1 }   // required to verify ownership
 *
 * HTTP STATUS CODES USED:
 *   200 OK            — Successful read or update
 *   201 Created       — (used in route.ts for create)
 *   400 Bad Request   — Invalid input (bad ID format, missing required field)
 *   403 Forbidden     — Ownership mismatch (user is not the owner)
 *   404 Not Found     — Tier list with this ID doesn't exist
 *   500 Server Error  — Unexpected database error
 * =============================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTierListPageData } from '@/lib/tier-list-queries';
// ↑ Reuses the existing query function — DRY principle (Don't Repeat Yourself).
//   This function fetches a tier list + all its rows + all placed items.

import pool from '@/lib/db';
// ↑ We need the raw pool for the PATCH and DELETE custom queries
//   (no existing query functions for those operations).


// =============================================================
// GET — fetch a single tier list with tiers and items
// =============================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // The underscore prefix `_request` is a convention meaning "this parameter
  // exists in the function signature but we don't use it in the function body."
  // TypeScript/ESLint would warn about unused variables — the _ suppresses that.

  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId) || numericId < 1) {
      return NextResponse.json(
        { error: 'Invalid tier list ID.' },
        { status: 400 }
      );
    }

    // Delegate to the existing query function — reuse, don't duplicate.
    const data = await getTierListPageData(numericId);

    if (!data) {
      return NextResponse.json(
        { error: `Tier list with ID ${numericId} was not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(data);

  } catch (error: unknown) {
    console.error('[GET /api/community/tier-lists/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tier list.' },
      { status: 500 }
    );
  }
}


// =============================================================
// PATCH — partially update a tier list's metadata
// =============================================================
//
// WHAT IS PATCH vs PUT?
//   PUT   = "Replace the entire resource." You must send ALL fields.
//           If you omit `description`, it's set to NULL (erased).
//   PATCH = "Update only what I send." Fields you omit are left unchanged.
//           This is the correct choice for metadata edits where the user
//           may only want to change the title, leaving everything else alone.
//
// HOW WE BUILD DYNAMIC SQL:
//   Since any combination of fields may be present, we build the SET clause
//   dynamically by looping through the provided fields.
//   Example:
//     Input: { title: "New Title", is_public: false }
//     SQL:   UPDATE tier_lists SET title = $1, is_public = $2 WHERE id = $3
// =============================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId) || numericId < 1) {
      return NextResponse.json(
        { error: 'Invalid tier list ID.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { user_id, title, description, banner_image_url, theme_color_hex, is_public, category } = body;

    // user_id is required for ownership check.
    if (!user_id || typeof user_id !== 'number') {
      return NextResponse.json(
        { error: 'user_id is required for ownership verification.' },
        { status: 400 }
      );
    }

    // ── Verify ownership ──────────────────────────────────────────────────────
    //
    // Before allowing the edit, confirm that the requesting user actually
    // owns this tier list. Without this check, anyone could edit anyone's list.
    //
    // In a production app with NextAuth sessions, you'd compare against
    // the session user ID. Here we compare against the user_id in the body.
    // ─────────────────────────────────────────────────────────────────────────
    const ownerCheck = await pool.query<{ user_id: number }>(
      `SELECT user_id FROM tier_lists WHERE id = $1`,
      [numericId]
    );

    if (ownerCheck.rowCount === 0) {
      return NextResponse.json(
        { error: `Tier list with ID ${numericId} was not found.` },
        { status: 404 }
      );
    }

    if (ownerCheck.rows[0].user_id !== user_id) {
      // This user doesn't own this tier list. Refuse the update.
      return NextResponse.json(
        { error: 'You do not have permission to edit this tier list.' },
        { status: 403 } // 403 Forbidden
      );
    }

    // ── Build a dynamic UPDATE query ──────────────────────────────────────────
    //
    // We only update columns that were actually provided in the request body.
    // The `updates` object maps column names to their new values.
    // We skip undefined values — those fields won't appear in the SQL.
    // ─────────────────────────────────────────────────────────────────────────

    // Collect which columns to update.
    // Object.entries() converts { title: 'New', is_public: false }
    // into [['title', 'New'], ['is_public', false]]
    const updatableFields: Record<string, unknown> = {};
    if (title            !== undefined) updatableFields['title']            = title.trim();
    if (description      !== undefined) updatableFields['description']      = description;
    if (banner_image_url !== undefined) updatableFields['banner_image_url'] = banner_image_url;
    if (theme_color_hex  !== undefined) updatableFields['theme_color_hex']  = theme_color_hex;
    if (is_public        !== undefined) updatableFields['is_public']        = is_public;
    if (category         !== undefined) updatableFields['category']         = category;

    // Nothing to update? That's a client error.
    const fieldEntries = Object.entries(updatableFields);
    if (fieldEntries.length === 0) {
      return NextResponse.json(
        { error: 'No updatable fields were provided.' },
        { status: 400 }
      );
    }

    // Build the SET clause: "title = $1, is_public = $2" etc.
    // $1, $2 are our parameterized placeholders — safe against SQL injection.
    const setClauses = fieldEntries.map(([col], index) => `${col} = $${index + 1}`).join(', ');
    const values     = fieldEntries.map(([, val]) => val);

    // The WHERE clause uses the next parameter after all the SET values.
    const idPlaceholder = `$${values.length + 1}`;
    values.push(numericId);

    const updateResult = await pool.query(
      `UPDATE tier_lists
       SET ${setClauses}
       WHERE id = ${idPlaceholder}
       RETURNING id, user_id, title, description, banner_image_url, theme_color_hex, is_public, category, created_at`,
      values
    );

    return NextResponse.json({ tierList: updateResult.rows[0] });

  } catch (error: unknown) {
    console.error('[PATCH /api/community/tier-lists/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update tier list.' },
      { status: 500 }
    );
  }
}


// =============================================================
// DELETE — remove a tier list
// =============================================================
//
// CASCADES IN ACTION:
//   When we DELETE a row from tier_lists, PostgreSQL automatically:
//     1. Deletes all list_tiers rows that reference this tier_list id.
//     2. Deletes all tier_list_items rows that reference those list_tiers rows.
//   This "cascade" happens because of the ON DELETE CASCADE foreign keys
//   defined in migrations 008 and 009. One DELETE statement, zero orphans.
// =============================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId) || numericId < 1) {
      return NextResponse.json(
        { error: 'Invalid tier list ID.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { user_id } = body;

    if (!user_id || typeof user_id !== 'number') {
      return NextResponse.json(
        { error: 'user_id is required to confirm ownership before deletion.' },
        { status: 400 }
      );
    }

    // Verify ownership before deleting.
    const ownerCheck = await pool.query<{ user_id: number }>(
      `SELECT user_id FROM tier_lists WHERE id = $1`,
      [numericId]
    );

    if (ownerCheck.rowCount === 0) {
      return NextResponse.json(
        { error: `Tier list with ID ${numericId} was not found.` },
        { status: 404 }
      );
    }

    if (ownerCheck.rows[0].user_id !== user_id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this tier list.' },
        { status: 403 }
      );
    }

    // ── Perform the delete ───────────────────────────────────────────────────
    // ON DELETE CASCADE (from migrations 008, 009) handles child row cleanup.
    await pool.query(
      `DELETE FROM tier_lists WHERE id = $1`,
      [numericId]
    );

    // HTTP 200 OK with a success message.
    // (Some APIs use 204 No Content, which sends no body at all.
    //  We prefer 200 + JSON so the client gets a confirmation message.)
    return NextResponse.json(
      { message: `Tier list ${numericId} was successfully deleted.` },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('[DELETE /api/community/tier-lists/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete tier list.' },
      { status: 500 }
    );
  }
}
