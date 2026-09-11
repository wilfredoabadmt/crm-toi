import { asc, sql } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";

import { getDepartmentByStageName } from "@/lib/departments";
import { ensureDepartmentStages, getResolvedDepartments } from "@/server/departments";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  const [stages, departments] = await Promise.all([
    ensureDepartmentStages(session.organizationId),
    getResolvedDepartments(session.organizationId),
  ]);
  return Response.json({
    stages: stages.map((s) => {
      const dep = getDepartmentByStageName(s.name, departments);
      return {
        id: s.id,
        name: s.name,
        position: s.position,
        kind: s.kind,
        assignedName: dep?.assignedName ?? null,
        assignedEmail: dep?.assignedEmail ?? null,
        badgeColor: dep?.badgeColor ?? null,
      };
    }),
  });
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const POST = withAuth(async (session, req: Request) => {
  if (session.role !== "owner") {
    return apiError(
      403,
      "forbidden",
      "Solo el propietario puede crear etapas en el pipeline"
    );
  }
  const body = await parseBody(req, createSchema);
  if (!body.ok) return body.response;

  const db = getDb();
  const maxPos = await db
    .select({
      max: sql<number>`coalesce(max(${schema.pipelineStage.position}), -1)`,
    })
    .from(schema.pipelineStage)
    .where(scoped(schema.pipelineStage.organizationId, session.organizationId));

  const inserted = await db
    .insert(schema.pipelineStage)
    .values({
      id: newId("stage"),
      organizationId: session.organizationId,
      name: body.data.name,
      position: (maxPos[0]?.max ?? -1) + 1,
      kind: "open",
    })
    .returning();
  return Response.json({ stage: inserted[0] }, { status: 201 });
});
