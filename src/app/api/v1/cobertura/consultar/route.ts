import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireSession } from "@/lib/auth/session";
import { parseCoordinatesOrLink, verifyClientCoverageNap } from "@/server/coverage/naps";
import { getDb, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/cobertura/consultar
 * Endpoint de integración pública y webhook para Clientify, n8n y WhatsApp AI Chatbot.
 */
export async function POST(req: Request) {
  try {
    let organizationId: string | null = null;

    // 1. Intentar obtener la sesión activa de la cookie / token del CRM
    try {
      const session = await requireSession();
      organizationId = session.organizationId;
    } catch {
      // Petición externa de webhook/Clientify
    }

    // 2. Si no hay sesión, buscar por encabezado X-API-Key o por primera organización por defecto
    if (!organizationId) {
      const authHeader = req.headers.get("authorization") || req.headers.get("x-api-key");
      if (authHeader) {
        // Si viene un token específico, se puede asociar
      }

      // Buscar la organización primaria del sistema
      const db = getDb();
      const firstOrg = await db.select().from(schema.organization).limit(1);
      if (firstOrg.length > 0 && firstOrg[0]?.id) {
        organizationId = firstOrg[0].id;
      }
    }

    if (!organizationId) {
      return apiError(401, "unauthorized", "No se encontró una organización válida para procesar la consulta.");
    }

    const body = (await req.json()) as {
      cliente_id?: string;
      cliente_nombre?: string;
      coordenadas_o_link?: string;
      latitud?: number;
      longitud?: number;
    };

    let lat: number | null = null;
    let lng: number | null = null;

    if (typeof body.latitud === "number" && typeof body.longitud === "number") {
      lat = body.latitud;
      lng = body.longitud;
    } else if (body.coordenadas_o_link) {
      const parsed = parseCoordinatesOrLink(body.coordenadas_o_link);
      if (parsed) {
        lat = parsed.lat;
        lng = parsed.lng;
      }
    }

    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
      return apiError(
        400,
        "bad_request",
        "No se pudieron interpretar las coordenadas. Proporciona 'coordenadas_o_link' (ej: '-16.479,-68.274' o link de Google Maps) o 'latitud' y 'longitud' numéricas."
      );
    }

    const result = await verifyClientCoverageNap(organizationId, {
      latitud: lat,
      longitud: lng,
      clientifyLeadId: body.cliente_id,
      clienteNombre: body.cliente_nombre,
    });

    return NextResponse.json({
      factible: result.factible,
      estado: result.estado,
      distancia_lineal_metros: result.distancia_lineal_metros,
      distancia_ruta_metros: result.distancia_ruta_metros,
      nap_asignada: result.nap_asignada,
      ruta_pasos: result.ruta_pasos,
      polyline_coords: result.polyline_coords,
      mensaje_para_agente_ia: result.mensaje_para_agente_ia,
    });
  } catch (err) {
    console.error("[api/v1/cobertura/consultar] Error en verificación de cobertura:", err);
    return apiError(500, "server_error", "Error interno al verificar cobertura.");
  }
}
