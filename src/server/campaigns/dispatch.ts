import { and, eq, lte, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { normalizeRecipient } from "@/lib/meta/client";
import { getCredentialsByOrg } from "@/server/whatsapp/credentials";
import { callGraphSend } from "@/server/inbox/send";
import { countVariables } from "@/server/whatsapp/templates";
import { scoped } from "@/lib/db/tenant";

interface TemplatePayloadComponent {
  type: "header" | "body" | "button";
  sub_type?: string;
  index?: string;
  parameters: Array<{
    type: "text" | "image" | "video" | "document";
    text?: string;
    image?: { link: string };
    video?: { link: string };
    document?: { link: string };
  }>;
}

/** Construye los componentes de Meta Graph API para la plantilla */
function buildTemplateComponents(input: {
  templateBody: string;
  variableValues?: Record<string, string> | null;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "document" | null;
  contactName?: string;
}): TemplatePayloadComponent[] {
  const components: TemplatePayloadComponent[] = [];

  // 1. Componente de Cabecera Multimedia (si aplica)
  if (input.mediaUrl && input.mediaType) {
    if (input.mediaType === "image") {
      components.push({
        type: "header",
        parameters: [{ type: "image", image: { link: input.mediaUrl } }],
      });
    } else if (input.mediaType === "video") {
      components.push({
        type: "header",
        parameters: [{ type: "video", video: { link: input.mediaUrl } }],
      });
    } else if (input.mediaType === "document") {
      components.push({
        type: "header",
        parameters: [{ type: "document", document: { link: input.mediaUrl } }],
      });
    }
  }

  // 2. Componente de Cuerpo (Variables {{1}}, {{2}}, etc.)
  const varCount = countVariables(input.templateBody);
  if (varCount > 0) {
    const parameters: Array<{ type: "text"; text: string }> = [];
    const values = input.variableValues ?? {};

    for (let i = 1; i <= varCount; i++) {
      let val = values[String(i)] || values[`var_${i}`] || "";
      // Reemplazo dinámico de nombre si la variable es {{1}} y no se fijó valor manual
      if (!val && i === 1 && input.contactName) {
        val = input.contactName;
      }
      parameters.push({
        type: "text",
        text: val.trim() || "Cliente",
      });
    }

    components.push({
      type: "body",
      parameters,
    });
  }

  return components;
}

/** Envía un mensaje de prueba individual a un número de teléfono */
export async function sendTestCampaignMessage(input: {
  organizationId: string;
  templateId: string;
  recipientPhone: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "document" | null;
  variableValues?: Record<string, string> | null;
}) {
  const db = getDb();
  const [template] = await db
    .select()
    .from(schema.template)
    .where(
      and(
        scoped(schema.template.organizationId, input.organizationId),
        eq(schema.template.id, input.templateId)
      )
    )
    .limit(1);

  if (!template) throw new Error("Plantilla no encontrada");
  if (template.status !== "approved") {
    throw new Error("La plantilla no está aprobada por Meta");
  }

  const credentials = await getCredentialsByOrg(input.organizationId);
  if (!credentials) throw new Error("No hay número de WhatsApp conectado");
  if (credentials.status === "reconnect_required") {
    throw new Error("El token de WhatsApp expiró. Reconecta el número.");
  }

  const components = buildTemplateComponents({
    templateBody: template.body,
    variableValues: input.variableValues,
    mediaUrl: input.mediaUrl,
    mediaType: input.mediaType,
    contactName: "Contacto de Prueba",
  });

  const payload = {
    messaging_product: "whatsapp",
    to: normalizeRecipient(input.recipientPhone),
    type: "template",
    template: {
      name: template.name,
      language: { code: template.language },
      ...(components.length > 0 ? { components } : {}),
    },
  };

  const waMessageId = await callGraphSend(credentials, payload);
  return { waMessageId };
}

/** Ejecuta una campaña procesando sus destinatarios con rate limiting */
export async function executeCampaign(campaignId: string): Promise<void> {
  const db = getDb();

  // Obtener campaña
  const [c] = await db
    .select({
      campaign: schema.campaign,
      template: schema.template,
    })
    .from(schema.campaign)
    .innerJoin(
      schema.template,
      eq(schema.campaign.templateId, schema.template.id)
    )
    .where(eq(schema.campaign.id, campaignId))
    .limit(1);

  if (!c) throw new Error("Campaña no encontrada");
  if (c.campaign.status === "cancelled" || c.campaign.status === "completed") {
    return;
  }

  const creds = await getCredentialsByOrg(c.campaign.organizationId);
  if (!creds || creds.status === "reconnect_required") {
    await db
      .update(schema.campaign)
      .set({
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(schema.campaign.id, campaignId));
    throw new Error("WhatsApp no está conectado o el token expiró");
  }

  // Marcar como en proceso
  await db
    .update(schema.campaign)
    .set({
      status: "sending",
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.campaign.id, campaignId));

  // Obtener destinatarios pendientes con su contacto
  const recipients = await db
    .select({
      recipient: schema.campaignRecipient,
      contact: schema.contact,
    })
    .from(schema.campaignRecipient)
    .innerJoin(
      schema.contact,
      eq(schema.campaignRecipient.contactId, schema.contact.id)
    )
    .where(
      and(
        eq(schema.campaignRecipient.campaignId, campaignId),
        eq(schema.campaignRecipient.status, "pending")
      )
    )
    .orderBy(schema.campaignRecipient.id);

  if (recipients.length === 0) {
    await db
      .update(schema.campaign)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.campaign.id, campaignId));
    return;
  }

  let sentCount = c.campaign.sentCount;
  let failedCount = c.campaign.failedCount;

  // Procesar con ritmo controlado (pausa de 60ms entre mensajes = ~16 msgs/segundo)
  for (const { recipient, contact } of recipients) {
    // Comprobar si la campaña fue cancelada en caliente mientras se enviaba
    const [current] = await db
      .select({ status: schema.campaign.status })
      .from(schema.campaign)
      .where(eq(schema.campaign.id, campaignId))
      .limit(1);

    if (current?.status === "cancelled") {
      break;
    }

    try {
      const components = buildTemplateComponents({
        templateBody: c.template.body,
        variableValues: c.campaign.variableValues,
        mediaUrl: c.campaign.mediaUrl,
        mediaType: c.campaign.mediaType,
        contactName: contact.name,
      });

      const payload = {
        messaging_product: "whatsapp",
        to: normalizeRecipient(recipient.phone),
        type: "template",
        template: {
          name: c.template.name,
          language: { code: c.template.language },
          ...(components.length > 0 ? { components } : {}),
        },
      };

      const waMessageId = await callGraphSend(creds, payload);

      // Actualizar destinatario
      await db
        .update(schema.campaignRecipient)
        .set({
          status: "sent",
          waMessageId,
          sentAt: new Date(),
        })
        .where(eq(schema.campaignRecipient.id, recipient.id));

      sentCount++;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error de envío";
      await db
        .update(schema.campaignRecipient)
        .set({
          status: "failed",
          error: errorMsg,
        })
        .where(eq(schema.campaignRecipient.id, recipient.id));

      failedCount++;
    }

    // Actualizar contadores periódicamente en la campaña
    if ((sentCount + failedCount) % 10 === 0) {
      await db
        .update(schema.campaign)
        .set({
          sentCount,
          failedCount,
          updatedAt: new Date(),
        })
        .where(eq(schema.campaign.id, campaignId));
    }

    // Pausa preventiva de rate-limiting (60 ms)
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  // Finalizar campaña
  await db
    .update(schema.campaign)
    .set({
      status: "completed",
      sentCount,
      failedCount,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.campaign.id, campaignId));
}

/** Despacha todas las campañas programadas cuya hora haya llegado */
export async function dispatchDueCampaigns(): Promise<number> {
  const db = getDb();
  const now = new Date();

  // Buscar campañas programadas con fecha menor o igual a ahora
  const due = await db
    .select({ id: schema.campaign.id })
    .from(schema.campaign)
    .where(
      and(
        eq(schema.campaign.status, "scheduled"),
        lte(schema.campaign.scheduledAt, now)
      )
    );

  for (const item of due) {
    try {
      await executeCampaign(item.id);
    } catch (err) {
      console.error(`[dispatch] Error al despachar campaña ${item.id}:`, err);
    }
  }

  return due.length;
}
