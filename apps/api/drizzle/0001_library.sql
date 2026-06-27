CREATE TABLE "library_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" bigint NOT NULL,
	"ocr_text" text,
	"title" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"local_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_item_collections" (
	"library_item_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	CONSTRAINT "library_item_collections_library_item_id_collection_id_pk" PRIMARY KEY("library_item_id","collection_id")
);
--> statement-breakpoint
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "library_item_collections" ADD CONSTRAINT "library_item_collections_library_item_id_library_items_id_fk" FOREIGN KEY ("library_item_id") REFERENCES "public"."library_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "library_item_collections" ADD CONSTRAINT "library_item_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "library_items_user_local_id_idx" ON "library_items" USING btree ("user_id","local_id");
--> statement-breakpoint
CREATE INDEX "library_items_user_created_idx" ON "library_items" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX "library_items_ocr_text_idx" ON "library_items" USING gin (to_tsvector('english', coalesce("ocr_text", '')));
