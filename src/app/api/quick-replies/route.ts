import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  createQuickReply,
  getQuickReplies,
} from "@/server/tags-quick-replies/service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  try {
    const quickReplies = await getQuickReplies(session.organizationId);
    return Response.json({ quickReplies });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al obtener respuestas rápidas";
    return apiError(500, "internal", msg);
  }
});

const createQuickReplySchema = z.object({
  shortcut: z.string().trim().min(1, "El atajo es obligatorio"),
  title: z.string().trim().min(1, "El título es obligatorio"),
  message: z.string().trim().min(1, "El mensaje es obligatorio"),
});

export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, createQuickReplySchema);
  if (!body.ok) return body.response;

  try {
    const quickReply = await createQuickReply(
      session.organizationId,
      body.data
    );
    return Response.json({ quickReply }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al crear respuesta rápida";
    return apiError(400, "invalid", msg);
  }
});
