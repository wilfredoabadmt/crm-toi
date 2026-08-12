ALTER TABLE "coverage_zone" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'radius' NOT NULL;
ALTER TABLE "coverage_zone" ADD COLUMN IF NOT EXISTS "polygon" jsonb;
