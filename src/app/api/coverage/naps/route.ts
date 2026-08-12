import { NextResponse } from "next/server";
import { withAuth, apiError } from "@/lib/api";
import {
  createCajaNap,
  deleteCajaNap,
  getCajasNapByOrg,
  updateCajaNap,
} from "@/server/coverage/naps";

export const dynamic = "force-dynamic";

/** GET: Lista las Cajas NAP de la organización con filtros. */
export const GET = withAuth(async (session, req: Request) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const red = searchParams.get("red") || undefined;
  const estado = (searchParams.get("estado") as any) || undefined;

  const naps = await getCajasNapByOrg(session.organizationId, {
    search,
    red,
    estado,
  });
  return NextResponse.json({ ok: true, naps });
});

/** POST: Registra una nueva Caja NAP. */
export const POST = withAuth(async (session, req: Request) => {
  try {
    const body = (await req.json()) as {
      napCode?: string;
      puertos?: string;
      ubicacionRaw?: string;
      latitud?: number;
      longitud?: number;
      red?: string;
      estado?: "ACTIVO" | "INACTIVO" | "SATURADO";
      notes?: string;
    };

    if (!body.napCode?.trim()) {
      return apiError(400, "bad_request", "El código de NAP es obligatorio.");
    }
    if (!body.puertos?.trim()) {
      return apiError(400, "bad_request", "La cantidad o tipo de puertos es obligatorio.");
    }
    if (!body.red?.trim()) {
      return apiError(400, "bad_request", "La zona de RED es obligatoria.");
    }
    if (typeof body.latitud !== "number" || isNaN(body.latitud)) {
      return apiError(400, "bad_request", "Ingresa una latitud numérica válida.");
    }
    if (typeof body.longitud !== "number" || isNaN(body.longitud)) {
      return apiError(400, "bad_request", "Ingresa una longitud numérica válida.");
    }

    const nap = await createCajaNap({
      organizationId: session.organizationId,
      napCode: body.napCode,
      puertos: body.puertos,
      ubicacionRaw: body.ubicacionRaw,
      latitud: body.latitud,
      longitud: body.longitud,
      red: body.red,
      estado: body.estado ?? "ACTIVO",
      notes: body.notes,
    });

    return NextResponse.json({ ok: true, nap });
  } catch (err) {
    console.error("[api/coverage/naps] Error al crear Caja NAP:", err);
    return apiError(500, "server_error", "Error al registrar la Caja NAP.");
  }
});

/** PUT: Actualiza una Caja NAP existente. */
export const PUT = withAuth(async (session, req: Request) => {
  try {
    const body = (await req.json()) as {
      id?: string;
      napCode?: string;
      puertos?: string;
      ubicacionRaw?: string;
      latitud?: number;
      longitud?: number;
      red?: string;
      estado?: "ACTIVO" | "INACTIVO" | "SATURADO";
      notes?: string;
    };

    if (!body.id) {
      return apiError(400, "bad_request", "Parámetro 'id' faltante.");
    }

    const updated = await updateCajaNap(session.organizationId, body.id, {
      napCode: body.napCode,
      puertos: body.puertos,
      ubicacionRaw: body.ubicacionRaw,
      latitud: body.latitud,
      longitud: body.longitud,
      red: body.red,
      estado: body.estado,
      notes: body.notes,
    });

    if (!updated) {
      return apiError(404, "not_found", "Caja NAP no encontrada.");
    }

    return NextResponse.json({ ok: true, nap: updated });
  } catch (err) {
    console.error("[api/coverage/naps] Error al actualizar Caja NAP:", err);
    return apiError(500, "server_error", "Error al actualizar la Caja NAP.");
  }
});

/** DELETE: Elimina una Caja NAP. */
export const DELETE = withAuth(async (session, req: Request) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return apiError(400, "bad_request", "Parámetro 'id' faltante.");
  }

  const success = await deleteCajaNap(session.organizationId, id);
  if (!success) {
    return apiError(404, "not_found", "Caja NAP no encontrada.");
  }

  return NextResponse.json({ ok: true });
});
