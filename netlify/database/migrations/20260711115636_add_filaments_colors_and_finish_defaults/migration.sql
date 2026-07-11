ALTER TABLE "filaments" ADD COLUMN "colors" jsonb;--> statement-breakpoint
ALTER TABLE "filaments" ALTER COLUMN "finish" SET DEFAULT 'Standard';--> statement-breakpoint
UPDATE "filaments" SET "finish" = 'Standard' WHERE "finish" = 'Solid';