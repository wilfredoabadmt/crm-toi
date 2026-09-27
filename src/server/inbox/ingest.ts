import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { publish } from "@/server/events/bus";
import { getCredentialsByPhoneNumberId } from "@/server/whatsapp/credentials";
import type { WebhookValue } from "@/server/inbox/webhook";
import { applyStatusUpdate } from "@/server/inbox/status";
import { onLeadActivity } from "@/server/inbox/lead-activity";
import { maybeRunAgentTurn } from "@/server/ai/trigger";
import { handleOutOfHoursInbound } from "@/server/business-hours/service";
import { persistMetaMediaToR2 } from "@/server/inbox/media-storage";

/** Tipos de contenido soportados; el resto se ignora sin error. */
const SUPPORTED_TYPES = new Set([
  "text",
  "image",
  "audio",
  "video",
  "document",
  "sticker",
  "location",
  "contacts",
]);

export async function getOrCreateContact(
  organizationId: string,
  phone: string,
  name?: string | null
) {
  const db = getDb();
  const inserted = await db
    .insert(schema.contact)
    .values({
      id: newId("contact"),
      organizationId,
      phone,
      name: name?.trim() || phone,
    })
    .onConflictDoNothing({
      target: [schema.contact.organizationId, schema.contact.phone],
    })
    .returning();
  if (inserted[0]) return { contact: inserted[0], isNew: true };

  const rows = await db
    .select()
    .from(schema.contact)
    .where(
      and(
        eq(schema.contact.organizationId, organizationId),
        eq(schema.contact.phone, phone)
      )
    )
    .limit(1);
  const existing = rows[0];
  if (!existing) throw new Error("contacto no encontrado tras upsert");

  // Reactivar si estaba archivado (el nombre editado por el operador se respeta).
  if (existing.archivedAt) {
    await db
      .update(schema.contact)
      .set({ archivedAt: null, updatedAt: new Date() })
      .where(eq(schema.contact.id, existing.id));
    existing.archivedAt = null;
  }
  return { contact: existing, isNew: false };
}

export async function getOrCreateConversation(
  organizationId: string,
  contactId: string,
  phoneNumberId?: string | null,
  departmentId?: string | null
) {
  const db = getDb();
  const inserted = await db
    .insert(schema.conversation)
    .values({
      id: newId("conversation"),
      organizationId,
      contactId,
      phoneNumberId: phoneNumberId ?? null,
      departmentId: departmentId ?? null,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];

  const whereConditions = [
    eq(schema.conversation.organizationId, organizationId),
    eq(schema.conversation.contactId, contactId),
    eq(schema.conversation.isTest, false),
  ];

  if (phoneNumberId) {
    whereConditions.push(eq(schema.conversation.phoneNumberId, phoneNumberId));
  }

  const rows = await db
    .select()
    .from(schema.conversation)
    .where(and(...whereConditions))
    .limit(1);
  const existing = rows[0];
  if (!existing) throw new Error("conversación no encontrada tras upsert");
  return existing;
}

/**
 * Procesa el `value` de un cambio `messages` del webhook: mensajes entrantes
 * (idempotentes por wa_message_id) y actualizaciones de estado.
 */
export async function processMessagesValue(value: WebhookValue): Promise<void> {
  const phoneNumberId = value.metadata?.phone_number_id;
  if (!phoneNumberId) return;

  const credentials = await getCredentialsByPhoneNumberId(phoneNumberId);
  if (!credentials) {
    // Caso típico: webhook/override configurado ANTES de guardar la conexión
    // en el wizard — el evento llega pero no hay a qué organización enrutarlo.
    console.warn(
      `[webhook] evento para phone_number_id desconocido (${phoneNumberId}): ` +
        "guarda la conexión en Configuración → WhatsApp para recibir mensajes"
    );
    return;
  }

  const organizationId = credentials.organizationId;

  for (const status of value.statuses ?? []) {
    await applyStatusUpdate(organizationId, status);
  }

  for (const msg of value.messages ?? []) {
    if (!SUPPORTED_TYPES.has(msg.type)) continue; // reacciones, etc.: ignorar
    const profileName = value.contacts?.find(
      (c) => c.wa_id === msg.from
    )?.profile?.name;
    let messageText = msg.text?.body ?? null;

    if (msg.type === "location" && msg.location) {
      const { latitude, longitude, name, address } = msg.location;
      messageText = `📍 Ubicación compartida: Latitud ${latitude}, Longitud ${longitude}${address ? ` (${address})` : ""}${name ? ` [${name}]` : ""}`;
    } else if (msg.type === "image" && msg.image) {
      const caption = msg.image.caption?.trim();
      let r2Url: string | null = null;
      if (credentials?.token) {
        r2Url = await persistMetaMediaToR2({
          mediaId: msg.image.id,
          token: credentials.token,
        });
      }
      if (r2Url) {
        messageText = caption ? `[IMAGEN: ${r2Url}] ${caption}` : `[IMAGEN: ${r2Url}]`;
      } else {
        messageText = caption
          ? `[MEDIA:${msg.image.id}] ${caption}`
          : `[MEDIA:${msg.image.id}]`;
      }
    } else if (msg.type === "document" && msg.document) {
      const name = msg.document.filename ?? "documento";
      const caption = msg.document.caption?.trim();
      messageText = caption
        ? `[DOC:${msg.document.id}:${name}] ${caption}`
        : `[DOC:${msg.document.id}:${name}]`;
    } else if (msg.type === "audio" && msg.audio) {
      messageText = `[AUDIO:${msg.audio.id}]`;
    } else if (msg.type === "video" && msg.video) {
      const caption = msg.video.caption?.trim();
      messageText = caption
        ? `[VIDEO:${msg.video.id}] ${caption}`
        : `[VIDEO:${msg.video.id}]`;
    } else if (msg.type === "sticker" && msg.sticker) {
      messageText = `[STICKER:${msg.sticker.id}]`;
    }

    await ingestInboundMessage({
      organizationId,
      from: msg.from,
      profileName: profileName ?? null,
      waMessageId: msg.id,
      type: msg.type,
      text: messageText,
      timestamp: msg.timestamp,
      phoneNumberId,
    });
  }
}

export async function ingestInboundMessage(input: {
  organizationId: string;
  from: string;
  profileName: string | null;
  waMessageId: string;
  type: string;
  text: string | null;
  timestamp: string;
  phoneNumberId?: string | null;
}): Promise<void> {
  const db = getDb();
  const { organizationId, phoneNumberId } = input;

  // Resolver departamento a partir del phoneNumberId si está asignado
  let departmentId: string | null = null;
  if (phoneNumberId) {
    const { getResolvedDepartments } = await import("@/server/departments");
    const allDeps = await getResolvedDepartments(organizationId);
    const matchedDep = allDeps.find((d) => d.phoneNumberId === phoneNumberId);
    if (matchedDep) {
      departmentId = matchedDep.id;
    }
  }

  const { contact } = await getOrCreateContact(
    organizationId,
    input.from,
    input.profileName
  );
  const conversation = await getOrCreateConversation(
    organizationId,
    contact.id,
    phoneNumberId,
    departmentId
  );

  const waTimestamp = toDate(input.timestamp);

  // Idempotencia dura: mismo wa_message_id → sin efectos adicionales.
  const inserted = await db
    .insert(schema.message)
    .values({
      id: newId("message"),
      organizationId,
      conversationId: conversation.id,
      waMessageId: input.waMessageId,
      direction: "in",
      type: input.type,
      text: input.text,
      status: "delivered",
      waTimestamp,
    })
    .onConflictDoNothing({ target: [schema.message.waMessageId] })
    .returning();
  const message = inserted[0];
  if (!message) return; // duplicado

  await db
    .update(schema.conversation)
    .set({
      lastInboundAt: waTimestamp,
      lastMessageAt: waTimestamp,
      unreadCount: sql`${schema.conversation.unreadCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(schema.conversation.id, conversation.id));

  await onLeadActivity(organizationId, contact.id, waTimestamp);

  publish(organizationId, {
    type: "message.new",
    data: { conversationId: conversation.id, message: serializeMessage(message) },
  });
  publish(organizationId, {
    type: "conversation.updated",
    data: { conversation: { id: conversation.id } },
  });

  const outOfHours = await handleOutOfHoursInbound(
    organizationId,
    conversation,
    contact
  );

  if (!outOfHours.preventAi) {
    await maybeRunAgentTurn(conversation.id);
  }
}

function toDate(timestamp: string): Date {
  const n = Number(timestamp);
  if (Number.isFinite(n) && n > 0) return new Date(n * 1000);
  return new Date();
}

export function serializeMessage(m: typeof schema.message.$inferSelect) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    direction: m.direction,
    type: m.type,
    text: m.text,
    status: m.status,
    aiGenerated: m.aiGenerated,
    createdAt: (m.waTimestamp ?? m.createdAt).toISOString(),
  };
}
