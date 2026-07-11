CREATE TABLE "filament_photos" (
	"id" serial PRIMARY KEY,
	"filament_id" integer NOT NULL,
	"blob_key" text,
	"content_type" text,
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "filaments" ADD COLUMN "finish" text DEFAULT 'Solid' NOT NULL;--> statement-breakpoint
ALTER TABLE "filaments" ADD COLUMN "hex2" text;--> statement-breakpoint
ALTER TABLE "filament_photos" ADD CONSTRAINT "filament_photos_filament_id_filaments_id_fkey" FOREIGN KEY ("filament_id") REFERENCES "filaments"("id") ON DELETE CASCADE;