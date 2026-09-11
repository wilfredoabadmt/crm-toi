import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import {
  getResolvedDepartments,
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

const saveSchema = z.object({
  assignments: z.record(
    z.string(),
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
    })
  ),
});

export const POST = withAuth(async (session, req: Request) => {
  if (session.role !== "owner") {
    return apiError(
      403,
      "forbidden",
      "Solo el propietario puede cambiar los responsables de departamento"
    );
  }

  const body = await parseBody(req, saveSchema);
  if (!body.ok) return body.response;

  await saveDepartmentAssignments(session.organizationId, body.data.assignments);

  const updatedDepartments = await getResolvedDepartments(session.organizationId);

  return Response.json({ ok: true, departments: updatedDepartments });
});
