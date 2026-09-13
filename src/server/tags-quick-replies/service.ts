import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";

/* ============================================================
 * SERVICIO DE ETIQUETAS (TAGS)
 * ============================================================ */

export async function getTags(organizationId: string) {
  const db = getDb();
  return db
    .select()
    .from(schema.tag)
    .where(scoped(schema.tag.organizationId, organizationId))
    .orderBy(desc(schema.tag.createdAt));
}

export async function createTag(
  organizationId: string,
  input: { name: string; color?: string }
) {
  const db = getDb();
  const tagId = newId("tag");
  const [created] = await db
    .insert(schema.tag)
    .values({
      id: tagId,
      organizationId,
      name: input.name.trim(),
      color: input.color?.trim() || "#3b82f6",
    })
    .returning();
  return created;
}

export async function deleteTag(organizationId: string, tagId: string) {
  const db = getDb();
  await db
    .delete(schema.tag)
    .where(
      and(
        scoped(schema.tag.organizationId, organizationId),
        eq(schema.tag.id, tagId)
      )
    );
  return { ok: true };
}

/* ============================================================
 * ASIGNACIÓN DE ETIQUETAS A CONTACTOS
 * ============================================================ */

export async function getContactTags(
  organizationId: string,
  contactId: string
) {
  const db = getDb();
  const rows = await db
    .select({
      tag: schema.tag,
    })
    .from(schema.contactTag)
    .innerJoin(schema.tag, eq(schema.contactTag.tagId, schema.tag.id))
    .where(
      and(
        scoped(schema.contactTag.organizationId, organizationId),
        eq(schema.contactTag.contactId, contactId)
      )
    );
  return rows.map((r) => r.tag);
}

export async function setContactTags(
  organizationId: string,
  contactId: string,
  tagIds: string[]
) {
  const db = getDb();

  // Eliminar asignaciones previas
  await db
    .delete(schema.contactTag)
    .where(
      and(
        scoped(schema.contactTag.organizationId, organizationId),
        eq(schema.contactTag.contactId, contactId)
      )
    );

  if (tagIds.length === 0) return [];

  // Insertar nuevas asignaciones
  const values = tagIds.map((tagId) => ({
    id: newId("contactTag"),
    organizationId,
    contactId,
    tagId,
  }));

  await db.insert(schema.contactTag).values(values);
  return getContactTags(organizationId, contactId);
}

/* ============================================================
 * SERVICIO DE RESPUESTAS RÁPIDAS (QUICK REPLIES)
 * ============================================================ */

export async function getQuickReplies(organizationId: string) {
  const db = getDb();
  return db
    .select()
    .from(schema.quickReply)
    .where(scoped(schema.quickReply.organizationId, organizationId))
    .orderBy(desc(schema.quickReply.createdAt));
}

export async function createQuickReply(
  organizationId: string,
  input: { shortcut: string; title: string; message: string }
) {
  const db = getDb();
  const qrId = newId("quickReply");
  const cleanShortcut = input.shortcut.trim().toLowerCase().replace(/^\//, "");

  const [created] = await db
    .insert(schema.quickReply)
    .values({
      id: qrId,
      organizationId,
      shortcut: cleanShortcut,
      title: input.title.trim(),
      message: input.message.trim(),
    })
    .returning();

  return created;
}

export async function updateQuickReply(
  organizationId: string,
  id: string,
  input: { shortcut?: string; title?: string; message?: string }
) {
  const db = getDb();
  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (input.shortcut) {
    updateData.shortcut = input.shortcut.trim().toLowerCase().replace(/^\//, "");
  }
  if (input.title) updateData.title = input.title.trim();
  if (input.message) updateData.message = input.message.trim();

  const [updated] = await db
    .update(schema.quickReply)
    .set(updateData)
    .where(
      and(
        scoped(schema.quickReply.organizationId, organizationId),
        eq(schema.quickReply.id, id)
      )
    )
    .returning();

  return updated ?? null;
}

export async function deleteQuickReply(
  organizationId: string,
  id: string
) {
  const db = getDb();
  await db
    .delete(schema.quickReply)
    .where(
      and(
        scoped(schema.quickReply.organizationId, organizationId),
        eq(schema.quickReply.id, id)
      )
    );
  return { ok: true };
}
