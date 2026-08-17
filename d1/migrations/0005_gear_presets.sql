CREATE TABLE IF NOT EXISTS gear_presets (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  character_id TEXT,
  weapon_style TEXT NOT NULL,
  slots TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS gear_presets_user_id_idx
  ON gear_presets (user_id);
