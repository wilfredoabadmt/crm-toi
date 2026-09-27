-- Migración 0012: Permisos granulares por sección para miembros del equipo
ALTER TABLE "member" ADD COLUMN IF NOT EXISTS "permissions" jsonb;
