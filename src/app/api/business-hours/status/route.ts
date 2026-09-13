import { apiError, withAuth } from "@/lib/api";
import { checkBusinessHoursStatus } from "@/server/business-hours/service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  try {
    const status = await checkBusinessHoursStatus(session.organizationId);
    return Response.json(status);
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al consultar estado de horario";
    return apiError(500, "internal", msg);
  }
});
