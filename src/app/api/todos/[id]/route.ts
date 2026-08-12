import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  completed: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export const PATCH = withAuth(async (session, req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, patchSchema);
  if (!body.ok) return body.response;

  const db = getDb();
  const updated = await db
    .update(schema.todo)
    .set({ ...body.data, updatedAt: new Date() })
    .where(
      scoped(
        schema.todo.organizationId,
        session.organizationId,
        eq(schema.todo.id, id)
      )
    )
    .returning();
  if (!updated[0]) return apiError(404, "not_found", "Tarea no encontrada");
  return Response.json({ todo: updated[0] });
});

export const DELETE = withAuth(async (session, _req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const db = getDb();
  const deleted = await db
    .delete(schema.todo)
    .where(
      scoped(
        schema.todo.organizationId,
        session.organizationId,
        eq(schema.todo.id, id)
      )
    )
    .returning();
  if (!deleted[0]) return apiError(404, "not_found", "Tarea no encontrada");
  return Response.json({ deleted: true });
});