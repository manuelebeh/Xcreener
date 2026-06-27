ALTER TABLE "library_items" ADD COLUMN IF NOT EXISTS "sync_version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "library_items" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
ALTER TABLE "library_items" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "user_settings" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "key" text NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "key")
);

CREATE INDEX IF NOT EXISTS "user_settings_updated_at_idx" ON "user_settings" ("updated_at");
