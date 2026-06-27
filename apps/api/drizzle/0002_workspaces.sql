CREATE TYPE "workspace_plan" AS ENUM('free', 'team_starter', 'team_pro');
--> statement-breakpoint
CREATE TYPE "workspace_role" AS ENUM('admin', 'editor', 'viewer');
--> statement-breakpoint
CREATE TYPE "subscription_status" AS ENUM('active', 'past_due', 'canceled', 'trialing', 'incomplete');
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plan" "workspace_plan" DEFAULT 'free' NOT NULL,
	"auth0_org_id" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_role" NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text,
	"role" "workspace_role" NOT NULL,
	"token" text NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_kits" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"colors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fonts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"logo_storage_key" text,
	"watermark" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_subscriptions" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" "subscription_status",
	"seat_count" integer DEFAULT 1 NOT NULL,
	"current_period_end" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shares" ADD COLUMN "workspace_id" uuid;
--> statement-breakpoint
ALTER TABLE "library_items" ADD COLUMN "workspace_id" uuid;
--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "workspace_id" uuid;
--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brand_kits" ADD CONSTRAINT "brand_kits_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_subscriptions" ADD CONSTRAINT "workspace_subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_slug_idx" ON "workspaces" USING btree ("slug");
--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_idx" ON "invitations" USING btree ("token");
--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "invitations_workspace_id_idx" ON "invitations" USING btree ("workspace_id");
