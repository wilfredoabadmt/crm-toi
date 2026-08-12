import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";

export type CajaNapItem = typeof schema.cajaNap.$inferSelect;
export type RegistroCoberturaItem = typeof schema.registroCoberturaCliente.$inferSelect;

/**
 * Autocrea las tablas de Cajas NAP y Registro de Cobertura si no existen.
 */
let tablesEnsured = false;
export async function ensureNapTablesExist() {
  if (tablesEnsured) return;
  try {
    const db = getDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "cajas_nap" (
        "id" text PRIMARY KEY NOT NULL,
        "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
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
      CREATE INDEX IF NOT EXISTS "caja_nap_org_idx" ON "cajas_nap" USING btree ("organization_id");
      CREATE INDEX IF NOT EXISTS "caja_nap_org_red_idx" ON "cajas_nap" USING btree ("organization_id", "red");
      CREATE INDEX IF NOT EXISTS "caja_nap_org_estado_idx" ON "cajas_nap" USING btree ("organization_id", "estado");

      CREATE TABLE IF NOT EXISTS "registro_cobertura_clientes" (
        "id" text PRIMARY KEY NOT NULL,
        "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
        "clientify_lead_id" text,
        "cliente_nombre" text,
        "cliente_latitud" double precision NOT NULL,
        "cliente_longitud" double precision NOT NULL,
        "nap_asignada_id" text REFERENCES "cajas_nap"("id") ON DELETE SET NULL,
        "distancia_lineal_m" double precision NOT NULL,
        "distancia_ruta_m" double precision,
        "estado_cobertura" text NOT NULL,
        "fecha_consulta" timestamp DEFAULT now() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "reg_cob_org_idx" ON "registro_cobertura_clientes" USING btree ("organization_id", "fecha_consulta");
    `);
    tablesEnsured = true;
  } catch (err) {
    console.warn("[coverage/naps] Error o advertencia al autocrear tablas:", err);
  }
}

/**
 * Calcula la distancia Haversine en metros entre dos coordenadas GPS.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Extrae latitud y longitud a partir de texto crudo o enlaces de Google Maps.
 */
export function parseCoordinatesOrLink(input: string): {
  lat: number;
  lng: number;
} | null {
  if (!input || !input.trim()) return null;
  const clean = input.trim();

  // Patrón 1: Coordenadas brutas "-16.4792688, -68.2741975" o "-16.4792688,-68.2741975"
  const rawMatch = clean.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (rawMatch && rawMatch[1] && rawMatch[2]) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  // Patrón 2: Google Maps URL con `@lat,lng` (ej: .../maps/@-16.4792688,-68.2741975,17z)
  const atMatch = clean.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch && atMatch[1] && atMatch[2]) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  // Patrón 3: Google Maps URL con `q=lat,lng` o `place/lat,lng` o `search/lat,lng`
  const qMatch = clean.match(/(?:q=|place\/|search\/)(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (qMatch && qMatch[1] && qMatch[2]) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  // Patrón 4: Formato de ubicación compartida en WhatsApp "Latitud X, Longitud Y"
  const waMatch = clean.match(/Latitud\s*(-?\d+(?:\.\d+)?).*Longitud\s*(-?\d+(?:\.\d+)?)/i);
  if (waMatch && waMatch[1] && waMatch[2]) {
    const lat = parseFloat(waMatch[1]);
    const lng = parseFloat(waMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  // Patrón 5: URLs de Google Maps acortadas (https://maps.app.goo.gl/...)
  // Estos enlaces se usan en WhatsApp o canales de mensajería y contienen
  // un hash que no incluye coordenadas directamente.
  // Se detecta por el prefijo "maps.app.goo.gl" y se retorna null
  // mientras que el hash se guarda para resolución posterior.
  const mapsShortUrlRegex = /^https?:\/\/(www\.)?maps\.app\.goo\.gl\/([^?&#]+)/i;
  const mapsShortUrlMatch = clean.match(mapsShortUrlRegex);
  if (mapsShortUrlMatch && mapsShortUrlMatch[1]) {
    const hash = mapsShortUrlMatch[1];
    // Verificar si el hash corresponde a una URL de Google Maps que ya ha
    // sido resuelta por otro servicio externo
    return { lat: null, lng: null, is_gmaps_short_url: true, gmaps_short_hash: hash };
  }

  return null;
}

/**
 * Interfaz de la respuesta del servicio OSRM.
 */
export type OSRMRouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  polylineCoords: Array<[number, number]>; // [lat, lng]
  steps: Array<{
    instruction: string;
    distanceM: number;
    name: string;
  }>;
};

/**
 * Consulta el servidor público de OSRM para obtener la distancia real por calles y recorrido.
 */
export async function fetchOSRMRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<OSRMRouteResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();

    if (!data.routes || data.routes.length === 0) return null;
    const route = data.routes[0];

    const distanceMeters = Math.round(route.distance);
    const durationSeconds = Math.round(route.duration);

    // OSRM devuelve las coordenadas GeoJSON como [lng, lat], convertimos a [lat, lng]
    const polylineCoords: Array<[number, number]> = (
      route.geometry?.coordinates ?? []
    ).map(([lng, lat]: [number, number]) => [lat, lng]);

    const steps: OSRMRouteResult["steps"] = [];
    const legs = route.legs ?? [];
    for (const leg of legs) {
      for (const step of leg.steps ?? []) {
        const distM = Math.round(step.distance);
        if (distM < 3 && steps.length > 0) continue; // omitir pasos insignificantes
        const streetName = step.name || "Calle sin nombre";
        let instr = `Avanzar por ${streetName}`;

        if (step.maneuver?.type === "turn") {
          const modifier = step.maneuver.modifier ?? "";
          const dir = modifier.includes("left")
            ? "a la izquierda"
            : modifier.includes("right")
            ? "a la derecha"
            : "";
          instr = `Girar ${dir} en ${streetName}`.trim();
        } else if (step.maneuver?.type === "arrive") {
          instr = `Llegada al destino (Caja NAP)`;
        }

        steps.push({
          instruction: instr,
          distanceM: distM,
          name: streetName,
        });
      }
    }

    return {
      distanceMeters,
      durationSeconds,
      polylineCoords,
      steps,
    };
  } catch (err) {
    console.warn("[coverage/naps] Fallo en servicio OSRM (usando fallback directo):", err);
    return null;
  }
}

/**
 * Consulta todas las Cajas NAP de la organización con opción a filtro.
 */
export async function getCajasNapByOrg(
  organizationId: string,
  options?: {
    search?: string;
    red?: string;
    estado?: "ACTIVO" | "INACTIVO" | "SATURADO";
  }
): Promise<CajaNapItem[]> {
  await ensureNapTablesExist();
  const db = getDb();

  const conditions = [eq(schema.cajaNap.organizationId, organizationId)];

  if (options?.red && options.red !== "TODAS") {
    conditions.push(eq(schema.cajaNap.red, options.red));
  }
  if (options?.estado && options.estado !== ("TODOS" as any)) {
    conditions.push(eq(schema.cajaNap.estado, options.estado));
  }

  if (options?.search?.trim()) {
    const term = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(schema.cajaNap.napCode, term),
        ilike(schema.cajaNap.red, term),
        ilike(schema.cajaNap.puertos, term)
      )!
    );
  }

  return db
    .select()
    .from(schema.cajaNap)
    .where(and(...conditions))
    .orderBy(desc(schema.cajaNap.createdAt));
}

/**
 * Registra una nueva Caja NAP.
 */
export async function createCajaNap(input: {
  organizationId: string;
  napCode: string;
  puertos: string;
  ubicacionRaw?: string;
  latitud: number;
  longitud: number;
  red: string;
  estado?: "ACTIVO" | "INACTIVO" | "SATURADO";
  notes?: string;
}): Promise<CajaNapItem> {
  await ensureNapTablesExist();
  const db = getDb();

  const inserted = await db
    .insert(schema.cajaNap)
    .values({
      id: newId("cajaNap"),
      organizationId: input.organizationId,
      napCode: input.napCode.trim(),
      puertos: input.puertos.trim(),
      ubicacionRaw: input.ubicacionRaw?.trim() || `${input.latitud}, ${input.longitud}`,
      latitud: input.latitud,
      longitud: input.longitud,
      red: input.red.trim().toUpperCase(),
      estado: input.estado ?? "ACTIVO",
      notes: input.notes?.trim() || null,
    })
    .returning();

  return inserted[0]!;
}

/**
 * Actualiza una Caja NAP existente.
 */
export async function updateCajaNap(
  organizationId: string,
  id: string,
  input: {
    napCode?: string;
    puertos?: string;
    ubicacionRaw?: string;
    latitud?: number;
    longitud?: number;
    red?: string;
    estado?: "ACTIVO" | "INACTIVO" | "SATURADO";
    notes?: string;
  }
): Promise<CajaNapItem | null> {
  await ensureNapTablesExist();
  const db = getDb();

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.napCode !== undefined) updateData.napCode = input.napCode.trim();
  if (input.puertos !== undefined) updateData.puertos = input.puertos.trim();
  if (input.ubicacionRaw !== undefined) updateData.ubicacionRaw = input.ubicacionRaw.trim();
  if (input.latitud !== undefined) updateData.latitud = input.latitud;
  if (input.longitud !== undefined) updateData.longitud = input.longitud;
  if (input.red !== undefined) updateData.red = input.red.trim().toUpperCase();
  if (input.estado !== undefined) updateData.estado = input.estado;
  if (input.notes !== undefined) updateData.notes = input.notes.trim() || null;

  const updated = await db
    .update(schema.cajaNap)
    .set(updateData)
    .where(
      and(
        eq(schema.cajaNap.id, id),
        eq(schema.cajaNap.organizationId, organizationId)
      )
    )
    .returning();

  return updated[0] ?? null;
}

/**
 * Elimina una Caja NAP.
 */
export async function deleteCajaNap(
  organizationId: string,
  id: string
): Promise<boolean> {
  await ensureNapTablesExist();
  const db = getDb();

  const deleted = await db
    .delete(schema.cajaNap)
    .where(
      and(
        eq(schema.cajaNap.id, id),
        eq(schema.cajaNap.organizationId, organizationId)
      )
    )
    .returning();

  return Boolean(deleted[0]);
}

/**
 * Carga masiva de Cajas NAP desde array parseado de Excel.
 */
export async function bulkUpsertCajasNap(
  organizationId: string,
  rows: Array<{
    napCode: string;
    puertos: string;
    ubicacionRaw?: string;
    latitud: number;
    longitud: number;
    red: string;
  }>
): Promise<{ created: number; updated: number }> {
  await ensureNapTablesExist();
  const existingNaps = await getCajasNapByOrg(organizationId);
  const napMap = new Map(existingNaps.map((n) => [n.napCode.toUpperCase(), n]));

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const key = row.napCode.trim().toUpperCase();
    const match = napMap.get(key);

    if (match) {
      await updateCajaNap(organizationId, match.id, {
        puertos: row.puertos,
        ubicacionRaw: row.ubicacionRaw,
        latitud: row.latitud,
        longitud: row.longitud,
        red: row.red,
      });
      updated++;
    } else {
      await createCajaNap({
        organizationId,
        napCode: row.napCode,
        puertos: row.puertos,
        ubicacionRaw: row.ubicacionRaw,
        latitud: row.latitud,
        longitud: row.longitud,
        red: row.red,
      });
      created++;
    }
  }

  return { created, updated };
}

export type CoverageQueryResult = {
  factible: boolean;
  estado: "COBERTURA_FACTIBLE" | "COBERTURA_DISTANTE_EVALUACION";
  distancia_lineal_metros: number;
  distancia_ruta_metros: number;
  nap_asignada: {
    id: string;
    codigo: string;
    puertos: string;
    red: string;
    latitud: number;
    longitud: number;
    ubicacion_raw: string | null;
  } | null;
  ruta_pasos: Array<{ instruction: string; distance_m: number }>;
  polyline_coords: Array<[number, number]>;
  mensaje_para_agente_ia: string;
};

/**
 * Evalúa la cobertura para un cliente contra todas las NAPs activas de la organización.
 */
export async function verifyClientCoverageNap(
  organizationId: string,
  input: {
    latitud: number;
    longitud: number;
    clientifyLeadId?: string;
    clienteNombre?: string;
  }
): Promise<CoverageQueryResult> {
  await ensureNapTablesExist();
  const allNaps = await getCajasNapByOrg(organizationId);
  const activeNaps = allNaps.filter((n) => n.estado === "ACTIVO");

  if (activeNaps.length === 0) {
    return {
      factible: false,
      estado: "COBERTURA_DISTANTE_EVALUACION",
      distancia_lineal_metros: 0,
      distancia_ruta_metros: 0,
      nap_asignada: null,
      ruta_pasos: [],
      polyline_coords: [],
      mensaje_para_agente_ia:
        "No hay Cajas NAP activas registradas en el sistema para realizar la evaluación de cobertura.",
    };
  }

  // Buscar la NAP más cercana en distancia lineal (Haversine)
  let closestNap = activeNaps[0]!;
  let minLinearDist = calculateDistanceMeters(
    input.latitud,
    input.longitud,
    closestNap.latitud,
    closestNap.longitud
  );

  for (let i = 1; i < activeNaps.length; i++) {
    const nap = activeNaps[i]!;
    const dist = calculateDistanceMeters(
      input.latitud,
      input.longitud,
      nap.latitud,
      nap.longitud
    );
    if (dist < minLinearDist) {
      minLinearDist = dist;
      closestNap = nap;
    }
  }

  // Consultar OSRM para obtener distancia por calles y recorrido
  const osrm = await fetchOSRMRoute(
    input.latitud,
    input.longitud,
    closestNap.latitud,
    closestNap.longitud
  );

  const routeDistM = osrm?.distanceMeters ?? Math.round(minLinearDist * 1.25);
  const polylineCoords = osrm?.polylineCoords ?? [
    [input.latitud, input.longitud],
    [closestNap.latitud, closestNap.longitud],
  ];

  // Regla de negocio TOI: Umbral de 300 metros por ruta o lineal
  const isFactible = routeDistM <= 300;
  const estado: CoverageQueryResult["estado"] = isFactible
    ? "COBERTURA_FACTIBLE"
    : "COBERTURA_DISTANTE_EVALUACION";

  const mensajeIa = isFactible
    ? `Tenemos cobertura factible en tu zona. La Caja NAP asignada es ${closestNap.napCode} (Red: ${closestNap.red}) a una distancia de ${routeDistM} metros. Informa al cliente que los requisitos son fotocopia de C.I. y factura de luz.`
    : `La ubicación supera la distancia sugerida de 300m (distancia aproximada: ${routeDistM}m a la Caja NAP ${closestNap.napCode} - Red: ${closestNap.red}). Derivar caso para auditoría técnica o generar ficha de requisición.`;

  // Guardar log de auditoría
  const db = getDb();
  await db.insert(schema.registroCoberturaCliente).values({
    id: newId("registroCobertura"),
    organizationId,
    clientifyLeadId: input.clientifyLeadId || null,
    clienteNombre: input.clienteNombre || null,
    clienteLatitud: input.latitud,
    clienteLongitud: input.longitud,
    napAsignadaId: closestNap.id,
    distanciaLinealM: minLinearDist,
    distanciaRutaM: routeDistM,
    estadoCobertura: estado,
  });

  return {
    factible: isFactible,
    estado,
    distancia_lineal_metros: minLinearDist,
    distancia_ruta_metros: routeDistM,
    nap_asignada: {
      id: closestNap.id,
      codigo: closestNap.napCode,
      puertos: closestNap.puertos,
      red: closestNap.red,
      latitud: closestNap.latitud,
      longitud: closestNap.longitud,
      ubicacion_raw: closestNap.ubicacionRaw,
    },
    ruta_pasos: osrm?.steps.map((s) => ({
      instruction: s.instruction,
      distance_m: s.distanceM,
    })) || [
      {
        instruction: `Recorrido directo hacia Caja NAP ${closestNap.napCode}`,
        distance_m: routeDistM,
      },
    ],
    polyline_coords: polylineCoords,
    mensaje_para_agente_ia: mensajeIa,
  };
}
