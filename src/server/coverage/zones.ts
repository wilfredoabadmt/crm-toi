import { eq, and, desc, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";

export type CoverageZoneItem = typeof schema.coverageZone.$inferSelect;

/**
 * Calcula la distancia ortodrómica en kilómetros entre dos coordenadas GPS (Haversine Formula).
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio medio terrestre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // redondeado a 2 decimales
}

/**
 * Evalúa si una coordenada GPS (lat, lng) cae dentro de un polígono cerrado (Ray-Casting Algorithm).
 */
export function isPointInPolygon(
  lat: number,
  lng: number,
  polygon: Array<{ lat: number; lng: number }>
): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.lat;
    const yi = polygon[i]!.lng;
    const xj = polygon[j]!.lat;
    const yj = polygon[j]!.lng;

    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

let tableEnsured = false;
export async function ensureCoverageTableExists() {
  if (tableEnsured) return;
  try {
    const db = getDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "coverage_zone" (
        "id" text PRIMARY KEY NOT NULL,
        "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
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
      ALTER TABLE "coverage_zone" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'radius' NOT NULL;
      ALTER TABLE "coverage_zone" ADD COLUMN IF NOT EXISTS "polygon" jsonb;
      CREATE INDEX IF NOT EXISTS "coverage_zone_org_idx" ON "coverage_zone" USING btree ("organization_id");
    `);
    tableEnsured = true;
  } catch (err) {
    console.warn("[coverage] No se pudo autocrear la tabla (asumiendo que existe):", err);
  }
}

/**
 * Obtiene todas las zonas de cobertura configuradas para la organización.
 */
export async function getCoverageZonesByOrg(
  organizationId: string
): Promise<CoverageZoneItem[]> {
  await ensureCoverageTableExists();
  const db = getDb();
  return db
    .select()
    .from(schema.coverageZone)
    .where(eq(schema.coverageZone.organizationId, organizationId))
    .orderBy(desc(schema.coverageZone.createdAt));
}

/**
 * Registra una nueva zona de cobertura (Radio o Polígono personalizado).
 */
export async function createCoverageZone(input: {
  organizationId: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  type?: "radius" | "polygon";
  polygon?: Array<{ lat: number; lng: number }>;
  isActive?: boolean;
  notes?: string;
}): Promise<CoverageZoneItem> {
  await ensureCoverageTableExists();
  const db = getDb();
  const inserted = await db
    .insert(schema.coverageZone)
    .values({
      id: newId("coverageZone"),
      organizationId: input.organizationId,
      name: input.name.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
      radiusKm: input.radiusKm ?? 10,
      type: input.type ?? "radius",
      polygon: input.polygon ?? null,
      isActive: input.isActive ?? true,
      notes: input.notes?.trim() ?? null,
    })
    .returning();

  return inserted[0]!;
}

/**
 * Actualiza una zona de cobertura existente.
 */
export async function updateCoverageZone(
  organizationId: string,
  id: string,
  input: {
    name?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    type?: "radius" | "polygon";
    polygon?: Array<{ lat: number; lng: number }> | null;
    isActive?: boolean;
    notes?: string;
  }
): Promise<CoverageZoneItem | null> {
  await ensureCoverageTableExists();
  const db = getDb();
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.latitude !== undefined) updateData.latitude = input.latitude;
  if (input.longitude !== undefined) updateData.longitude = input.longitude;
  if (input.radiusKm !== undefined) updateData.radiusKm = input.radiusKm;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.polygon !== undefined) updateData.polygon = input.polygon;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;
  if (input.notes !== undefined) updateData.notes = input.notes.trim();
  updateData.updatedAt = new Date();

  const updated = await db
    .update(schema.coverageZone)
    .set(updateData)
    .where(
      and(
        eq(schema.coverageZone.id, id),
        eq(schema.coverageZone.organizationId, organizationId)
      )
    )
    .returning();

  return updated[0] ?? null;
}

/**
 * Elimina una zona de cobertura de la organización.
 */
export async function deleteCoverageZone(
  organizationId: string,
  id: string
): Promise<boolean> {
  await ensureCoverageTableExists();
  const db = getDb();
  const deleted = await db
    .delete(schema.coverageZone)
    .where(
      and(
        eq(schema.coverageZone.id, id),
        eq(schema.coverageZone.organizationId, organizationId)
      )
    )
    .returning();

  return Boolean(deleted[0]);
}

export type CoverageVerificationResult = {
  hasCoverage: boolean;
  matchingZone: {
    id: string;
    name: string;
    distanceKm: number;
    radiusKm: number;
    type: "radius" | "polygon";
    notes: string | null;
  } | null;
  closestZone: {
    id: string;
    name: string;
    distanceKm: number;
    radiusKm: number;
    type: "radius" | "polygon";
  } | null;
  totalActiveZones: number;
};

/**
 * Evalúa las coordenadas GPS (lat, lng) contra todas las zonas activas de la organización
 * (aplica Ray-Casting si es Polígono o Haversine si es Radio).
 */
export async function verifyLocationCoverage(
  organizationId: string,
  latitude: number,
  longitude: number
): Promise<CoverageVerificationResult> {
  const zones = await getCoverageZonesByOrg(organizationId);
  const activeZones = zones.filter((z) => z.isActive);

  if (activeZones.length === 0) {
    return {
      hasCoverage: false,
      matchingZone: null,
      closestZone: null,
      totalActiveZones: 0,
    };
  }

  let matchingZone: CoverageVerificationResult["matchingZone"] = null;
  let closestZone: CoverageVerificationResult["closestZone"] = null;
  let minDistance = Infinity;

  for (const zone of activeZones) {
    const dist = calculateDistanceKm(
      latitude,
      longitude,
      zone.latitude,
      zone.longitude
    );

    const zoneType = (zone.type ?? "radius") as "radius" | "polygon";
    let isInside = false;

    if (zoneType === "polygon" && Array.isArray(zone.polygon) && zone.polygon.length >= 3) {
      isInside = isPointInPolygon(latitude, longitude, zone.polygon);
    } else {
      isInside = dist <= (zone.radiusKm ?? 10);
    }

    if (dist < minDistance) {
      minDistance = dist;
      closestZone = {
        id: zone.id,
        name: zone.name,
        distanceKm: dist,
        radiusKm: zone.radiusKm ?? 10,
        type: zoneType,
      };
    }

    if (isInside && !matchingZone) {
      matchingZone = {
        id: zone.id,
        name: zone.name,
        distanceKm: dist,
        radiusKm: zone.radiusKm ?? 10,
        type: zoneType,
        notes: zone.notes,
      };
    }
  }

  return {
    hasCoverage: Boolean(matchingZone),
    matchingZone,
    closestZone,
    totalActiveZones: activeZones.length,
  };
}
