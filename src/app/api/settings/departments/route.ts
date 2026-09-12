import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import {
  ensureDepartmentStages,
  getCustomDepartments,
  getDepartmentAssignments,
  getResolvedDepartments,
  saveCustomDepartments,
  saveDepartmentAssignments,
} from "@/server/departments";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  const db = getDb();
  const [departments, members] = await Promise.all([
    getResolvedDepartments(session.organizationId),
    db
      .select({
        id: schema.member.id,
        role: schema.member.role,
        name: schema.user.name,
        email: schema.user.email,
      })
      .from(schema.member)
      .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
      .where(scoped(schema.member.organizationId, session.organizationId)),
  ]);

  return Response.json({
    departments,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
    })),
  });
});

const departmentConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1),
  assignedName: z.string().min(1),
  assignedEmail: z.string().email(),
  memberEmails: z.array(z.string().email()).optional(),
  badgeColor: z.string(),
  icon: z.enum(["building", "credit-card", "wrench", "shopping-bag"]).default("building"),
  description: z.string(),
  keywords: z.array(z.string()).default([]),
});

const saveSchema = z.object({
  assignments: z
    .record(
      z.string(),
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        memberEmails: z.array(z.string().email()).optional(),
      })
    )
    .optional(),
  customDepartments: z.array(departmentConfigSchema).optional(),
});

export const POST = withAuth(async (session, req: Request) => {
  if (session.role !== "owner") {
    return apiError(
      403,
      "forbidden",
      "Solo el propietario puede gestionar departamentos o sucursales"
    );
  }

  const body = await parseBody(req, saveSchema);
  if (!body.ok) return body.response;

  if (body.data.customDepartments !== undefined) {
    await saveCustomDepartments(session.organizationId, body.data.customDepartments);
  }

  if (body.data.assignments !== undefined) {
    await saveDepartmentAssignments(session.organizationId, body.data.assignments);
  }

  // Asegura que las etapas del pipeline se creen para el nuevo departamento o sucursal
  await ensureDepartmentStages(session.organizationId);

  const updatedDepartments = await getResolvedDepartments(session.organizationId);

  return Response.json({ ok: true, departments: updatedDepartments });
});

export const DELETE = withAuth(async (session, req: Request) => {
  if (session.role !== "owner") {
    return apiError(
      403,
      "forbidden",
      "Solo el propietario puede eliminar departamentos o sucursales"
    );
  }

  const url = new URL(req.url);
  const depId = url.searchParams.get("id");
  if (!depId) {
    return apiError(400, "invalid", "Falta el id del departamento");
  }

  if (["tecnico", "administrativo", "comercial", "gerencia"].includes(depId)) {
    return apiError(400, "invalid", "No se pueden eliminar los departamentos base del sistema");
  }

  const customDeps = await getCustomDepartments(session.organizationId);
  const filtered = customDeps.filter((d) => d.id !== depId);
  await saveCustomDepartments(session.organizationId, filtered);

  const assignments = await getDepartmentAssignments(session.organizationId);
  delete assignments[depId];
  await saveDepartmentAssignments(session.organizationId, assignments);

  const updatedDepartments = await getResolvedDepartments(session.organizationId);

  return Response.json({ ok: true, departments: updatedDepartments });
});
