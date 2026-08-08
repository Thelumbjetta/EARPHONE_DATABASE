/**
 * db/seed.js
 * Quick seed script — inserts test data for local development.
 * Run: node db/seed.js
 */
'use strict';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const rawUrl = process.env.DATABASE_URL || '';
const cleanUrl = rawUrl.replace('&channel_binding=require', '');

const pool = new Pool({
  connectionString: cleanUrl,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding forum categories...');
    const catResult = await client.query(`
      INSERT INTO forum_categories (name, description, slug, display_order) VALUES
        ('Head Gear',     'Reviews, rankings and impressions of IEMs, headphones and earbuds.', 'head-gear',     1),
        ('Sound Science', 'Measurements, EQ, DSP, and technical deep-dives.',                   'sound-science', 2),
        ('Marketplace',   'Buy, sell and trade audio gear.',                                     'marketplace',   3)
      ON CONFLICT (slug) DO NOTHING
      RETURNING id, name, slug;
    `);
    console.log('  Categories inserted:', catResult.rows.length > 0 ? catResult.rows : '(already existed, skipped)');

    // Fetch the head-gear category id for thread seeding
    const catRow = await client.query("SELECT id FROM forum_categories WHERE slug = 'head-gear' LIMIT 1");
    const categoryId = catRow.rows[0]?.id;

    // Fetch user id=1 (the testuser we registered)
    const userRow = await client.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
    const userId = userRow.rows[0]?.id;

    if (!categoryId || !userId) {
      console.log('  No category or user found — skipping thread seed.');
      return;
    }

    console.log('\n🌱 Seeding a sample thread...');
    const threadResult = await client.query(`
      INSERT INTO threads (category_id, user_id, title, body, media_url)
      VALUES ($1, $2, $3, $4, NULL)
      ON CONFLICT DO NOTHING
      RETURNING id, title;
    `, [
      categoryId,
      userId,
      'Moondrop Aria 2 vs Kefine Delci — Which budget IEM wins in 2026?',
      'After spending the past two weeks A/B testing these two side-by-side off my Qudelix 5K, here are my impressions...\n\nThe Aria 2 retains the warm, musical tuning of the original but with tighter bass and smoother treble extension. The Delci counters with better resolution and a more neutral tilt.\n\nWhat does everyone else think? Drop your own comparisons below.',
    ]);
    const threadId = threadResult.rows[0]?.id;
    console.log('  Thread inserted:', threadResult.rows[0] || '(conflict, skipped)');

    if (threadId) {
      console.log('\n🌱 Seeding a sample comment...');
      const commentResult = await client.query(`
        INSERT INTO comments (thread_id, user_id, content)
        VALUES ($1, $2, $3)
        RETURNING id, content;
      `, [
        threadId,
        userId,
        'The Aria 2 is the safer recommendation for newcomers — more forgiving across genres. The Delci is better for those who want to hear into the mix clearly. Agree with the assessment!'
      ]);
      console.log('  Comment inserted:', commentResult.rows[0] ? 'id=' + commentResult.rows[0].id : '(skipped)');
    }

    console.log('\n🎉 Seed complete!');

  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
