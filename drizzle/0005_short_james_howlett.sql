CREATE TABLE IF NOT EXISTS "cajas_nap" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"nap_code" text NOT NULL,
	"puertos" text NOT NULL,
	"ubicacion_raw" text,
	"latitud" double precision NOT NULL,
	"longitud" double precision NOT NULL,
	"red" text NOT NULL,
	"estado" text DEFAULT 'ACTIVO' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"template_id" text NOT NULL,
	"media_url" text,
	"media_type" text,
	"variable_values" jsonb,
	"target_type" text DEFAULT 'all_contacts' NOT NULL,
	"target_stage_ids" jsonb,
	"total_recipients" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"read_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_by_id" text,
	"approved_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign_recipient" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"phone" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"wa_message_id" text,
	"error" text,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coverage_zone" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"radius_km" double precision DEFAULT 10 NOT NULL,
	"type" text DEFAULT 'radius' NOT NULL,
	"polygon" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registro_cobertura_clientes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"clientify_lead_id" text,
	"cliente_nombre" text,
	"cliente_latitud" double precision NOT NULL,
	"cliente_longitud" double precision NOT NULL,
	"nap_asignada_id" text,
	"distancia_lineal_m" double precision NOT NULL,
	"distancia_ruta_m" double precision,
	"estado_cobertura" text NOT NULL,
	"fecha_consulta" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "todo" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pipeline_stage" ADD COLUMN IF NOT EXISTS "department_id" text;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cajas_nap" ADD CONSTRAINT "cajas_nap_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign" ADD CONSTRAINT "campaign_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign" ADD CONSTRAINT "campaign_template_id_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."template"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign" ADD CONSTRAINT "campaign_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign" ADD CONSTRAINT "campaign_approved_by_id_user_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_recipient" ADD CONSTRAINT "campaign_recipient_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_recipient" ADD CONSTRAINT "campaign_recipient_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_recipient" ADD CONSTRAINT "campaign_recipient_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coverage_zone" ADD CONSTRAINT "coverage_zone_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registro_cobertura_clientes" ADD CONSTRAINT "registro_cobertura_clientes_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "todo" ADD CONSTRAINT "todo_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "caja_nap_org_idx" ON "cajas_nap" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "caja_nap_org_red_idx" ON "cajas_nap" USING btree ("organization_id","red");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "caja_nap_org_estado_idx" ON "cajas_nap" USING btree ("organization_id","estado");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_org_status_idx" ON "campaign" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_org_scheduled_idx" ON "campaign" USING btree ("organization_id","scheduled_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_recip_camp_status_idx" ON "campaign_recipient" USING btree ("campaign_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_recip_org_wamid_idx" ON "campaign_recipient" USING btree ("organization_id","wa_message_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coverage_zone_org_idx" ON "coverage_zone" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reg_cob_org_idx" ON "registro_cobertura_clientes" USING btree ("organization_id","fecha_consulta");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "todo_org_idx" ON "todo" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stage_org_dep_idx" ON "pipeline_stage" USING btree ("organization_id","department_id");