/**
 * app/api/upload/route.ts
 * =============================================================
 * API Route: POST /api/upload
 * =============================================================
 * Handles file transfers for images (.png, .jpg, .jpeg, .webp, .gif).
 * Validates file size (max 10MB) and MIME type.
 * Saves the file to `public/uploads/` and returns the public relative URL.
 * =============================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Max file size: 10MB in bytes
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed image MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file was provided in the request body.' },
        { status: 400 }
      );
    }

    // ── Validate File Size ───────────────────────────────────────────────────
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds the 10MB limit.' },
        { status: 400 }
      );
    }

    // ── Validate MIME Type ───────────────────────────────────────────────────
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type (${file.type}). Allowed formats: PNG, JPG, WEBP, GIF.` },
        { status: 400 }
      );
    }

    // ── Ensure Upload Directory Exists ───────────────────────────────────────
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // ── Generate Unique Filename ─────────────────────────────────────────────
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${randomStr}_${sanitizedOriginalName}`;
    const filepath = join(uploadsDir, filename);

    // ── Convert File to Buffer and Save ──────────────────────────────────────
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({
      url: publicUrl,
      filename,
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('[POST /api/upload] File upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file. Please try again later.' },
      { status: 500 }
    );
  }
}
