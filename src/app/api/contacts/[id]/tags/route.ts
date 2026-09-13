import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  getContactTags,
  setContactTags,
} from "@/server/tags-quick-replies/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth(async (session, _req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  try {
    const tags = await getContactTags(session.organizationId, id);
    return Response.json({ tags });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al obtener etiquetas del contacto";
    return apiError(500, "internal", msg);
  }
});

const setTagsSchema = z.object({
  tagIds: z.array(z.string()),
});

export const POST = withAuth(async (session, req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, setTagsSchema);
  if (!body.ok) return body.response;

  try {
    const tags = await setContactTags(
      session.organizationId,
      id,
      body.data.tagIds
    );
    return Response.json({ tags });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al actualizar etiquetas";
    return apiError(400, "invalid", msg);
  }
});
