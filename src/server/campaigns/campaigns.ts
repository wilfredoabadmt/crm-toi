import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";

export interface CreateCampaignInput {
  name: string;
  templateId: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "document" | null;
  variableValues?: Record<string, string>;
  targetType: "all_contacts" | "pipeline_stages";
  targetStageIds?: string[];
  scheduledAt?: string | null; // ISO string
  sendImmediately?: boolean;
}

/** Obtiene el listado de campañas de la organización con contadores y plantilla */
export async function getCampaigns(organizationId: string) {
  const db = getDb();
  const rows = await db
    .select({
      campaign: schema.campaign,
      template: {
        id: schema.template.id,
        name: schema.template.name,
        category: schema.template.category,
        language: schema.template.language,
        body: schema.template.body,
      },
      creator: {
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
      },
    })
    .from(schema.campaign)
    .innerJoin(
      schema.template,
      eq(schema.campaign.templateId, schema.template.id)
    )
    .leftJoin(
      schema.user,
      eq(schema.campaign.createdById, schema.user.id)
    )
    .where(scoped(schema.campaign.organizationId, organizationId))
    .orderBy(desc(schema.campaign.createdAt));

  return rows.map((r) => ({
    ...r.campaign,
    template: r.template,
    creator: r.creator,
  }));
}

/** Obtiene una campaña por su ID con sus detalles */
export async function getCampaignById(organizationId: string, campaignId: string) {
  const db = getDb();
  const rows = await db
    .select({
      campaign: schema.campaign,
      template: schema.template,
      creator: schema.user,
    })
    .from(schema.campaign)
    .innerJoin(
      schema.template,
      eq(schema.campaign.templateId, schema.template.id)
    )
    .leftJoin(
      schema.user,
      eq(schema.campaign.createdById, schema.user.id)
    )
    .where(
      and(
        scoped(schema.campaign.organizationId, organizationId),
        eq(schema.campaign.id, campaignId)
      )
    )
    .limit(1);

  if (rows.length === 0) return null;
  const c = rows[0]!;

  // Obtener estadísticas de destinatarios
  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where ${schema.campaignRecipient.status} = 'pending')::int`,
      sent: sql<number>`count(*) filter (where ${schema.campaignRecipient.status} = 'sent')::int`,
      delivered: sql<number>`count(*) filter (where ${schema.campaignRecipient.status} = 'delivered')::int`,
      read: sql<number>`count(*) filter (where ${schema.campaignRecipient.status} = 'read')::int`,
      failed: sql<number>`count(*) filter (where ${schema.campaignRecipient.status} = 'failed')::int`,
    })
    .from(schema.campaignRecipient)
    .where(eq(schema.campaignRecipient.campaignId, campaignId));

  // Obtener primeros 50 destinatarios para la vista de detalle
  const sampleRecipients = await db
    .select({
      recipient: schema.campaignRecipient,
      contactName: schema.contact.name,
    })
    .from(schema.campaignRecipient)
    .innerJoin(
      schema.contact,
      eq(schema.campaignRecipient.contactId, schema.contact.id)
    )
    .where(eq(schema.campaignRecipient.campaignId, campaignId))
    .limit(50);

  return {
    ...c.campaign,
    template: c.template,
    creator: c.creator,
    stats: stats ?? {
      total: c.campaign.totalRecipients,
      pending: 0,
      sent: c.campaign.sentCount,
      delivered: c.campaign.deliveredCount,
      read: c.campaign.readCount,
      failed: c.campaign.failedCount,
    },
    sampleRecipients: sampleRecipients.map((s) => ({
      ...s.recipient,
      contactName: s.contactName,
    })),
  };
}

/** Calcula los contactos elegibles para una campaña según segmentación */
export async function calculateAudience(
  organizationId: string,
  targetType: "all_contacts" | "pipeline_stages",
  targetStageIds?: string[]
): Promise<Array<{ id: string; name: string; phone: string }>> {
  const db = getDb();

  if (targetType === "pipeline_stages" && targetStageIds && targetStageIds.length > 0) {
    const rows = await db
      .select({
        id: schema.contact.id,
        name: schema.contact.name,
        phone: schema.contact.phone,
      })
      .from(schema.lead)
      .innerJoin(
        schema.contact,
        eq(schema.lead.contactId, schema.contact.id)
      )
      .where(
        and(
          scoped(schema.lead.organizationId, organizationId),
          inArray(schema.lead.stageId, targetStageIds),
          isNull(schema.contact.archivedAt)
        )
      );

    // Desduplicar contactos si están en múltiples leads
    const uniqueMap = new Map<string, { id: string; name: string; phone: string }>();
    for (const r of rows) {
      if (r.phone && r.phone.trim().length >= 7) {
        uniqueMap.set(r.id, r);
      }
    }
    return Array.from(uniqueMap.values());
  }

  // Todos los contactos no archivados
  const rows = await db
    .select({
      id: schema.contact.id,
      name: schema.contact.name,
      phone: schema.contact.phone,
    })
    .from(schema.contact)
    .where(
      and(
        scoped(schema.contact.organizationId, organizationId),
        isNull(schema.contact.archivedAt)
      )
    );

  return rows.filter((r) => r.phone && r.phone.trim().length >= 7);
}

/** Crea una nueva campaña y asocia a sus destinatarios */
export async function createCampaign(
  organizationId: string,
  userId: string,
  userRole: string,
  input: CreateCampaignInput
) {
  const db = getDb();

  // Validar plantilla
  const [template] = await db
    .select()
    .from(schema.template)
    .where(
      and(
        scoped(schema.template.organizationId, organizationId),
        eq(schema.template.id, input.templateId)
      )
    )
    .limit(1);

  if (!template) {
    throw new Error("Plantilla de WhatsApp no encontrada");
  }

  if (template.status !== "approved") {
    throw new Error("La plantilla seleccionada debe estar aprobada por Meta");
  }

  // Calcular audiencia
  const audience = await calculateAudience(
    organizationId,
    input.targetType,
    input.targetStageIds
  );

  if (audience.length === 0) {
    throw new Error("No hay destinatarios válidos con número telefónico para esta segmentación");
  }

  // Determinar estado según rol y programación
  let initialStatus: schema.CampaignStatus = "draft";
  const isOwner = userRole === "owner";

  let scheduledDate: Date | null = null;
  if (input.scheduledAt) {
    scheduledDate = new Date(input.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      scheduledDate = null;
    }
  }

  if (input.sendImmediately) {
    // Si se envía de inmediato:
    // - Si es owner -> "scheduled" con scheduledAt = now() (o "sending")
    // - Si es member -> "pending_approval"
    initialStatus = isOwner ? "scheduled" : "pending_approval";
    scheduledDate = new Date();
  } else if (scheduledDate) {
    // Si tiene fecha futura:
    // - Si es owner -> "scheduled"
    // - Si es member -> "pending_approval"
    initialStatus = isOwner ? "scheduled" : "pending_approval";
  }

  const campaignId = newId("campaign");

  // Insertar campaña
  const [newCampaign] = await db
    .insert(schema.campaign)
    .values({
      id: campaignId,
      organizationId,
      name: input.name.trim(),
      templateId: input.templateId,
      mediaUrl: input.mediaUrl ?? null,
      mediaType: input.mediaType ?? null,
      variableValues: input.variableValues ?? null,
      targetType: input.targetType,
      targetStageIds: input.targetStageIds ?? null,
      totalRecipients: audience.length,
      sentCount: 0,
      deliveredCount: 0,
      readCount: 0,
      failedCount: 0,
      status: initialStatus,
      scheduledAt: scheduledDate,
      createdById: userId,
      approvedById: isOwner ? userId : null,
    })
    .returning();

  // Insertar destinatarios en lote
  const recipientValues = audience.map((contact) => ({
    id: newId("campaignRecipient"),
    organizationId,
    campaignId,
    contactId: contact.id,
    phone: contact.phone.trim(),
    status: "pending" as const,
  }));

  // Insertar en chunks de 500 para evitar límites de parámetros en Postgres
  const chunkSize = 500;
  for (let i = 0; i < recipientValues.length; i += chunkSize) {
    const chunk = recipientValues.slice(i, i + chunkSize);
    await db.insert(schema.campaignRecipient).values(chunk);
  }

  return newCampaign;
}

/** Aprueba una campaña pendiente (solo rol owner) */
export async function approveCampaign(
  organizationId: string,
  campaignId: string,
  approvedById: string
) {
  const db = getDb();
  const [c] = await db
    .select()
    .from(schema.campaign)
    .where(
      and(
        scoped(schema.campaign.organizationId, organizationId),
        eq(schema.campaign.id, campaignId)
      )
    )
    .limit(1);

  if (!c) throw new Error("Campaña no encontrada");
  if (c.status !== "pending_approval") {
    throw new Error(`La campaña no está pendiente de aprobación (estado: ${c.status})`);
  }

  const scheduledAt = c.scheduledAt ? new Date(c.scheduledAt) : new Date();

  const [updated] = await db
    .update(schema.campaign)
    .set({
      status: "scheduled",
      approvedById,
      scheduledAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.campaign.id, campaignId))
    .returning();

  return updated;
}

/** Cancela una campaña programada o en borrador */
export async function cancelCampaign(organizationId: string, campaignId: string) {
  const db = getDb();
  const [c] = await db
    .select()
    .from(schema.campaign)
    .where(
      and(
        scoped(schema.campaign.organizationId, organizationId),
        eq(schema.campaign.id, campaignId)
      )
    )
    .limit(1);

  if (!c) throw new Error("Campaña no encontrada");
  if (c.status === "completed" || c.status === "cancelled") {
    throw new Error(`La campaña ya no se puede cancelar (estado: ${c.status})`);
  }

  const [updated] = await db
    .update(schema.campaign)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(schema.campaign.id, campaignId))
    .returning();

  return updated;
}
