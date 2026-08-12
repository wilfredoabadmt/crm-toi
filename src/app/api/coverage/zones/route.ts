import { NextResponse } from "next/server";
import { withAuth, apiError } from "@/lib/api";
import {
  createCoverageZone,
  deleteCoverageZone,
  getCoverageZonesByOrg,
  updateCoverageZone,
} from "@/server/coverage/zones";

export const dynamic = "force-dynamic";

/** GET: Lista las zonas de cobertura de la organización. */
export const GET = withAuth(async (session) => {
  const zones = await getCoverageZonesByOrg(session.organizationId);
  return NextResponse.json({ ok: true, zones });
});

/** POST: Crea una nueva zona de cobertura (Radio o Polígono). */
export const POST = withAuth(async (session, req: Request) => {
  try {
    const body = (await req.json()) as {
      name?: string;
      latitude?: number;
      longitude?: number;
      radiusKm?: number;
      type?: "radius" | "polygon";
      polygon?: Array<{ lat: number; lng: number }>;
      isActive?: boolean;
      notes?: string;
    };

    if (!body.name?.trim()) {
      return apiError(400, "bad_request", "Ingresa un nombre para la zona de cobertura.");
    }
    if (typeof body.latitude !== "number" || isNaN(body.latitude)) {
      return apiError(400, "bad_request", "Ingresa una latitud numérica válida.");
    }
    if (typeof body.longitude !== "number" || isNaN(body.longitude)) {
      return apiError(400, "bad_request", "Ingresa una longitud numérica válida.");
    }

    if (body.type === "polygon") {
      if (!Array.isArray(body.polygon) || body.polygon.length < 3) {
        return apiError(400, "bad_request", "Un polígono de cobertura debe tener al menos 3 vértices/puntos.");
      }
    }

    const zone = await createCoverageZone({
      organizationId: session.organizationId,
      name: body.name,
      latitude: body.latitude,
      longitude: body.longitude,
      radiusKm: body.radiusKm ?? 10,
      type: body.type ?? "radius",
      polygon: body.polygon,
      isActive: body.isActive ?? true,
      notes: body.notes,
    });

    return NextResponse.json({ ok: true, zone });
  } catch (err) {
    console.error("[api/coverage/zones] Error al crear zona:", err);
    return apiError(500, "server_error", "Error al crear la zona de cobertura.");
  }
});

/** PUT: Actualiza una zona de cobertura existente. */
export const PUT = withAuth(async (session, req: Request) => {
  try {
    const body = (await req.json()) as {
      id?: string;
      name?: string;
      latitude?: number;
      longitude?: number;
      radiusKm?: number;
      type?: "radius" | "polygon";
      polygon?: Array<{ lat: number; lng: number }> | null;
      isActive?: boolean;
      notes?: string;
    };

    if (!body.id) {
      return apiError(400, "bad_request", "Parámetro 'id' faltante.");
    }

    if (body.type === "polygon" && body.polygon !== null) {
      if (!Array.isArray(body.polygon) || body.polygon.length < 3) {
        return apiError(400, "bad_request", "Un polígono de cobertura debe tener al menos 3 vértices/puntos.");
      }
    }

    const updated = await updateCoverageZone(session.organizationId, body.id, {
      name: body.name,
      latitude: body.latitude,
      longitude: body.longitude,
      radiusKm: body.radiusKm,
      type: body.type,
      polygon: body.polygon,
      isActive: body.isActive,
      notes: body.notes,
    });

    if (!updated) {
      return apiError(404, "not_found", "Zona de cobertura no encontrada.");
    }

    return NextResponse.json({ ok: true, zone: updated });
  } catch (err) {
    console.error("[api/coverage/zones] Error al actualizar zona:", err);
    return apiError(500, "server_error", "Error al actualizar la zona de cobertura.");
  }
});

/** DELETE: Elimina una zona de cobertura. */
export const DELETE = withAuth(async (session, req: Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return apiError(400, "bad_request", "Parámetro 'id' faltante.");
  }

  const success = await deleteCoverageZone(session.organizationId, id);
  if (!success) {
    return apiError(404, "not_found", "Zona no encontrada.");
  }

  return NextResponse.json({ ok: true });
});
