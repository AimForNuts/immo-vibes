CREATE TABLE IF NOT EXISTS character_pets (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  character_hashed_id TEXT NOT NULL,
  pet_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  custom_name TEXT,
  image_url TEXT,
  level INTEGER NOT NULL,
  quality TEXT NOT NULL,
  attack_power INTEGER NOT NULL DEFAULT 0,
  protection INTEGER NOT NULL DEFAULT 0,
  agility INTEGER NOT NULL DEFAULT 0,
  accuracy INTEGER,
  max_stamina INTEGER,
  movement_speed TEXT,
  critical_chance INTEGER,
  critical_damage INTEGER,
  evolution_state INTEGER NOT NULL DEFAULT 0,
  evolution_max INTEGER NOT NULL DEFAULT 5,
  evolution_bonus_per_stage INTEGER NOT NULL DEFAULT 5,
  synced_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS character_pets_user_char_uniq
  ON character_pets (user_id, character_hashed_id);
