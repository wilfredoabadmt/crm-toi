import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  getBusinessSchedule,
  updateBusinessSchedule,
  checkBusinessHoursStatus,
  type UpdateScheduleInput,
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

const parseFlexibleTime = (val: unknown, fallback: string): string => {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== "string") return fallback;
  const clean = val.trim();
  if (clean === "") return fallback;
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match || !match[1] || !match[2]) return fallback;
  const hours = match[1].padStart(2, "0");
  const mins = match[2];
  return `${hours}:${mins}`;
};

const parseOptionalFlexibleTime = (val: unknown): string | null => {
  if (val === null || val === undefined) return null;
  if (typeof val !== "string") return null;
  const clean = val.trim();
  if (clean === "") return null;
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match || !match[1] || !match[2]) return null;
  const hours = match[1].padStart(2, "0");
  const mins = match[2];
  return `${hours}:${mins}`;
};

const daySchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  isOpen: z.boolean(),
  openTime1: z.preprocess((v) => parseFlexibleTime(v, "08:30"), z.string()),
  closeTime1: z.preprocess((v) => parseFlexibleTime(v, "18:30"), z.string()),
  openTime2: z
    .preprocess((v) => parseOptionalFlexibleTime(v), z.string().nullable())
    .optional(),
  closeTime2: z
    .preprocess((v) => parseOptionalFlexibleTime(v), z.string().nullable())
    .optional(),
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
  const body = await parseBody<UpdateScheduleInput>(
    req,
    updateScheduleSchema as unknown as z.ZodType<UpdateScheduleInput>
  );
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
