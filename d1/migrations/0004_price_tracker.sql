CREATE TABLE IF NOT EXISTS price_tracker (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  item_hashed_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_quality TEXT NOT NULL,
  item_type TEXT NOT NULL,
  image_url TEXT,
  tier INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS price_tracker_user_id_idx
  ON price_tracker (user_id);
