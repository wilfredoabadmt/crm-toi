import { and, desc, eq, gte, lte } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import { normalizeRecipient } from "@/lib/meta/client";
import { getCredentialsByOrg } from "@/server/whatsapp/credentials";
import { callGraphSend } from "@/server/inbox/send";
import { countVariables } from "@/server/whatsapp/templates";

export interface GetAppointmentsFilters {
  startDate?: string;
  endDate?: string;
  assignedUserId?: string;
  status?: schema.AppointmentStatus;
  type?: schema.AppointmentType;
}

/** Obtiene citas de la organización con datos unidos de contacto, responsable y lead */
export async function getAppointments(
  organizationId: string,
  filters: GetAppointmentsFilters = {}
) {
  const db = getDb();

  const conditions = [scoped(schema.appointment.organizationId, organizationId)];

  if (filters.startDate) {
    conditions.push(gte(schema.appointment.scheduledAt, new Date(filters.startDate)));
  }
  if (filters.endDate) {
    conditions.push(lte(schema.appointment.scheduledAt, new Date(filters.endDate)));
  }
  if (filters.assignedUserId) {
    conditions.push(eq(schema.appointment.assignedUserId, filters.assignedUserId));
  }
  if (filters.status) {
    conditions.push(eq(schema.appointment.status, filters.status));
  }
  if (filters.type) {
    conditions.push(eq(schema.appointment.type, filters.type));
  }

  const rows = await db
    .select({
      appointment: schema.appointment,
      contact: {
        id: schema.contact.id,
        name: schema.contact.name,
        phone: schema.contact.phone,
      },
      assignedUser: {
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
      },
      createdByUser: {
        id: schema.user.id,
        name: schema.user.name,
      },
    })
    .from(schema.appointment)
    .innerJoin(
      schema.contact,
      eq(schema.appointment.contactId, schema.contact.id)
    )
    .leftJoin(
      schema.user,
      eq(schema.appointment.assignedUserId, schema.user.id)
    )
    .where(and(...conditions))
    .orderBy(desc(schema.appointment.scheduledAt));

  return rows.map((r) => ({
    ...r.appointment,
    contact: r.contact,
    assignedUser: r.assignedUser,
  }));
}

export interface CreateAppointmentInput {
  contactId: string;
  leadId?: string | null;
  assignedUserId?: string | null;
  createdById?: string | null;
  createdByType?: "user" | "ai_agent";
  title: string;
  type: schema.AppointmentType;
  status?: schema.AppointmentStatus;
  scheduledAt: string | Date;
  durationMinutes?: number;
  locationAddress?: string | null;
  locationCoords?: string | null;
  meetingUrl?: string | null;
  notes?: string | null;
  sendConfirmation?: boolean;
  confirmationTemplateId?: string | null;
  confirmationMediaUrl?: string | null;
  confirmationMediaType?: "image" | "video" | "document" | null;
  confirmationVariables?: Record<string, string> | null;
}

/** Crea una nueva cita y opcionalmente despacha mensaje de confirmación por WhatsApp */
export async function createAppointment(
  organizationId: string,
  input: CreateAppointmentInput
) {
  const db = getDb();

  // Validar contacto existente
  const [contact] = await db
    .select()
    .from(schema.contact)
    .where(
      and(
        scoped(schema.contact.organizationId, organizationId),
        eq(schema.contact.id, input.contactId)
      )
    )
    .limit(1);

  if (!contact) {
    throw new Error("El contacto seleccionado no existe");
  }

  const appointmentId = newId("appointment");
  const scheduledDate =
    typeof input.scheduledAt === "string"
      ? new Date(input.scheduledAt)
      : input.scheduledAt;

  // 1. Insertar registro de cita
  const [newAppointment] = await db
    .insert(schema.appointment)
    .values({
      id: appointmentId,
      organizationId,
      contactId: input.contactId,
      leadId: input.leadId ?? null,
      assignedUserId: input.assignedUserId ?? null,
      createdById: input.createdById ?? null,
      createdByType: input.createdByType ?? "user",
      title: input.title.trim(),
      type: input.type,
      status: input.status ?? "scheduled",
      scheduledAt: scheduledDate,
      durationMinutes: input.durationMinutes ?? 60,
      locationAddress: input.locationAddress ?? null,
      locationCoords: input.locationCoords ?? null,
      meetingUrl: input.meetingUrl ?? null,
      notes: input.notes ?? null,
      confirmationStatus: input.sendConfirmation ? "pending" : "none",
    })
    .returning();

  // 2. Si se solicitó confirmación por WhatsApp y hay plantilla seleccionada
  if (input.sendConfirmation && input.confirmationTemplateId) {
    void dispatchAppointmentConfirmation({
      organizationId,
      appointmentId,
      contactPhone: contact.phone,
      contactName: contact.name,
      templateId: input.confirmationTemplateId,
      mediaUrl: input.confirmationMediaUrl,
      mediaType: input.confirmationMediaType,
      variableValues: input.confirmationVariables,
      scheduledAt: scheduledDate,
      locationAddress: input.locationAddress,
    }).catch((err) => {
      console.error(
        `[appointments] Error al enviar confirmación de cita ${appointmentId}:`,
        err
      );
    });
  }

  return newAppointment;
}

/** Envía el mensaje de confirmación de cita usando WhatsApp Cloud API */
async function dispatchAppointmentConfirmation(params: {
  organizationId: string;
  appointmentId: string;
  contactPhone: string;
  contactName: string;
  templateId: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "document" | null;
  variableValues?: Record<string, string> | null;
  scheduledAt: Date;
  locationAddress?: string | null;
}) {
  const db = getDb();
  const credentials = await getCredentialsByOrg(params.organizationId);
  if (!credentials || credentials.status === "reconnect_required") {
    await db
      .update(schema.appointment)
      .set({ confirmationStatus: "failed", updatedAt: new Date() })
      .where(eq(schema.appointment.id, params.appointmentId));
    return;
  }

  const [template] = await db
    .select()
    .from(schema.template)
    .where(
      and(
        scoped(schema.template.organizationId, params.organizationId),
        eq(schema.template.id, params.templateId)
      )
    )
    .limit(1);

  if (!template || template.status !== "approved") {
    await db
      .update(schema.appointment)
      .set({ confirmationStatus: "failed", updatedAt: new Date() })
      .where(eq(schema.appointment.id, params.appointmentId));
    return;
  }

  // Preparar componentes de cabecera y cuerpo
  const components: any[] = [];
  if (params.mediaUrl && params.mediaType) {
    components.push({
      type: "header",
      parameters: [
        {
          type: params.mediaType,
          [params.mediaType]: { link: params.mediaUrl },
        },
      ],
    });
  }

  const varCount = countVariables(template.body);
  if (varCount > 0) {
    const parameters: Array<{ type: "text"; text: string }> = [];
    const values = params.variableValues ?? {};

    // Formateo de fecha y hora amigable
    const fechaHora = params.scheduledAt.toLocaleString("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    for (let i = 1; i <= varCount; i++) {
      let val = values[String(i)] || values[`var_${i}`] || "";
      if (!val) {
        if (i === 1) val = params.contactName;
        else if (i === 2) val = fechaHora;
        else if (i === 3) val = params.locationAddress || "Oficina/Domicilio";
        else val = "Confirmado";
      }
      parameters.push({ type: "text", text: val.trim() });
    }

    components.push({ type: "body", parameters });
  }

  try {
    const waMessageId = await callGraphSend(credentials, {
      messaging_product: "whatsapp",
      to: normalizeRecipient(params.contactPhone),
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language },
        ...(components.length > 0 ? { components } : {}),
      },
    });

    await db
      .update(schema.appointment)
      .set({
        confirmationStatus: "sent",
        confirmationWamid: waMessageId,
        updatedAt: new Date(),
      })
      .where(eq(schema.appointment.id, params.appointmentId));
  } catch (err) {
    await db
      .update(schema.appointment)
      .set({ confirmationStatus: "failed", updatedAt: new Date() })
      .where(eq(schema.appointment.id, params.appointmentId));
  }
}

/** Actualiza el estado, horario o datos de una cita existente */
export async function updateAppointment(
  organizationId: string,
  appointmentId: string,
  patch: Partial<{
    title: string;
    type: schema.AppointmentType;
    status: schema.AppointmentStatus;
    scheduledAt: string | Date;
    durationMinutes: number;
    assignedUserId: string | null;
    locationAddress: string | null;
    locationCoords: string | null;
    meetingUrl: string | null;
    notes: string | null;
  }>
) {
  const db = getDb();

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (patch.title !== undefined) updateData.title = patch.title.trim();
  if (patch.type !== undefined) updateData.type = patch.type;
  if (patch.status !== undefined) updateData.status = patch.status;
  if (patch.scheduledAt !== undefined) {
    updateData.scheduledAt =
      typeof patch.scheduledAt === "string"
        ? new Date(patch.scheduledAt)
        : patch.scheduledAt;
  }
  if (patch.durationMinutes !== undefined) {
    updateData.durationMinutes = patch.durationMinutes;
  }
  if (patch.assignedUserId !== undefined) {
    updateData.assignedUserId = patch.assignedUserId;
  }
  if (patch.locationAddress !== undefined) {
    updateData.locationAddress = patch.locationAddress;
  }
  if (patch.locationCoords !== undefined) {
    updateData.locationCoords = patch.locationCoords;
  }
  if (patch.meetingUrl !== undefined) {
    updateData.meetingUrl = patch.meetingUrl;
  }
  if (patch.notes !== undefined) updateData.notes = patch.notes;

  const [updated] = await db
    .update(schema.appointment)
    .set(updateData)
    .where(
      and(
        scoped(schema.appointment.organizationId, organizationId),
        eq(schema.appointment.id, appointmentId)
      )
    )
    .returning();

  return updated ?? null;
}

/** Elimina una cita de la agenda */
export async function deleteAppointment(
  organizationId: string,
  appointmentId: string
) {
  const db = getDb();
  await db
    .delete(schema.appointment)
    .where(
      and(
        scoped(schema.appointment.organizationId, organizationId),
        eq(schema.appointment.id, appointmentId)
      )
    );
  return { ok: true };
}
