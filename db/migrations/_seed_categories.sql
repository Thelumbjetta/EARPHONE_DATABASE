INSERT INTO forum_categories (name, description, slug, display_order)
VALUES
  ('Head Gear', 'Reviews, rankings and impressions of IEMs, headphones and earbuds.', 'head-gear', 1),
  ('Sound Science', 'Measurements, EQ, DSP, and technical deep-dives.', 'sound-science', 2),
  ('Marketplace', 'Buy, sell and trade audio gear.', 'marketplace', 3)
ON CONFLICT (slug) DO NOTHING;
