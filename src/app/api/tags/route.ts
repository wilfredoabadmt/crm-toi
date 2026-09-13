import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { createTag, getTags } from "@/server/tags-quick-replies/service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  try {
    const tags = await getTags(session.organizationId);
    return Response.json({ tags });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al obtener etiquetas";
    return apiError(500, "internal", msg);
  }
});

const createTagSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la etiqueta es obligatorio"),
  color: z.string().trim().optional(),
});

export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, createTagSchema);
  if (!body.ok) return body.response;

  try {
    const tag = await createTag(session.organizationId, body.data);
    return Response.json({ tag }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al crear etiqueta";
    return apiError(400, "invalid", msg);
  }
});
