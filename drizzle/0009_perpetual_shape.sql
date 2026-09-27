ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "phone_number_id" text;
--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "department_id" text;
--> statement-breakpoint
DROP INDEX IF EXISTS "conversation_org_contact_real_uq";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_org_contact_phone_uq" ON "conversation" USING btree ("organization_id","contact_id","phone_number_id") WHERE "conversation"."is_test" = false;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_org_dep_idx" ON "conversation" USING btree ("organization_id","department_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_org_phone_idx" ON "conversation" USING btree ("organization_id","phone_number_id");