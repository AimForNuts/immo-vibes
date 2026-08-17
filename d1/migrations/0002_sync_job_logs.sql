CREATE TABLE IF NOT EXISTS sync_job_logs (
  id TEXT PRIMARY KEY NOT NULL,
  job TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT,
  user_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sync_job_logs_created_at_idx
  ON sync_job_logs (created_at);

CREATE INDEX IF NOT EXISTS sync_job_logs_job_created_at_idx
  ON sync_job_logs (job, created_at);
