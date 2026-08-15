CREATE TABLE IF NOT EXISTS "sync_job_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "job" text NOT NULL,
  "status" text NOT NULL,
  "message" text NOT NULL,
  "details" jsonb,
  "user_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "sync_job_logs" ADD CONSTRAINT "sync_job_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "sync_job_logs_created_at_idx" ON "sync_job_logs" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "sync_job_logs_job_created_at_idx" ON "sync_job_logs" USING btree ("job","created_at");
