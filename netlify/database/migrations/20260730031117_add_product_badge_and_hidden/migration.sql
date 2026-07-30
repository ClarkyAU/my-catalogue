ALTER TABLE "products" ADD COLUMN "badge" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "hidden" boolean DEFAULT false NOT NULL;