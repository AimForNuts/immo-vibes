CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  dashboard_layout TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
