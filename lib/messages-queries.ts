import pool from '@/lib/db';

export type DirectMessage = {
  id: number;
  sender_id: number;
  sender_username: string;
  sender_avatar?: string | null;
  receiver_id: number;
  receiver_username: string;
  receiver_avatar?: string | null;
  content: string;
  created_at: Date | string;
  is_read: boolean;
};

export type ConversationPartner = {
  user_id: number;
  username: string;
  avatar_url?: string | null;
  last_message: string;
  last_message_at: Date | string;
  unread_count: number;
};

// ZERO FALLBACK POLICY: No fake messages are ever served.
// If the DB is empty or unavailable, return empty arrays.

export async function sendMessage(senderId: number, receiverUsername: string, content: string): Promise<DirectMessage> {
  // 1. Ensure table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      is_read BOOLEAN DEFAULT FALSE
    );
  `);

  // 2. Find receiver — throw if not found (no fake user creation)
  const receiverRes = await pool.query<{ id: number; username: string }>(
    'SELECT id, username FROM users WHERE username = $1',
    [receiverUsername]
  );
  const receiver = receiverRes.rows[0];
  if (!receiver) {
    throw new Error(`User "${receiverUsername}" not found.`);
  }

  // 3. Insert message
  const insertRes = await pool.query<{ id: number; sender_id: number; receiver_id: number; content: string; created_at: string; is_read: boolean }>(`
    INSERT INTO messages (sender_id, receiver_id, content)
    VALUES ($1, $2, $3)
    RETURNING id, sender_id, receiver_id, content, created_at, is_read
  `, [senderId, receiver.id, content]);

  // 4. Fetch sender username for the return object
  const senderRes = await pool.query<{ username: string; avatar_url: string | null }>(
    'SELECT username, avatar_url FROM users WHERE id = $1',
    [senderId]
  );

  const msg = insertRes.rows[0];
  return {
    ...msg,
    sender_username: senderRes.rows[0]?.username || '',
    sender_avatar: senderRes.rows[0]?.avatar_url || null,
    receiver_username: receiver.username,
    receiver_avatar: null,
  };
}

export async function getConversations(userId: number): Promise<ConversationPartner[]> {
  try {
    const res = await pool.query<{
      partner_id: number;
      partner_username: string;
      partner_avatar: string | null;
      last_content: string;
      last_at: string;
      unread_count: string;
    }>(`
      SELECT 
        CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS partner_id,
        u.username AS partner_username,
        u.avatar_url AS partner_avatar,
        m.content AS last_content,
        m.created_at AS last_at,
        SUM(CASE WHEN m.receiver_id = $1 AND m.is_read = FALSE THEN 1 ELSE 0 END)::TEXT AS unread_count
      FROM messages m
      JOIN users u ON u.id = (CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END)
      WHERE m.sender_id = $1 OR m.receiver_id = $1
      GROUP BY partner_id, u.username, u.avatar_url, m.content, m.created_at
      ORDER BY m.created_at DESC
    `, [userId]);

    const map = new Map<number, ConversationPartner>();
    for (const row of res.rows) {
      if (!map.has(row.partner_id)) {
        map.set(row.partner_id, {
          user_id: row.partner_id,
          username: row.partner_username,
          avatar_url: row.partner_avatar,
          last_message: row.last_content,
          last_message_at: row.last_at,
          unread_count: parseInt(row.unread_count || '0', 10),
        });
      }
    }
    return Array.from(map.values());
  } catch (err) {
    console.warn('[getConversations] DB query failed, returning empty list:', err);
    return [];
  }
}

export async function getDirectMessages(userId: number, withUsername: string): Promise<DirectMessage[]> {
  try {
    const res = await pool.query<DirectMessage>(`
      SELECT 
        m.id,
        m.sender_id,
        su.username AS sender_username,
        su.avatar_url AS sender_avatar,
        m.receiver_id,
        ru.username AS receiver_username,
        ru.avatar_url AS receiver_avatar,
        m.content,
        m.created_at,
        m.is_read
      FROM messages m
      JOIN users su ON m.sender_id = su.id
      JOIN users ru ON m.receiver_id = ru.id
      WHERE (m.sender_id = $1 AND ru.username = $2)
         OR (su.username = $2 AND m.receiver_id = $1)
      ORDER BY m.created_at ASC
    `, [userId, withUsername]);

    return res.rows;
  } catch (err) {
    console.warn('[getDirectMessages] DB query failed, returning empty list:', err);
    return [];
  }
}
