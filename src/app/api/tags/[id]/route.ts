import { apiError, withAuth } from "@/lib/api";
import { deleteTag } from "@/server/tags-quick-replies/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const DELETE = withAuth(async (session, _req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  try {
    await deleteTag(session.organizationId, id);
    return Response.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al eliminar etiqueta";
    return apiError(400, "invalid", msg);
  }
});
