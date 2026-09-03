ALTER TABLE "products" ADD COLUMN "custom_text" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "featured_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Featured items had no order of their own before this column: the page showed
-- them in whatever order walking the catalogue tree produced, which put the
-- oldest listing first and buried anything new at the bottom. Number the
-- existing ones newest-first so the page starts out the right way up, and so
-- every row has a distinct value for the reorder arrows to swap.
UPDATE "products" AS p
SET "featured_order" = ranked.position
FROM (
  SELECT "id",
         (ROW_NUMBER() OVER (ORDER BY "created_at" DESC NULLS LAST, "id" DESC) - 1) AS position
  FROM "products"
  WHERE "featured"
) AS ranked
WHERE p."id" = ranked."id";
