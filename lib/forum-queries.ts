/**
 * lib/forum-queries.ts
 * =============================================================
 * Forum Database Query Functions
 * =============================================================
 *
 * WHAT IS THIS FILE?
 *   A centralized library of typed TypeScript functions that talk
 *   directly to the PostgreSQL database. Each function represents
 *   one specific data operation the forum needs.
 *
 * WHY CENTRALIZE QUERIES HERE?
 *   - Reusability: API routes AND Server Components import the same function.
 *   - Single source of truth: fix a bug in one place, not five.
 *   - Testability: these pure async functions are easy to unit-test.
 *   - Separation of concerns: API routes handle HTTP; this file handles SQL.
 *
 * HOW THIS FILE IS USED:
 *   In an API route:
 *     import { getForumCategories } from '@/lib/forum-queries';
 *     const categories = await getForumCategories();
 *
 *   In a Next.js Server Component (page.tsx):
 *     import { getThreadsByCategory } from '@/lib/forum-queries';
 *     const { threads } = await getThreadsByCategory('head-gear', 1, 20);
 *
 * PARAMETERIZED QUERIES — SECURITY NOTE (for beginners):
 *   Every SQL query below uses $1, $2, $3 placeholders instead of
 *   string concatenation. This is called a "parameterized query."
 *
 *   NEVER do this (SQL Injection vulnerability):
 *     pool.query(`SELECT * FROM threads WHERE id = ${userInput}`)
 *
 *   ALWAYS do this (safe):
 *     pool.query('SELECT * FROM threads WHERE id = $1', [userInput])
 *
 *   Why? If userInput is "1; DROP TABLE threads;--", the string version
 *   would execute a second destructive SQL command. With parameterized
 *   queries, PostgreSQL treats $1 as raw data, never as SQL code.
 *   This is the #1 security rule in database programming.
 * =============================================================
 */

import pool from '@/lib/db';
// ↑ The singleton PostgreSQL connection pool from lib/db.ts.
//   Shared across all imports — one pool per server process.


// =============================================================
// TYPE DEFINITIONS
// =============================================================
//
// TypeScript TYPES describe the shape of objects in your code.
// They have ZERO runtime cost — they're stripped out when compiled to JS.
// Their only purpose is to help the IDE catch bugs before you run code.
// =============================================================

/**
 * A forum category (board section) row from the `forum_categories` table.
 * This is what gets returned when you fetch categories from the DB.
 */
export type ForumCategory = {
  id: number;
  name: string;
  description: string | null; // nullable — some categories have no description
  slug: string;               // URL-safe identifier, e.g. 'head-gear'
  display_order: number;
  created_at: Date;
};

/**
 * A thread row joined with author username and reply count.
 * This is the shape used in thread listing pages (not the full thread view).
 */
export type ThreadListItem = {
  id: number;
  category_id: number;
  user_id: number;
  author_username: string;    // joined from users.username
  title: string;
  view_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;        // COUNT of comments with this thread_id
  created_at: Date;
  updated_at: Date;           // last activity — used for "bumped" sort order
};

/**
 * A single thread's full data for the Thread View page.
 * Includes the opening post body + author details.
 */
export type ThreadDetail = {
  id: number;
  category_id: number;
  category_name: string;      // joined from forum_categories.name
  category_slug: string;      // joined from forum_categories.slug
  user_id: number;
  author_username: string;    // joined from users.username
  author_avatar_url: string | null;
  title: string;
  body: string;               // opening post body
  media_url: string | null;
  view_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: Date;
  updated_at: Date;
};

/**
 * A single comment (forum reply) joined with author username.
 */
export type ForumComment = {
  id: number;
  thread_id: number;
  user_id: number;
  author_username: string;
  author_avatar_url: string | null;
  content: string;            // rich text body
  media_url: string | null;
  created_at: Date;
};

/**
 * A paginated response wrapper — reused for any list that supports pagination.
 * GENERIC TYPE: PaginatedResult<T> works for threads, comments, tier lists, etc.
 *
 * HOW GENERICS WORK (for beginners):
 *   `<T>` is a type placeholder. When you write PaginatedResult<ThreadListItem>,
 *   TypeScript fills in T = ThreadListItem everywhere T appears in the type body.
 *   It's like a template for types.
 */
export type PaginatedResult<T> = {
  data: T[];         // the array of rows for this page
  total: number;     // total number of matching rows (for "Page 3 of 12" UI)
  page: number;      // current page number (1-indexed)
  limit: number;     // how many rows per page
  totalPages: number; // Math.ceil(total / limit)
};

/**
 * A public community tier list row for the community feed.
 */
export type CommunityTierList = {
  id: number;
  user_id: number;
  author_username: string;
  title: string;
  description: string | null;
  banner_image_url: string | null;
  theme_color_hex: string;
  is_public: boolean;
  category: string | null;
  created_at: Date;
};

/**
 * Input shape for creating a new thread.
 * Separating input types from DB row types is a clean pattern —
 * it makes it clear what the API expects vs what the DB returns.
 */
export type CreateThreadInput = {
  category_id: number;
  user_id: number;
  title: string;
  body: string;
  media_url?: string; // optional — the ? means this field may be absent
};

/**
 * Input shape for creating a new comment.
 */
export type CreateCommentInput = {
  thread_id: number;
  user_id: number;
  content: string;
  media_url?: string;
};

/**
 * Input shape for creating a new community tier list.
 */
export type CreateTierListInput = {
  user_id: number;
  title: string;
  description?: string;
  banner_image_url?: string;
  theme_color_hex?: string;
  is_public?: boolean;
  category?: string;
};


// =============================================================
// QUERY FUNCTIONS
// =============================================================


// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all forum categories, ordered by their display_order field.
 *
 * Used by: Board Index page, "Create Thread" category dropdown.
 *
 * SQL CONCEPTS IN THIS QUERY:
 *   SELECT * — fetch all columns from the table.
 *   FROM forum_categories — which table to read from.
 *   ORDER BY display_order ASC — sort rows from lowest (1) to highest number.
 *   ASC means "ascending" (1, 2, 3…). DESC would be descending (10, 9, 8…).
 */
export async function getForumCategories(): Promise<ForumCategory[]> {
  // pool.query<RowType>(sql) runs the SQL and returns rows typed as RowType.
  // result.rows is the array of matching database rows.
  const result = await pool.query<ForumCategory>(
    `SELECT
       id,
       name,
       description,
       slug,
       display_order,
       created_at
     FROM forum_categories
     ORDER BY display_order ASC`
  );

  return result.rows;
}

/**
 * Finds a single forum category by its URL slug.
 *
 * Returns null if no category with that slug exists.
 * Used by: Thread Listing page to resolve /forum/head-gear → category id=1.
 *
 * SQL CONCEPTS:
 *   WHERE slug = $1 — filter to rows where the slug column equals our value.
 *   LIMIT 1 — return at most one row (slug is UNIQUE, so there's only ever one).
 *   result.rows[0] — access the first (and only) row in the results array.
 */
export async function getCategoryBySlug(
  slug: string
): Promise<ForumCategory | null> {
  const result = await pool.query<ForumCategory>(
    `SELECT id, name, description, slug, display_order, created_at
     FROM forum_categories
     WHERE slug = $1
     LIMIT 1`,
    [slug] // $1 is replaced with this value at query time — SQL-injection safe
  );

  // result.rows[0] is undefined if no rows matched.
  // The ?? null converts undefined → null, which is more explicit for TypeScript.
  return result.rows[0] ?? null;
}


// ─────────────────────────────────────────────────────────────────────────────
// THREADS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a paginated list of threads for a given forum category.
 * Pinned threads always appear first, then sorted by most recent activity.
 *
 * @param categoryId - The numeric ID of the category to fetch threads for.
 * @param page       - Which page of results (1 = first page).
 * @param limit      - How many threads per page (default 20).
 *
 * SQL CONCEPTS IN THIS QUERY:
 *
 *   JOIN:
 *     A JOIN combines rows from two tables based on a matching condition.
 *     We join `users` to get the author's username alongside each thread.
 *     Without a JOIN, we'd need a separate query per thread to get usernames.
 *
 *     Syntax: JOIN users u ON t.user_id = u.id
 *     This says: "for each thread row (t), find the user row (u) where
 *     t.user_id equals u.id, and attach u's columns to the result."
 *
 *   COUNT (subquery):
 *     We compute the reply count using a correlated subquery:
 *       (SELECT COUNT(*) FROM comments c WHERE c.thread_id = t.id) AS reply_count
 *     For each thread row, PostgreSQL counts how many comment rows reference it.
 *     COUNT(*) counts all matching rows (including NULLs).
 *
 *   OFFSET:
 *     OFFSET skips a certain number of rows — used for pagination.
 *     Page 1, limit 20 → OFFSET 0  (show rows 1–20)
 *     Page 2, limit 20 → OFFSET 20 (skip first 20, show rows 21–40)
 *     Formula: OFFSET = (page - 1) * limit
 */
export async function getThreadsByCategory(
  categoryId: number,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResult<ThreadListItem>> {

  // Calculate the number of rows to skip for pagination.
  // Page 1 → offset 0. Page 2 → offset 20. Page 3 → offset 40.
  const offset = (page - 1) * limit;

  // ── Run both queries in PARALLEL using Promise.all ──────────────────────────
  //
  // WHAT IS Promise.all?
  //   Normally, await executes one async operation, waits for it, then moves
  //   to the next. This is sequential and slow when operations are independent.
  //
  //   Promise.all([promiseA, promiseB]) fires BOTH at the same time and
  //   waits for BOTH to finish. Since the count query and the threads query
  //   don't depend on each other, running them in parallel saves time.
  //
  //   Single sequential: wait 15ms + wait 15ms = 30ms total
  //   Promise.all parallel: max(15ms, 15ms) = 15ms total
  // ─────────────────────────────────────────────────────────────────────────
  const [countResult, threadsResult] = await Promise.all([

    // Query 1: Count total matching threads (for "Page X of Y" display)
    pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM threads
       WHERE category_id = $1`,
      [categoryId]
    ),

    // Query 2: Fetch the actual thread rows with author name and reply count
    pool.query<ThreadListItem>(
      `SELECT
         t.id,
         t.category_id,
         t.user_id,
         u.username       AS author_username,
         t.title,
         t.view_count,
         t.is_pinned,
         t.is_locked,
         t.created_at,
         t.updated_at,
         -- Correlated subquery: count replies for THIS thread
         -- This runs once per thread row returned by the outer query.
         (
           SELECT COUNT(*)
           FROM comments c
           WHERE c.thread_id = t.id
         )::INTEGER        AS reply_count
       FROM threads t
       -- INNER JOIN users: each thread must have an author
       JOIN users u ON t.user_id = u.id
       WHERE t.category_id = $1
       -- Sort: pinned threads float to the top, then most recently active
       ORDER BY t.is_pinned DESC, t.updated_at DESC
       LIMIT $2
       OFFSET $3`,
      [categoryId, limit, offset]
    ),
  ]);

  // PostgreSQL returns COUNT() as a string (e.g., "42"), not a number.
  // parseInt converts it: "42" → 42.
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    data: threadsResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit), // e.g., 45 items / 20 per page = 3 pages
  };
}

/**
 * Fetches a single thread's full details for the Thread View page,
 * AND increments the thread's view_count by 1 (server-side view tracking).
 *
 * @param threadId - The numeric ID of the thread to fetch.
 * @returns The thread detail object, or null if not found.
 *
 * SQL CONCEPTS:
 *   Multiple JOINs: We join both `users` (for the author) and
 *   `forum_categories` (for the category name and slug).
 *
 *   UPDATE ... RETURNING:
 *     The first query atomically increments view_count and returns the
 *     updated row. "Atomic" means the read and write happen as a single
 *     operation — no race conditions between reading and updating.
 */
export async function getThreadById(
  threadId: number
): Promise<ThreadDetail | null> {

  // ── Step 1: Increment view_count atomically ────────────────────────────────
  //
  // view_count = view_count + 1:
  //   Increment the existing value by 1. This is always safe — if two
  //   requests arrive at the same time, PostgreSQL handles the concurrency.
  //
  // RETURNING *: After the UPDATE, return all columns of the updated row.
  //   This saves us a second SELECT — one round-trip to the DB instead of two.
  // ─────────────────────────────────────────────────────────────────────────
  const updateResult = await pool.query<{ id: number }>(
    `UPDATE threads
     SET view_count = view_count + 1
     WHERE id = $1
     RETURNING id`,
    [threadId]
  );

  // If no rows were updated, the thread doesn't exist.
  if (updateResult.rowCount === 0) {
    return null;
  }

  // ── Step 2: Fetch full thread details with JOINs ──────────────────────────
  const result = await pool.query<ThreadDetail>(
    `SELECT
       t.id,
       t.category_id,
       fc.name           AS category_name,
       fc.slug           AS category_slug,
       t.user_id,
       u.username        AS author_username,
       u.avatar_url      AS author_avatar_url,
       t.title,
       t.body,
       t.media_url,
       t.view_count,
       t.is_pinned,
       t.is_locked,
       t.created_at,
       t.updated_at
     FROM threads t
     -- Join author details
     JOIN users u             ON t.user_id     = u.id
     -- Join category details
     JOIN forum_categories fc ON t.category_id = fc.id
     WHERE t.id = $1`,
    [threadId]
  );

  return result.rows[0] ?? null;
}

/**
 * Inserts a new thread into the database.
 *
 * @returns The newly created thread row (id + all fields) from RETURNING.
 *
 * SQL CONCEPTS:
 *   INSERT INTO ... VALUES ($1, $2, ...) RETURNING *:
 *   Inserts a row and immediately returns all columns of the new row.
 *   Without RETURNING, INSERT returns no data — you'd need a second SELECT.
 *   With RETURNING, you get the auto-generated id, default timestamps, etc.
 */
export async function createThread(input: CreateThreadInput): Promise<ThreadDetail> {
  const result = await pool.query<ThreadDetail>(
    `INSERT INTO threads (category_id, user_id, title, body, media_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING
       id, category_id, user_id, title, body, media_url,
       view_count, is_pinned, is_locked, created_at, updated_at`,
    [
      input.category_id,
      input.user_id,
      input.title.trim(),                 // trim() removes accidental leading/trailing spaces
      input.body.trim(),
      input.media_url ?? null,            // undefined → null (SQL understands null, not undefined)
    ]
  );

  // After creating the thread, increment the user's post_count.
  // This is the denormalized counter we added in migration 010.
  // We do this as a separate UPDATE rather than a trigger to keep the
  // schema simple and the logic explicit.
  await pool.query(
    `UPDATE users SET post_count = post_count + 1 WHERE id = $1`,
    [input.user_id]
  );

  return result.rows[0];
}


// ─────────────────────────────────────────────────────────────────────────────
// COMMENTS (forum replies)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches paginated comments for a specific thread, in chronological order.
 * Oldest comment first (ASC) = traditional forum reply ordering.
 *
 * @param threadId - The thread to fetch replies for.
 * @param page     - Page number (1-indexed).
 * @param limit    - Replies per page (default 50 — forum threads can be long).
 */
export async function getCommentsByThread(
  threadId: number,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResult<ForumComment>> {

  const offset = (page - 1) * limit;

  const [countResult, commentsResult] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM comments WHERE thread_id = $1`,
      [threadId]
    ),
    pool.query<ForumComment>(
      `SELECT
         c.id,
         c.thread_id,
         c.user_id,
         u.username        AS author_username,
         u.avatar_url      AS author_avatar_url,
         c.content,
         c.media_url,
         c.created_at
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.thread_id = $1
       -- ASC = chronological (oldest reply first, just like a real forum)
       ORDER BY c.created_at ASC
       LIMIT $2
       OFFSET $3`,
      [threadId, limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  return {
    data: commentsResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Inserts a new comment (forum reply) into the database.
 * Also bumps the parent thread's `updated_at` timestamp (a "thread bump")
 * and increments the author's `post_count`.
 *
 * @returns The newly created comment row.
 *
 * TRANSACTION CONCEPT (for beginners):
 *   A database transaction groups multiple SQL statements so they either
 *   ALL succeed or ALL fail together. This is called "atomicity."
 *   Example: if we INSERT the comment but then the UPDATE thread fails,
 *   we don't want the comment to remain in the DB with a stale updated_at.
 *
 *   We use a transaction here with:
 *     BEGIN  — start the transaction
 *     ...SQL...
 *     COMMIT — save all changes permanently
 *   If any query throws, we ROLLBACK — undo all changes since BEGIN.
 */
export async function createComment(
  input: CreateCommentInput
): Promise<ForumComment> {

  // Acquire a dedicated client for the transaction.
  // pool.connect() checks out one connection from the pool.
  // IMPORTANT: Always call client.release() when done to return it to the pool.
  const client = await pool.connect();

  try {
    // BEGIN: Start the transaction. All queries on this client are now
    // grouped together. Nothing is committed to the DB yet.
    await client.query('BEGIN');

    // Insert the new comment
    const commentResult = await client.query<ForumComment>(
      `INSERT INTO comments (thread_id, user_id, content, media_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, thread_id, user_id, content, media_url, created_at`,
      [
        input.thread_id,
        input.user_id,
        input.content.trim(),
        input.media_url ?? null,
      ]
    );

    // Bump the thread's updated_at so it rises to the top of the listing.
    // NOW() returns the current timestamp — same moment as the comment insert.
    await client.query(
      `UPDATE threads SET updated_at = NOW() WHERE id = $1`,
      [input.thread_id]
    );

    // Increment the commenter's post_count.
    await client.query(
      `UPDATE users SET post_count = post_count + 1 WHERE id = $1`,
      [input.user_id]
    );

    // COMMIT: All three changes (INSERT + 2 UPDATEs) are now permanently saved.
    await client.query('COMMIT');

    return commentResult.rows[0];

  } catch (error) {
    // ROLLBACK: Undo all changes from this transaction.
    // The comment INSERT, thread UPDATE, and user UPDATE are all reverted.
    // The DB is back to exactly how it was before this function was called.
    await client.query('ROLLBACK');
    throw error; // Re-throw so the API route can catch it and return HTTP 500.

  } finally {
    // ALWAYS release the client — even if an error occurred.
    // Failing to release leaks connections and eventually exhausts the pool.
    client.release();
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// COMMUNITY TIER LISTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a paginated feed of public community tier lists.
 * Ordered by most recently created (newest first).
 *
 * @param page  - Page number (1-indexed).
 * @param limit - Tier lists per page (default 20).
 * @param category - Optional category filter (e.g., 'IEM'). Pass null for all.
 */
export async function getPublicTierLists(
  page: number = 1,
  limit: number = 20,
  category: string | null = null
): Promise<PaginatedResult<CommunityTierList>> {

  const offset = (page - 1) * limit;

  // DYNAMIC WHERE CLAUSE:
  // If category is provided, filter by it. Otherwise, show all public lists.
  // We build the query with a conditional AND clause.
  //
  // WHY NOT STRING CONCATENATION?
  //   We could write: `WHERE is_public = TRUE ${category ? `AND category = '${category}'` : ''}`
  //   But this is a SQL injection vulnerability! Always use $N placeholders.
  //
  //   Instead: build the params array dynamically.
  //   If category is null → params = [limit, offset], and the WHERE has no category filter.
  //   If category = 'IEM' → params = ['IEM', limit, offset], and we add AND category = $1.
  const params: (string | number | null)[] = [];
  let categoryFilter = '';

  if (category !== null) {
    params.push(category);           // $1 = category value
    categoryFilter = `AND tl.category = $${params.length}`;
  }

  // Now add limit and offset AFTER the optional category param.
  params.push(limit);   // next positional placeholder
  params.push(offset);

  const limitPlaceholder  = `$${params.length - 1}`; // second-to-last
  const offsetPlaceholder = `$${params.length}`;      // last

  const [countResult, listsResult] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM tier_lists tl
       WHERE tl.is_public = TRUE ${categoryFilter}`,
      category !== null ? [category] : []
    ),
    pool.query<CommunityTierList>(
      `SELECT
         tl.id,
         tl.user_id,
         u.username         AS author_username,
         tl.title,
         tl.description,
         tl.banner_image_url,
         tl.theme_color_hex,
         tl.is_public,
         tl.category,
         tl.created_at
       FROM tier_lists tl
       JOIN users u ON tl.user_id = u.id
       WHERE tl.is_public = TRUE ${categoryFilter}
       ORDER BY tl.created_at DESC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      params
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  return {
    data: listsResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Creates a new community tier list for a user.
 * Returns the newly created tier_list row.
 */
export async function createCommunityTierList(
  input: CreateTierListInput
): Promise<CommunityTierList & { id: number }> {

  const result = await pool.query<CommunityTierList & { id: number }>(
    `INSERT INTO tier_lists
       (user_id, title, description, banner_image_url, theme_color_hex, is_public, category)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING
       id, user_id, title, description, banner_image_url,
       theme_color_hex, is_public, category, created_at`,
    [
      input.user_id,
      input.title.trim(),
      input.description?.trim()       ?? null,
      input.banner_image_url?.trim()  ?? null,
      input.theme_color_hex           ?? '#6366f1', // indigo default
      input.is_public                 ?? true,       // public by default
      input.category?.trim()          ?? null,
    ]
  );

  return result.rows[0];
}
