ALTER TABLE "pipeline_stage" ADD COLUMN IF NOT EXISTS "department_id" text;
CREATE INDEX IF NOT EXISTS "stage_org_dep_idx" ON "pipeline_stage" ("organization_id", "department_id");
