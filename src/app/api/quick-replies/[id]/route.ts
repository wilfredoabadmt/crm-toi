import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  deleteQuickReply,
  updateQuickReply,
} from "@/server/tags-quick-replies/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const updateQuickReplySchema = z.object({
  shortcut: z.string().trim().optional(),
  title: z.string().trim().optional(),
  message: z.string().trim().optional(),
});

export const PATCH = withAuth(async (session, req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, updateQuickReplySchema);
  if (!body.ok) return body.response;

  try {
    const updated = await updateQuickReply(
      session.organizationId,
      id,
      body.data
    );
    if (!updated) {
      return apiError(404, "not_found", "Respuesta rápida no encontrada");
    }
    return Response.json({ quickReply: updated });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al actualizar respuesta rápida";
    return apiError(400, "invalid", msg);
  }
});

export const DELETE = withAuth(async (session, _req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  try {
    await deleteQuickReply(session.organizationId, id);
    return Response.json({ ok: true });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error al eliminar respuesta rápida";
    return apiError(400, "invalid", msg);
  }
});
