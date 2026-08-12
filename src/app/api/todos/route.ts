import { asc, sql } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  const db = getDb();
  const todos = await db
    .select()
    .from(schema.todo)
    .where(scoped(schema.todo.organizationId, session.organizationId))
    .orderBy(asc(schema.todo.position));
  return Response.json({ todos });
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, createSchema);
  if (!body.ok) return body.response;

  const db = getDb();
  const maxPos = await db
    .select({
      max: sql<number>`coalesce(max(${schema.todo.position}), -1)`,
    })
    .from(schema.todo)
    .where(scoped(schema.todo.organizationId, session.organizationId));

  const inserted = await db
    .insert(schema.todo)
    .values({
      id: newId("todo"),
      organizationId: session.organizationId,
      title: body.data.title,
      position: (maxPos[0]?.max ?? -1) + 1,
    })
    .returning();
  if (!inserted[0]) return apiError(500, "internal", "No se pudo crear");
  return Response.json({ todo: inserted[0] }, { status: 201 });
});