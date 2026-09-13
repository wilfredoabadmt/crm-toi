import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  deleteAppointment,
  updateAppointment,
} from "@/server/appointments/appointments";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const updateAppointmentSchema = z.object({
  title: z.string().optional(),
  type: z
    .enum(["instalacion", "visita_tecnica", "reunion", "revision"])
    .optional(),
  status: z
    .enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"])
    .optional(),
  scheduledAt: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
  assignedUserId: z.string().nullable().optional(),
  locationAddress: z.string().nullable().optional(),
  locationCoords: z.string().nullable().optional(),
  meetingUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const PATCH = withAuth(async (session, req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, updateAppointmentSchema);
  if (!body.ok) return body.response;

  try {
    const updated = await updateAppointment(
      session.organizationId,
      id,
      body.data
    );
    if (!updated) {
      return apiError(404, "not_found", "Cita no encontrada");
    }
    return Response.json({ appointment: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al actualizar cita";
    return apiError(400, "invalid", msg);
  }
});

export const DELETE = withAuth(async (session, _req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  try {
    await deleteAppointment(session.organizationId, id);
    return Response.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al eliminar cita";
    return apiError(400, "invalid", msg);
  }
});
