import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  createAppointment,
  getAppointments,
} from "@/server/appointments/appointments";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session, req: Request) => {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("start") ?? undefined;
  const endDate = searchParams.get("end") ?? undefined;
  const assignedUserId = searchParams.get("assignedUserId") ?? undefined;
  const status = searchParams.get("status") as any;
  const type = searchParams.get("type") as any;

  try {
    const appointments = await getAppointments(session.organizationId, {
      startDate,
      endDate,
      assignedUserId,
      status,
      type,
    });
    return Response.json({ appointments });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al obtener citas";
    return apiError(500, "internal", msg);
  }
});

const createAppointmentSchema = z.object({
  contactId: z.string().min(1, "El contacto es obligatorio"),
  leadId: z.string().nullable().optional(),
  assignedUserId: z.string().nullable().optional(),
  title: z.string().min(1, "El título es obligatorio"),
  type: z
    .enum(["instalacion", "visita_tecnica", "reunion", "revision"])
    .default("visita_tecnica"),
  status: z
    .enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"])
    .default("scheduled"),
  scheduledAt: z.string().min(1, "La fecha y hora son obligatorias"),
  durationMinutes: z.number().int().positive().default(60),
  locationAddress: z.string().nullable().optional(),
  locationCoords: z.string().nullable().optional(),
  meetingUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  sendConfirmation: z.boolean().default(false),
  confirmationTemplateId: z.string().nullable().optional(),
  confirmationMediaUrl: z.string().nullable().optional(),
  confirmationMediaType: z
    .enum(["image", "video", "document"])
    .nullable()
    .optional(),
  confirmationVariables: z.record(z.string(), z.string()).optional(),
});

export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, createAppointmentSchema);
  if (!body.ok) return body.response;

  try {
    const appointment = await createAppointment(session.organizationId, {
      contactId: body.data.contactId,
      leadId: body.data.leadId,
      assignedUserId: body.data.assignedUserId,
      title: body.data.title,
      type: body.data.type ?? "visita_tecnica",
      status: body.data.status ?? "scheduled",
      scheduledAt: body.data.scheduledAt,
      durationMinutes: body.data.durationMinutes,
      locationAddress: body.data.locationAddress,
      locationCoords: body.data.locationCoords,
      meetingUrl: body.data.meetingUrl,
      notes: body.data.notes,
      sendConfirmation: body.data.sendConfirmation,
      confirmationTemplateId: body.data.confirmationTemplateId,
      confirmationMediaUrl: body.data.confirmationMediaUrl,
      confirmationMediaType: body.data.confirmationMediaType,
      confirmationVariables: body.data.confirmationVariables,
      createdById: session.userId,
      createdByType: "user",
    });

    return Response.json({ appointment }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al registrar cita";
    return apiError(400, "invalid", msg);
  }
});
