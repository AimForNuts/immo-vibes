CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  username TEXT,
  display_username TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  idlemmo_token TEXT,
  idlemmo_character_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS user_email_unique
  ON "user" (email);

CREATE UNIQUE INDEX IF NOT EXISTS user_username_unique
  ON "user" (username);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY NOT NULL,
  expires_at TEXT NOT NULL,
  token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS session_token_unique
  ON session (token);

CREATE INDEX IF NOT EXISTS session_user_id_idx
  ON session (user_id);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TEXT,
  refresh_token_expires_at TEXT,
  scope TEXT,
  password TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS account_user_id_idx
  ON account (user_id);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);
