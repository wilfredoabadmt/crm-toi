import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getAuth, runInternalSignup } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import { removeMemberFromAllDepartments } from "@/server/departments";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  const db = getDb();
  const members = await db
    .select({
      id: schema.member.id,
      role: schema.member.role,
      createdAt: schema.member.createdAt,
      name: schema.user.name,
      email: schema.user.email,
    })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .where(scoped(schema.member.organizationId, session.organizationId));
  return Response.json({
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      name: m.name,
      email: m.email,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

/** Alta de cuenta de equipo (owner only): email + contraseña temporal (FR-061). */
export const POST = withAuth(async (session, req: Request) => {
  if (session.role !== "owner") {
    return apiError(403, "forbidden", "Solo el propietario puede crear cuentas");
  }
  const body = await parseBody(req, createSchema);
  if (!body.ok) return body.response;

  const auth = getAuth();
  let newUserId: string;
  try {
    const result = await runInternalSignup(() =>
      auth.api.signUpEmail({
        body: {
          name: body.data.name,
          email: body.data.email,
          password: body.data.password,
        },
      })
    );
    newUserId = result.user.id;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo crear la cuenta";
    if (/exist/i.test(message)) {
      return apiError(409, "duplicate", "Ya existe una cuenta con ese correo");
    }
    return apiError(422, "invalid", message);
  }

  const db = getDb();
  await db
    .insert(schema.member)
    .values({
      id: newId("organization"),
      organizationId: session.organizationId,
      userId: newUserId,
      role: "member",
    })
    .onConflictDoNothing();

  return Response.json({ ok: true }, { status: 201 });
});

/** Baja de miembro de equipo (owner only): revoca membresía y sesiones activas. */
export const DELETE = withAuth(async (session, req: Request) => {
  if (session.role !== "owner") {
    return apiError(403, "forbidden", "Solo el propietario puede eliminar miembros");
  }
  const url = new URL(req.url);
  const memberId = url.searchParams.get("id");
  if (!memberId) {
    return apiError(400, "invalid", "Falta el identificador del miembro");
  }

  const db = getDb();
  const rows = await db
    .select({
      id: schema.member.id,
      userId: schema.member.userId,
      role: schema.member.role,
      email: schema.user.email,
    })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .where(
      and(
        eq(schema.member.id, memberId),
        scoped(schema.member.organizationId, session.organizationId)
      )
    )
    .limit(1);

  const target = rows[0];
  if (!target) {
    return apiError(404, "not_found", "Miembro no encontrado en la organización");
  }

  if (target.role === "owner" || target.userId === session.userId) {
    return apiError(400, "invalid", "No puedes eliminar al propietario de la organización");
  }

  // 1. Eliminar la membresía de la organización
  await db.delete(schema.member).where(eq(schema.member.id, memberId));

  // 2. Revocar de inmediato las sesiones activas del usuario
  await db.delete(schema.session).where(eq(schema.session.userId, target.userId));

  // 3. Limpiar sus asignaciones de departamento
  if (target.email) {
    const ownerRows = await db
      .select({ name: schema.user.name, email: schema.user.email })
      .from(schema.user)
      .where(eq(schema.user.id, session.userId))
      .limit(1);
    const ownerLead = ownerRows[0] ?? { name: "Propietario", email: "admin@toi.bo" };
    await removeMemberFromAllDepartments(session.organizationId, target.email, ownerLead);
  }

  return Response.json({ ok: true });
});
