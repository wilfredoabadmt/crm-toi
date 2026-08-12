import { eq, and, desc } from "drizzle-orm";
import { getDb, schema, type AgentMediaCategory } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { deleteFromR2 } from "@/lib/storage/r2";

export type AgentMediaItem = typeof schema.agentMedia.$inferSelect;

/** Obtiene todos los recursos de imágenes y archivos registrados por la organización. */
export async function getAgentMediaByOrg(
  organizationId: string
): Promise<AgentMediaItem[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.agentMedia)
    .where(eq(schema.agentMedia.organizationId, organizationId))
    .orderBy(desc(schema.agentMedia.createdAt));
}

/** Registra un nuevo recurso de imagen con su categoría y regla de entrega para el agente. */
export async function createAgentMedia(input: {
  organizationId: string;
  category?: AgentMediaCategory;
  name: string;
  url: string;
  rule: string;
  filename: string;
  mimeType: string;
}): Promise<AgentMediaItem> {
  const db = getDb();
  const inserted = await db
    .insert(schema.agentMedia)
    .values({
      id: newId("agentMedia"),
      organizationId: input.organizationId,
      category: input.category ?? "general",
      name: input.name.trim(),
      url: input.url.trim(),
      rule: input.rule.trim(),
      filename: input.filename,
      mimeType: input.mimeType,
    })
    .returning();
  return inserted[0]!;
}

/** Actualiza un recurso de imagen existente y sus propiedades. */
export async function updateAgentMedia(
  organizationId: string,
  id: string,
  input: {
    name?: string;
    category?: AgentMediaCategory;
    rule?: string;
    url?: string;
    filename?: string;
    mimeType?: string;
  }
): Promise<AgentMediaItem | null> {
  const db = getDb();
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.category !== undefined) updateData.category = input.category;
  if (input.rule !== undefined) updateData.rule = input.rule.trim();
  if (input.url !== undefined) updateData.url = input.url.trim();
  if (input.filename !== undefined) updateData.filename = input.filename;
  if (input.mimeType !== undefined) updateData.mimeType = input.mimeType;

  if (Object.keys(updateData).length === 0) {
    const existing = await db
      .select()
      .from(schema.agentMedia)
      .where(
        and(
          eq(schema.agentMedia.id, id),
          eq(schema.agentMedia.organizationId, organizationId)
        )
      )
      .limit(1);
    return existing[0] ?? null;
  }

  const updated = await db
    .update(schema.agentMedia)
    .set(updateData)
    .where(
      and(
        eq(schema.agentMedia.id, id),
        eq(schema.agentMedia.organizationId, organizationId)
      )
    )
    .returning();

  return updated[0] ?? null;
}

/** Elimina un recurso de imagen de la organización y borra su archivo de Cloudflare R2. */
export async function deleteAgentMedia(
  organizationId: string,
  id: string
): Promise<boolean> {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.agentMedia)
    .where(
      and(
        eq(schema.agentMedia.id, id),
        eq(schema.agentMedia.organizationId, organizationId)
      )
    )
    .limit(1);

  const item = existing[0];
  if (!item) return false;

  // Eliminar de R2 de forma asíncrona
  if (item.url) {
    void deleteFromR2(item.url);
  }

  const deleted = await db
    .delete(schema.agentMedia)
    .where(
      and(
        eq(schema.agentMedia.id, id),
        eq(schema.agentMedia.organizationId, organizationId)
      )
    )
    .returning();

  return Boolean(deleted[0]);
}

