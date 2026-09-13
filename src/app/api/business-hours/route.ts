import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  getBusinessSchedule,
  updateBusinessSchedule,
  checkBusinessHoursStatus,
} from "@/server/business-hours/service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  try {
    const data = await getBusinessSchedule(session.organizationId);
    const status = await checkBusinessHoursStatus(session.organizationId);
    return Response.json({ ...data, currentStatus: status });
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Error al obtener horario de atención";
    return apiError(500, "internal", msg);
  }
});

const daySchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  isOpen: z.boolean(),
  openTime1: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime1: z.string().regex(/^\d{2}:\d{2}$/),
  openTime2: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  closeTime2: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
});

const updateScheduleSchema = z.object({
  timezone: z.string().optional(),
  isEnabled: z.boolean().optional(),
  outOfHoursAction: z
    .enum(["none", "away_message", "ai_takeover", "both"])
    .optional(),
  awayMessage: z.string().optional(),
  days: z.array(daySchema).optional(),
});

export const PUT = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, updateScheduleSchema);
  if (!body.ok) return body.response;

  try {
    const updated = await updateBusinessSchedule(
      session.organizationId,
      body.data
    );
    const status = await checkBusinessHoursStatus(session.organizationId);
    return Response.json({ ...updated, currentStatus: status });
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Error al actualizar horario de atención";
    return apiError(400, "invalid", msg);
  }
});
