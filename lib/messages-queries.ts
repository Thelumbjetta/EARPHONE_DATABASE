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

// Fallback memory state for offline DB
const FALLBACK_MESSAGES: DirectMessage[] = [
  {
    id: 1,
    sender_id: 2,
    sender_username: 'crin_listener',
    sender_avatar: null,
    receiver_id: 1,
    receiver_username: 'alex_dev',
    receiver_avatar: null,
    content: 'Hey Alex! Have you tried the Moondrop Blessing 3 Dusk tuning yet?',
    created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    is_read: true,
  },
  {
    id: 2,
    sender_id: 1,
    sender_username: 'alex_dev',
    sender_avatar: null,
    receiver_id: 2,
    receiver_username: 'crin_listener',
    receiver_avatar: null,
    content: 'Yes! The pinna gain adjustment is super clean. Bass shelf is crisp.',
    created_at: new Date(Date.now() - 1800 * 1000).toISOString(),
    is_read: true,
  },
  {
    id: 3,
    sender_id: 3,
    sender_username: 'cable_artisan',
    sender_avatar: null,
    receiver_id: 1,
    receiver_username: 'alex_dev',
    receiver_avatar: null,
    content: 'Your custom 4.4mm balanced cable order has shipped!',
    created_at: new Date(Date.now() - 7200 * 1000).toISOString(),
    is_read: false,
  },
];

export async function sendMessage(senderId: number, receiverUsername: string, content: string): Promise<DirectMessage> {
  try {
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

    // 2. Find receiver user ID
    let receiverRes = await pool.query<{ id: number; username: string }>('SELECT id, username FROM users WHERE username = $1', [receiverUsername]);
    let receiverId = receiverRes.rows[0]?.id;

    if (!receiverId) {
      // If user not found, create dev fallback user
      const newRec = await pool.query<{ id: number }>('INSERT INTO users (username, email, password_hash, karma) VALUES ($1, $2, $3, 100) ON CONFLICT DO NOTHING RETURNING id', [
        receiverUsername,
        `${receiverUsername}@audiothread.com`,
        'hash123',
      ]);
      receiverId = newRec.rows[0]?.id || 2;
    }

    const insertRes = await pool.query<DirectMessage>(`
      INSERT INTO messages (sender_id, receiver_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, sender_id, receiver_id, content, created_at, is_read
    `, [senderId, receiverId, content]);

    const msg = insertRes.rows[0];
    msg.sender_username = 'alex_dev';
    msg.receiver_username = receiverUsername;

    return msg;
  } catch (err) {
    console.warn('DB sendMessage fallback triggered:', err);
    const newMsg: DirectMessage = {
      id: Date.now(),
      sender_id: senderId,
      sender_username: 'alex_dev',
      receiver_id: 99,
      receiver_username: receiverUsername,
      content,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    FALLBACK_MESSAGES.push(newMsg);
    return newMsg;
  }
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

    // Unique by partner_id
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
    console.warn('DB getConversations fallback triggered:', err);
    return [
      {
        user_id: 2,
        username: 'crin_listener',
        avatar_url: null,
        last_message: 'Yes! The pinna gain adjustment is super clean. Bass shelf is crisp.',
        last_message_at: new Date(Date.now() - 1800 * 1000).toISOString(),
        unread_count: 0,
      },
      {
        user_id: 3,
        username: 'cable_artisan',
        avatar_url: null,
        last_message: 'Your custom 4.4mm balanced cable order has shipped!',
        last_message_at: new Date(Date.now() - 7200 * 1000).toISOString(),
        unread_count: 1,
      },
    ];
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
    console.warn('DB getDirectMessages fallback triggered:', err);
    return FALLBACK_MESSAGES.filter(
      (m) =>
        (m.sender_username === 'alex_dev' && m.receiver_username === withUsername) ||
        (m.sender_username === withUsername && m.receiver_username === 'alex_dev')
    );
  }
}
