-- Modulo de Campanias: soporte de linea/departamento emisor
ALTER TABLE "campaign" ADD COLUMN IF NOT EXISTS "phone_number_id" text;
--> statement-breakpoint
ALTER TABLE "campaign" ADD COLUMN IF NOT EXISTS "department_id" text;
