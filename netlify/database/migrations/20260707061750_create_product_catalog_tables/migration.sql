CREATE TABLE "categories" (
	"id" serial PRIMARY KEY,
	"slug" text NOT NULL UNIQUE,
	"display_name" text NOT NULL,
	"theme_color" text DEFAULT '#00E5FF' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"blob_key" text,
	"static_url" text,
	"content_type" text,
	"filaments" jsonb,
	"texture" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY,
	"subcategory_id" integer NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" text DEFAULT '0.00' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "products_subcategory_id_slug_unique" UNIQUE("subcategory_id","slug")
);
--> statement-breakpoint
CREATE TABLE "subcategories" (
	"id" serial PRIMARY KEY,
	"category_id" integer NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "subcategories_category_id_slug_unique" UNIQUE("category_id","slug")
);
--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_subcategory_id_subcategories_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE;