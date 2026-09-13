import { apiError, withAuth } from "@/lib/api";
import {
  getAnalyticsSummary,
  type DateRange,
} from "@/server/reports/service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session, req: Request) => {
  try {
    const url = new URL(req.url);
    const rangeParam = url.searchParams.get("range") || "7d";
    const validRanges: DateRange[] = ["today", "7d", "30d", "month"];
    const range: DateRange = validRanges.includes(rangeParam as DateRange)
      ? (rangeParam as DateRange)
      : "7d";

    const summary = await getAnalyticsSummary(session.organizationId, range);
    return Response.json(summary);
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al obtener métricas";
    return apiError(500, "internal", msg);
  }
});
