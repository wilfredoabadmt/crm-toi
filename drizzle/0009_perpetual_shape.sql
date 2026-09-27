CREATE TABLE "appointment" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"lead_id" text,
	"assigned_user_id" text,
	"created_by_id" text,
	"created_by_type" text DEFAULT 'user' NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'visita_tecnica' NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"location_address" text,
	"location_coords" text,
	"meeting_url" text,
	"notes" text,
	"confirmation_status" text DEFAULT 'none',
	"confirmation_wamid" text,
	"reminder_scheduled_at" timestamp,
	"reminder_status" text DEFAULT 'none',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_schedule" (
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
CREATE TABLE "business_schedule_day" (
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
CREATE TABLE "contact_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quick_reply" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"shortcut" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "conversation_org_contact_real_uq";--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "last_away_message_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "phone_number_id" text;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "department_id" text;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_assigned_user_id_user_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_schedule" ADD CONSTRAINT "business_schedule_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_schedule_day" ADD CONSTRAINT "business_schedule_day_schedule_id_business_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."business_schedule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tag" ADD CONSTRAINT "contact_tag_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tag" ADD CONSTRAINT "contact_tag_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tag" ADD CONSTRAINT "contact_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_reply" ADD CONSTRAINT "quick_reply_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_org_scheduled_idx" ON "appointment" USING btree ("organization_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "appointment_org_status_idx" ON "appointment" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "appointment_org_assigned_idx" ON "appointment" USING btree ("organization_id","assigned_user_id");--> statement-breakpoint
CREATE INDEX "appointment_contact_idx" ON "appointment" USING btree ("organization_id","contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_schedule_org_uq" ON "business_schedule" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_schedule_day_sched_dow_uq" ON "business_schedule_day" USING btree ("schedule_id","day_of_week");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_tag_contact_tag_uq" ON "contact_tag" USING btree ("contact_id","tag_id");--> statement-breakpoint
CREATE INDEX "contact_tag_org_contact_idx" ON "contact_tag" USING btree ("organization_id","contact_id");--> statement-breakpoint
CREATE INDEX "contact_tag_org_tag_idx" ON "contact_tag" USING btree ("organization_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quick_reply_org_shortcut_uq" ON "quick_reply" USING btree ("organization_id","shortcut");--> statement-breakpoint
CREATE INDEX "quick_reply_org_idx" ON "quick_reply" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_org_name_uq" ON "tag" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "tag_org_idx" ON "tag" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_org_contact_phone_uq" ON "conversation" USING btree ("organization_id","contact_id","phone_number_id") WHERE "conversation"."is_test" = false;--> statement-breakpoint
CREATE INDEX "conversation_org_dep_idx" ON "conversation" USING btree ("organization_id","department_id");--> statement-breakpoint
CREATE INDEX "conversation_org_phone_idx" ON "conversation" USING btree ("organization_id","phone_number_id");