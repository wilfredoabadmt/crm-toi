import { z } from "zod";
import { eq } from "drizzle-orm";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { getResolvedDepartments } from "@/server/departments";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  try {
    const db = getDb();
    const userRow = await db.query.user.findFirst({
      where: eq(schema.user.id, session.userId),
    });

    if (!userRow) {
      return apiError(404, "not_found", "Usuario no encontrado");
    }

    const allDepartments = await getResolvedDepartments(session.organizationId);
    const userDepartments =
      session.role === "owner"
        ? allDepartments
        : allDepartments.filter(
            (d) =>
              d.assignedEmail.toLowerCase() === userRow.email.toLowerCase()
          );

    return Response.json({
      user: {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        image: userRow.image,
        role: session.role,
      },
      departments: userDepartments,
      allDepartmentsCount: allDepartments.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al obtener perfil";
    return apiError(500, "internal", msg);
  }
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
});

export const PATCH = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, updateProfileSchema);
  if (!body.ok) return body.response;

  try {
    const db = getDb();
    await db
      .update(schema.user)
      .set({
        name: body.data.name,
        updatedAt: new Date(),
      })
      .where(eq(schema.user.id, session.userId));

    const updatedUser = await db.query.user.findFirst({
      where: eq(schema.user.id, session.userId),
    });

    return Response.json({
      user: {
        id: updatedUser?.id ?? session.userId,
        name: updatedUser?.name ?? body.data.name,
        email: updatedUser?.email,
        role: session.role,
      },
      message: "Perfil actualizado correctamente",
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al actualizar perfil";
    return apiError(400, "invalid", msg);
  }
});
