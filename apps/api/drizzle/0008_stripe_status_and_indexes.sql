-- 2026-10-24 audit: FINDING-006 (Stripe statuses, event ordering), FINDING-024 (indexes),
-- FINDING-031 (constraint names from hand-written 0004/0006/0007 aligned with schema.ts;
-- renamed in place instead of drop + re-add so no foreign key is re-validated).
ALTER TYPE "public"."subscription_status" ADD VALUE IF NOT EXISTS 'incomplete_expired';--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE IF NOT EXISTS 'unpaid';--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE IF NOT EXISTS 'paused';--> statement-breakpoint
ALTER TABLE "workspace_subscriptions" ADD COLUMN IF NOT EXISTS "last_event_created" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "api_captures" RENAME CONSTRAINT "api_captures_workspace_id_fkey" TO "api_captures_workspace_id_workspaces_id_fk";--> statement-breakpoint
ALTER TABLE "api_captures" RENAME CONSTRAINT "api_captures_api_key_id_fkey" TO "api_captures_api_key_id_api_keys_id_fk";--> statement-breakpoint
ALTER TABLE "api_keys" RENAME CONSTRAINT "api_keys_workspace_id_fkey" TO "api_keys_workspace_id_workspaces_id_fk";--> statement-breakpoint
ALTER TABLE "api_keys" RENAME CONSTRAINT "api_keys_created_by_fkey" TO "api_keys_created_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "template_listings" RENAME CONSTRAINT "template_listings_author_id_fkey" TO "template_listings_author_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "user_settings" RENAME CONSTRAINT "user_settings_user_id_fkey" TO "user_settings_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "user_settings" RENAME CONSTRAINT "user_settings_pkey" TO "user_settings_user_id_key_pk";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "collections_user_name_idx" ON "collections" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "library_items_workspace_created_idx" ON "library_items" USING btree ("workspace_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shares_expires_at_idx" ON "shares" USING btree ("expires_at") WHERE "shares"."expires_at" IS NOT NULL;
