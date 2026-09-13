ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "last_away_message_at" timestamp;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_schedule" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"timezone" text DEFAULT 'America/La_Paz' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"out_of_hours_action" text DEFAULT 'away_message' NOT NULL,
	"away_message" text DEFAULT '¡Hola {{1}}! Nuestro horario de atención es de Lunes a Viernes de 8:30 a 18:30. En este momento el equipo se encuentra fuera de oficina, pero te responderemos a primera hora.',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_schedule_day" (
	"id" text PRIMARY KEY NOT NULL,
	"schedule_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"open_time_1" text DEFAULT '08:30' NOT NULL,
	"close_time_1" text DEFAULT '12:30' NOT NULL,
	"open_time_2" text DEFAULT '14:30',
	"close_time_2" text DEFAULT '18:30'
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "business_schedule" ADD CONSTRAINT "business_schedule_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "business_schedule_day" ADD CONSTRAINT "business_schedule_day_schedule_id_business_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."business_schedule"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "business_schedule_org_uq" ON "business_schedule" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "business_schedule_day_sched_dow_uq" ON "business_schedule_day" USING btree ("schedule_id","day_of_week");
