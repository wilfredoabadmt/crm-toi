import { NextResponse } from "next/server";
import { withAuth, apiError } from "@/lib/api";
import { verifyLocationCoverage } from "@/server/coverage/zones";

export const dynamic = "force-dynamic";

/** POST: Prueba y verifica coordenadas GPS contra las zonas activas de la organización. */
export const POST = withAuth(async (session, req: Request) => {
  try {
    const body = (await req.json()) as {
      latitude?: number;
      longitude?: number;
    };

    if (typeof body.latitude !== "number" || typeof body.longitude !== "number") {
      return apiError(
        400,
        "bad_request",
        "Debes proporcionar 'latitude' y 'longitude' numéricas."
      );
    }

    const result = await verifyLocationCoverage(
      session.organizationId,
      body.latitude,
      body.longitude
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[api/coverage/verify] Error al verificar ubicación:", err);
    return apiError(500, "server_error", "Error al verificar la cobertura de ubicación.");
  }
});
