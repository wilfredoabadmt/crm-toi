import { z } from "zod";
import { headers } from "next/headers";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es requerida"),
  newPassword: z
    .string()
    .min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});

export const POST = withAuth(async (_session, req: Request) => {
  const body = await parseBody(req, changePasswordSchema);
  if (!body.ok) return body.response;

  try {
    const auth = getAuth();
    const reqHeaders = await headers();

    await auth.api.changePassword({
      body: {
        currentPassword: body.data.currentPassword,
        newPassword: body.data.newPassword,
        revokeOtherSessions: false,
      },
      headers: reqHeaders,
    });

    return Response.json({
      ok: true,
      message: "Contraseña actualizada exitosamente",
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Contraseña actual incorrecta o error al cambiar contraseña";
    return apiError(400, "invalid", msg);
  }
});
