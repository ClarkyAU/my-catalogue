CREATE TABLE "filaments" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"material" text DEFAULT '' NOT NULL,
	"hex" text DEFAULT '#000000' NOT NULL,
	"status" text DEFAULT 'In Stock' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
