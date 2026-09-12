import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";

import { getDepartmentByStageName, isUserInDepartment } from "@/lib/departments";
import { ensureDepartmentStages, getResolvedDepartments } from "@/server/departments";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  const [stages, departments] = await Promise.all([
    ensureDepartmentStages(session.organizationId),
    getResolvedDepartments(session.organizationId),
  ]);
  return Response.json({
    stages: stages.map((s) => {
      const dep = getDepartmentByStageName(s.name, departments, s.departmentId);
      return {
        id: s.id,
        name: s.name,
        position: s.position,
        kind: s.kind,
        departmentId: dep?.id ?? s.departmentId ?? "comercial",
        assignedName: dep?.assignedName ?? null,
        assignedEmail: dep?.assignedEmail ?? null,
        badgeColor: dep?.badgeColor ?? null,
      };
    }),
  });
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  departmentId: z.string().trim().optional(),
});

export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, createSchema);
  if (!body.ok) return body.response;

  const db = getDb();
  let targetDepartmentId = body.data.departmentId ?? "comercial";

  if (session.role !== "owner") {
    // Si es miembro, validar que pertenezca al departamento solicitado o asignado
    const userRow = await db
      .select({ email: schema.user.email })
      .from(schema.user)
      .where(eq(schema.user.id, session.userId))
      .limit(1);
    const userEmail = userRow[0]?.email;
    const resolvedDeps = await getResolvedDepartments(session.organizationId);

    const userDeps = resolvedDeps.filter((d) =>
      isUserInDepartment(userEmail, d)
    );

    if (userDeps.length === 0) {
      return apiError(
        403,
        "forbidden",
        "No tienes un departamento asignado para crear etapas"
      );
    }

    const hasAccessToTarget = userDeps.some((d) => d.id === targetDepartmentId);
    if (!hasAccessToTarget) {
      targetDepartmentId = userDeps[0]!.id;
    }
  }

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
      departmentId: targetDepartmentId,
      name: body.data.name,
      position: (maxPos[0]?.max ?? -1) + 1,
      kind: "open",
    })
    .returning();
  return Response.json({ stage: inserted[0] }, { status: 201 });
});
