CREATE TABLE IF NOT EXISTS api_endpoint_specs (
  key TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  path_template TEXT NOT NULL,
  config TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_response_schemas (
  endpoint_key TEXT PRIMARY KEY NOT NULL,
  inferred_schema TEXT,
  manual_schema TEXT,
  active_schema TEXT,
  deprecated_fields TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  last_seen_at TEXT,
  updated_by_user_id TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_schema_observations (
  id TEXT PRIMARY KEY NOT NULL,
  endpoint_key TEXT NOT NULL,
  params TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  inferred_schema TEXT NOT NULL,
  new_fields TEXT NOT NULL DEFAULT '[]',
  missing_fields TEXT NOT NULL DEFAULT '[]',
  type_conflicts TEXT NOT NULL DEFAULT '[]',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS api_schema_observations_endpoint_created_idx
  ON api_schema_observations (endpoint_key, created_at);

CREATE INDEX IF NOT EXISTS api_schema_observations_created_idx
  ON api_schema_observations (created_at);
