CREATE TABLE IF NOT EXISTS sync_state (
  job TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  current_type_index INTEGER NOT NULL DEFAULT 0,
  current_page INTEGER NOT NULL DEFAULT 1,
  started_at TEXT,
  completed_at TEXT
);
