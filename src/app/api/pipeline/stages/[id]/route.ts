import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";

import { isUserInDepartment } from "@/lib/departments";
import { getResolvedDepartments } from "@/server/departments";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  position: z.number().int().min(0).optional(),
});

async function checkMemberDepartmentAccess(
  organizationId: string,
  userId: string,
  stageDepartmentId?: string | null
): Promise<boolean> {
  const db = getDb();
  const userRow = await db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
  const userEmail = userRow[0]?.email;
  if (!userEmail) return false;

  const resolvedDeps = await getResolvedDepartments(organizationId);
  const targetId = stageDepartmentId ?? "comercial";
  const targetDep = resolvedDeps.find((d) => d.id === targetId);
  if (!targetDep) return false;

  return isUserInDepartment(userEmail, targetDep);
}

export const PATCH = withAuth(async (session, req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.pipelineStage)
    .where(
      scoped(
        schema.pipelineStage.organizationId,
        session.organizationId,
        eq(schema.pipelineStage.id, id)
      )
    )
    .limit(1);
  if (!existing[0]) return apiError(404, "not_found", "Etapa no encontrada");

  if (session.role !== "owner") {
    const hasAccess = await checkMemberDepartmentAccess(
      session.organizationId,
      session.userId,
      existing[0].departmentId
    );
    if (!hasAccess) {
      return apiError(
        403,
        "forbidden",
        "Solo puedes modificar etapas de tu departamento asignado"
      );
    }
  }

  const body = await parseBody(req, patchSchema);
  if (!body.ok) return body.response;

  const updated = await db
    .update(schema.pipelineStage)
    .set({
      ...(body.data.name !== undefined ? { name: body.data.name } : {}),
      ...(body.data.position !== undefined
        ? { position: body.data.position }
        : {}),
    })
    .where(
      scoped(
        schema.pipelineStage.organizationId,
        session.organizationId,
        eq(schema.pipelineStage.id, id)
      )
    )
    .returning();
  if (!updated[0]) return apiError(404, "not_found", "Etapa no encontrada");
  return Response.json({ stage: updated[0] });
});

export const DELETE = withAuth(async (session, req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.pipelineStage)
    .where(
      scoped(
        schema.pipelineStage.organizationId,
        session.organizationId,
        eq(schema.pipelineStage.id, id)
      )
    )
    .limit(1);
  const stage = rows[0];
  if (!stage) return apiError(404, "not_found", "Etapa no encontrada");

  if (session.role !== "owner") {
    const hasAccess = await checkMemberDepartmentAccess(
      session.organizationId,
      session.userId,
      stage.departmentId
    );
    if (!hasAccess) {
      return apiError(
        403,
        "forbidden",
        "Solo puedes eliminar etapas de tu departamento asignado"
      );
    }
  }

  const url = new URL(req.url);
  const moveTo = url.searchParams.get("moveTo");

  if (stage.kind !== "open") {
    return apiError(
      409,
      "anchor_stage",
      'Las etapas ancla ("ganado" y "perdido") no se pueden eliminar'
    );
  }

  const leadsInStage = await db
    .select({ n: count() })
    .from(schema.lead)
    .where(
      scoped(
        schema.lead.organizationId,
        session.organizationId,
        eq(schema.lead.stageId, id)
      )
    );
  const n = leadsInStage[0]?.n ?? 0;

  if (n > 0) {
    if (!moveTo) {
      return apiError(
        409,
        "stage_has_leads",
        "La etapa tiene tarjetas: indica ?moveTo=<etapa destino> para reasignarlas"
      );
    }
    const dest = await db
      .select({ id: schema.pipelineStage.id })
      .from(schema.pipelineStage)
      .where(
        scoped(
          schema.pipelineStage.organizationId,
          session.organizationId,
          eq(schema.pipelineStage.id, moveTo)
        )
      )
      .limit(1);
    if (!dest[0] || moveTo === id) {
      return apiError(422, "invalid_move_to", "Etapa destino inválida");
    }
    await db
      .update(schema.lead)
      .set({ stageId: moveTo, updatedAt: new Date() })
      .where(
        scoped(
          schema.lead.organizationId,
          session.organizationId,
          eq(schema.lead.stageId, id)
        )
      );
  }

  await db
    .delete(schema.pipelineStage)
    .where(
      scoped(
        schema.pipelineStage.organizationId,
        session.organizationId,
        eq(schema.pipelineStage.id, id)
      )
    );
  return Response.json({ deleted: true, movedLeads: n });
});
