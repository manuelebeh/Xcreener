CREATE TABLE "api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "key_prefix" text NOT NULL,
  "key_hash" text NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE restrict,
  "last_used_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "api_keys_key_hash_idx" ON "api_keys" ("key_hash");
CREATE INDEX "api_keys_workspace_id_idx" ON "api_keys" ("workspace_id");

CREATE TABLE "api_captures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "api_key_id" uuid NOT NULL REFERENCES "api_keys"("id") ON DELETE restrict,
  "storage_key" text NOT NULL,
  "export_storage_key" text,
  "document_state" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "mime_type" text NOT NULL,
  "byte_size" bigint NOT NULL,
  "title" text,
  "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "api_captures_workspace_id_idx" ON "api_captures" ("workspace_id");
CREATE INDEX "api_captures_created_at_idx" ON "api_captures" ("created_at" DESC);
