import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { sendTestCampaignMessage } from "@/server/campaigns/dispatch";

export const dynamic = "force-dynamic";

const testSendSchema = z.object({
  templateId: z.string().min(1, "La plantilla es obligatoria"),
  recipientPhone: z.string().min(6, "Número de teléfono inválido"),
  mediaUrl: z.string().nullable().optional(),
  mediaType: z.enum(["image", "video", "document"]).nullable().optional(),
  variableValues: z.record(z.string(), z.string()).optional(),
});

export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, testSendSchema);
  if (!body.ok) return body.response;

  try {
    const result = await sendTestCampaignMessage({
      organizationId: session.organizationId,
      templateId: body.data.templateId,
      recipientPhone: body.data.recipientPhone,
      mediaUrl: body.data.mediaUrl,
      mediaType: body.data.mediaType,
      variableValues: body.data.variableValues,
    });

    return Response.json({
      ok: true,
      waMessageId: result.waMessageId,
      message: "Mensaje de prueba enviado exitosamente a WhatsApp",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error enviando prueba de WhatsApp";
    return apiError(400, "meta_error", msg);
  }
});
