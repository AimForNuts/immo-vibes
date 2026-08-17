CREATE TABLE IF NOT EXISTS characters (
  user_id TEXT NOT NULL,
  hashed_id TEXT NOT NULL,
  idlemmo_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  image_url TEXT,
  total_level INTEGER NOT NULL DEFAULT 0,
  location_name TEXT,
  current_status TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  is_member INTEGER,
  cached_at TEXT NOT NULL,
  PRIMARY KEY (user_id, hashed_id)
);

CREATE INDEX IF NOT EXISTS characters_user_idlemmo_id_idx
  ON characters (user_id, idlemmo_id);
