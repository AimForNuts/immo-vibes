CREATE TABLE IF NOT EXISTS "api_endpoint_specs" (
  "key" text PRIMARY KEY NOT NULL,
  "label" text NOT NULL,
  "method" text DEFAULT 'GET' NOT NULL,
  "path_template" text NOT NULL,
  "config" jsonb NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "api_response_schemas" (
  "endpoint_key" text PRIMARY KEY NOT NULL,
  "inferred_schema" jsonb,
  "manual_schema" jsonb,
  "active_schema" jsonb,
  "deprecated_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "last_seen_at" timestamp,
  "updated_by_user_id" text,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "api_schema_observations" (
  "id" text PRIMARY KEY NOT NULL,
  "endpoint_key" text NOT NULL,
  "params" jsonb NOT NULL,
  "status_code" integer NOT NULL,
  "duration_ms" integer NOT NULL,
  "inferred_schema" jsonb NOT NULL,
  "new_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "missing_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "type_conflicts" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_by_user_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "api_response_schemas" ADD CONSTRAINT "api_response_schemas_endpoint_key_api_endpoint_specs_key_fk" FOREIGN KEY ("endpoint_key") REFERENCES "public"."api_endpoint_specs"("key") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "api_response_schemas" ADD CONSTRAINT "api_response_schemas_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "api_schema_observations" ADD CONSTRAINT "api_schema_observations_endpoint_key_api_endpoint_specs_key_fk" FOREIGN KEY ("endpoint_key") REFERENCES "public"."api_endpoint_specs"("key") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "api_schema_observations" ADD CONSTRAINT "api_schema_observations_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "api_schema_observations_endpoint_created_idx" ON "api_schema_observations" USING btree ("endpoint_key","created_at");
CREATE INDEX IF NOT EXISTS "api_schema_observations_created_idx" ON "api_schema_observations" USING btree ("created_at");
