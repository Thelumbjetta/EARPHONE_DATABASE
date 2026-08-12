/**
 * lib/reddit-queries.ts
 * =============================================================
 * Database Queries for Reddit-like Platform & Notifications
 * =============================================================
 */

import pool from '@/lib/db';

export type Community = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_by_user_id: number | null;
  banner_url: string | null;
  icon_url: string | null;
  member_count: number;
  created_at: Date;
};

export type RedditPost = {
  id: number;
  title: string;
  body: string;
  score: number;
  view_count: number;
  created_at: Date;
  updated_at: Date;
  user_id: number;
  author_username: string;
  author_avatar: string | null;
  community_id: number;
  community_name: string;
  community_slug: string;
  community_icon: string | null;
  comment_count: number;
  user_vote?: number; // 1, -1, or 0 for the logged in user
  media_urls?: string[];
};

export type UserNotification = {
  id: number;
  user_id: number;
  type: 'reply' | 'upvote' | 'mention';
  source_url: string;
  content: string;
  is_read: boolean;
  dismissed: boolean;
  created_at: Date;
};

// No fallback communities — data must come from the database only.
// If the DB is empty, the UI renders an empty state.
const FALLBACK_COMMUNITIES: Community[] = [];

// No fallback posts — data must come from the database only.
// If the DB is empty, the UI renders an empty state.
const FALLBACK_POSTS: RedditPost[] = [];

// ── Communities Queries ──────────────────────────────────────────────────────

export async function getAllCommunities(): Promise<Community[]> {
  try {
    const result = await pool.query<Community>(`
      SELECT id, name, slug, description, created_by_user_id, banner_url, icon_url, member_count, created_at
      FROM communities
      ORDER BY member_count DESC, name ASC
    `);
    return result.rows.length > 0 ? result.rows : FALLBACK_COMMUNITIES;
  } catch (err) {
    console.warn('getAllCommunities DB query failed, returning fallback data:', err);
    return FALLBACK_COMMUNITIES;
  }
}

export async function getCommunityBySlug(slug: string): Promise<Community | null> {
  try {
    const result = await pool.query<Community>(`
      SELECT id, name, slug, description, created_by_user_id, banner_url, icon_url, member_count, created_at
      FROM communities
      WHERE slug = $1
    `, [slug]);
    if (result.rows[0]) return result.rows[0];
  } catch (err) {
    console.warn('getCommunityBySlug DB query failed:', err);
  }
  return FALLBACK_COMMUNITIES.find((c) => c.slug === slug) || null;
}

export async function createCommunity(data: {
  name: string;
  slug: string;
  description?: string;
  icon_url?: string;
  banner_url?: string;
  created_by_user_id: number;
}): Promise<Community> {
  const result = await pool.query<Community>(`
    INSERT INTO communities (name, slug, description, icon_url, banner_url, created_by_user_id, member_count)
    VALUES ($1, $2, $3, $4, $5, $6, 1)
    RETURNING *
  `, [
    data.name,
    data.slug,
    data.description || null,
    data.icon_url || null,
    data.banner_url || null,
    data.created_by_user_id
  ]);
  return result.rows[0];
}

// ── Reddit Feed & Posts Queries ─────────────────────────────────────────────

export async function getRedditPosts(options: {
  communitySlug?: string;
  currentUserId?: number;
  sortBy?: 'hot' | 'new' | 'top';
  limit?: number;
  offset?: number;
}): Promise<RedditPost[]> {
  const { communitySlug, currentUserId, sortBy = 'hot', limit = 30, offset = 0 } = options;

  try {
    let whereClause = '';
    const queryParams: (string | number)[] = [];

    if (communitySlug && communitySlug !== 'all') {
      queryParams.push(communitySlug);
      whereClause = `WHERE c.slug = $${queryParams.length}`;
    }

    let orderClause = 'ORDER BY t.created_at DESC';
    if (sortBy === 'hot' || sortBy === 'top') {
      orderClause = 'ORDER BY t.score DESC, t.created_at DESC';
    } else if (sortBy === 'new') {
      orderClause = 'ORDER BY t.created_at DESC';
    }

    queryParams.push(limit, offset);
    const limitIdx = queryParams.length - 1;
    const offsetIdx = queryParams.length;

    const sql = `
      SELECT 
        t.id,
        t.title,
        t.body,
        t.score,
        t.view_count,
        t.created_at,
        t.updated_at,
        t.user_id,
        t.media_urls,
        u.username AS author_username,
        u.avatar_url AS author_avatar,
        c.id AS community_id,
        c.name AS community_name,
        c.slug AS community_slug,
        c.icon_url AS community_icon,
        COUNT(cm.id)::INTEGER AS comment_count,
        ${currentUserId ? `COALESCE(pv.vote_value, 0)::INTEGER` : `0::INTEGER`} AS user_vote
      FROM threads t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN communities c ON t.community_id = c.id
      LEFT JOIN comments cm ON cm.thread_id = t.id
      ${currentUserId ? `LEFT JOIN post_votes pv ON pv.thread_id = t.id AND pv.user_id = ${currentUserId}` : ''}
      ${whereClause}
      GROUP BY t.id, u.username, u.avatar_url, c.id, c.name, c.slug, c.icon_url ${currentUserId ? ', pv.vote_value' : ''}
      ${orderClause}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const result = await pool.query(sql, queryParams);
    if (result.rows.length > 0) return result.rows;
  } catch (err) {
    console.warn('getRedditPosts DB query failed, returning fallback posts:', err);
  }

  if (communitySlug && communitySlug !== 'all') {
    return FALLBACK_POSTS.filter((p) => p.community_slug === communitySlug);
  }
  return FALLBACK_POSTS;
}

export async function getRedditPostById(threadId: number, currentUserId?: number): Promise<RedditPost | null> {
  const sql = `
    SELECT 
      t.id,
      t.title,
      t.body,
      t.score,
      t.view_count,
      t.created_at,
      t.updated_at,
      t.user_id,
      t.media_urls,
      u.username AS author_username,
      u.avatar_url AS author_avatar,
      c.id AS community_id,
      c.name AS community_name,
      c.slug AS community_slug,
      c.icon_url AS community_icon,
      COUNT(cm.id)::INTEGER AS comment_count,
      ${currentUserId ? `COALESCE(pv.vote_value, 0)::INTEGER` : `0::INTEGER`} AS user_vote
    FROM threads t
    JOIN users u ON t.user_id = u.id
    LEFT JOIN communities c ON t.community_id = c.id
    LEFT JOIN comments cm ON cm.thread_id = t.id
    ${currentUserId ? `LEFT JOIN post_votes pv ON pv.thread_id = t.id AND pv.user_id = ${currentUserId}` : ''}
    WHERE t.id = $1
    GROUP BY t.id, u.username, u.avatar_url, c.id, c.name, c.slug, c.icon_url ${currentUserId ? ', pv.vote_value' : ''}
  `;

  const result = await pool.query(sql, [threadId]);
  return result.rows[0] || null;
}

// ── Voting & Karma Engine ───────────────────────────────────────────────────

export async function votePost(userId: number, threadId: number, newVoteValue: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch existing vote
    const existingVoteRes = await client.query(`
      SELECT vote_value FROM post_votes WHERE user_id = $1 AND thread_id = $2
    `, [userId, threadId]);

    const oldVoteValue = existingVoteRes.rows.length > 0 ? existingVoteRes.rows[0].vote_value : 0;
    const voteDelta = newVoteValue - oldVoteValue;

    if (voteDelta === 0) {
      await client.query('COMMIT');
      return { vote_value: newVoteValue, delta: 0 };
    }

    // Upsert vote
    if (newVoteValue === 0) {
      await client.query(`
        DELETE FROM post_votes WHERE user_id = $1 AND thread_id = $2
      `, [userId, threadId]);
    } else {
      await client.query(`
        INSERT INTO post_votes (user_id, thread_id, vote_value)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, thread_id)
        DO UPDATE SET vote_value = EXCLUDED.vote_value, created_at = NOW()
      `, [userId, threadId, newVoteValue]);
    }

    // Update thread score
    const threadRes = await client.query(`
      UPDATE threads
      SET score = score + $1
      WHERE id = $2
      RETURNING user_id, title, score, community_id
    `, [voteDelta, threadId]);

    const thread = threadRes.rows[0];

    // Update post author karma
    if (thread && thread.user_id) {
      await client.query(`
        UPDATE users
        SET karma = karma + $1
        WHERE id = $2
      `, [voteDelta, thread.user_id]);

      // If user upvoted someone else's post, generate notification
      if (newVoteValue === 1 && userId !== thread.user_id) {
        // Fetch voter username
        const voterRes = await client.query('SELECT username FROM users WHERE id = $1', [userId]);
        const voterName = voterRes.rows[0]?.username || 'A user';

        // Fetch community slug
        let commSlug = 'audiophile';
        if (thread.community_id) {
          const commRes = await client.query('SELECT slug FROM communities WHERE id = $1', [thread.community_id]);
          commSlug = commRes.rows[0]?.slug || 'audiophile';
        }

        const sourceUrl = `/r/${commSlug}/thread/${threadId}`;
        const content = `@${voterName} upvoted your post: "${thread.title.substring(0, 45)}"`;

        await client.query(`
          INSERT INTO notifications (user_id, type, source_url, content)
          VALUES ($1, 'upvote', $2, $3)
        `, [thread.user_id, sourceUrl, content]);
      }
    }

    await client.query('COMMIT');
    return { vote_value: newVoteValue, delta: voteDelta, newScore: thread?.score || 0 };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Notifications Engine ────────────────────────────────────────────────────

export async function getUnreadNotifications(userId: number): Promise<{
  notifications: UserNotification[];
  unread_count: number;
}> {
  const result = await pool.query<UserNotification>(`
    SELECT id, user_id, type, source_url, content, is_read, dismissed, created_at
    FROM notifications
    WHERE user_id = $1 AND is_read = FALSE AND dismissed = FALSE
    ORDER BY created_at DESC
    LIMIT 20
  `, [userId]);

  const countResult = await pool.query<{ count: string }>(`
    SELECT COUNT(*)::TEXT as count
    FROM notifications
    WHERE user_id = $1 AND is_read = FALSE AND dismissed = FALSE
  `, [userId]);

  return {
    notifications: result.rows,
    unread_count: parseInt(countResult.rows[0]?.count || '0', 10),
  };
}

export async function markNotificationsAsRead(userId: number, notificationIds?: number[]): Promise<void> {
  if (notificationIds && notificationIds.length > 0) {
    await pool.query(`
      UPDATE notifications
      SET is_read = TRUE, dismissed = TRUE
      WHERE user_id = $1 AND id = ANY($2::int[])
    `, [userId, notificationIds]);
  } else {
    await pool.query(`
      UPDATE notifications
      SET is_read = TRUE, dismissed = TRUE
      WHERE user_id = $1
    `, [userId]);
  }
}

export async function createReplyNotification(params: {
  recipientUserId: number;
  actorUsername: string;
  threadId: number;
  threadTitle: string;
  communitySlug: string;
}) {
  if (params.recipientUserId) {
    const sourceUrl = `/r/${params.communitySlug}/thread/${params.threadId}`;
    const content = `@${params.actorUsername} replied to your post: "${params.threadTitle.substring(0, 45)}"`;

    await pool.query(`
      INSERT INTO notifications (user_id, type, source_url, content)
      VALUES ($1, 'reply', $2, $3)
    `, [params.recipientUserId, sourceUrl, content]);
  }
}

export async function getUserStats(userId?: number): Promise<{ karma: number; view_count: number; upvotes: number }> {
  // Not logged in → return real zeros, not fake numbers
  if (!userId) {
    return { karma: 0, view_count: 0, upvotes: 0 };
  }
  try {
    const res = await pool.query<{ karma: number; total_views: string; total_upvotes: string }>(`
      SELECT 
        u.karma,
        COALESCE(SUM(t.view_count), 0)::TEXT as total_views,
        COALESCE(SUM(CASE WHEN pv.vote_value = 1 THEN 1 ELSE 0 END), 0)::TEXT as total_upvotes
      FROM users u
      LEFT JOIN threads t ON t.user_id = u.id
      LEFT JOIN post_votes pv ON pv.thread_id = t.id
      WHERE u.id = $1
      GROUP BY u.id, u.karma
    `, [userId]);

    if (res.rows[0]) {
      return {
        karma: res.rows[0].karma ?? 0,
        view_count: parseInt(res.rows[0].total_views || '0', 10),
        upvotes: parseInt(res.rows[0].total_upvotes || '0', 10),
      };
    }
  } catch (err) {
    console.warn('getUserStats DB query failed:', err);
  }
  // DB error → return real zeros, not fake numbers
  return { karma: 0, view_count: 0, upvotes: 0 };
}
