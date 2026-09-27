import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { processCampaignAssistantTurn } from "@/server/ai/campaign-assistant";

export const dynamic = "force-dynamic";

const assistantTurnSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1),
    })
  ).min(1, "Se requiere al menos un mensaje"),
});

export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, assistantTurnSchema);
  if (!body.ok) return body.response;

  try {
    const action = await processCampaignAssistantTurn({
      organizationId: session.organizationId,
      userRole: session.role,
      messages: body.data.messages,
    });

    return Response.json({
      ok: true,
      action,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error procesando turno del asistente";
    return apiError(500, "ai_error", msg);
  }
});
