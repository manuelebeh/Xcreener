CREATE TYPE "template_status" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "template_listings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "author_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" "template_status" DEFAULT 'pending' NOT NULL,
  "style" jsonb NOT NULL,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "preview_url" text,
  "download_count" integer DEFAULT 0 NOT NULL,
  "featured" boolean DEFAULT false NOT NULL,
  "rejection_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "template_listings_slug_idx" ON "template_listings" ("slug");
CREATE INDEX "template_listings_status_idx" ON "template_listings" ("status");
CREATE INDEX "template_listings_featured_idx" ON "template_listings" ("featured");
