import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  calculateAudience,
  createCampaign,
  getCampaigns,
} from "@/server/campaigns/campaigns";
import { executeCampaign } from "@/server/campaigns/dispatch";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  const campaigns = await getCampaigns(session.organizationId);
  return Response.json({ campaigns });
});

const createCampaignSchema = z.object({
  action: z.enum(["calculate_audience", "create"]).default("create"),
  name: z.string().min(1, "El nombre es obligatorio"),
  templateId: z.string().min(1, "La plantilla es obligatoria"),
  mediaUrl: z.string().nullable().optional(),
  mediaType: z.enum(["image", "video", "document"]).nullable().optional(),
  variableValues: z.record(z.string(), z.string()).optional(),
  targetType: z.enum(["all_contacts", "pipeline_stages"]).default("all_contacts"),
  targetStageIds: z.array(z.string()).optional(),
  scheduledAt: z.string().nullable().optional(),
  sendImmediately: z.boolean().default(false),
});

export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, createCampaignSchema);
  if (!body.ok) return body.response;

  // Si solo se solicita calcular audiencia
  if (body.data.action === "calculate_audience") {
    try {
      const targetType = body.data.targetType ?? "all_contacts";
      const audience = await calculateAudience(
        session.organizationId,
        targetType,
        body.data.targetStageIds
      );
      return Response.json({
        total: audience.length,
        contacts: audience.slice(0, 10), // Primeros 10 de ejemplo
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al calcular audiencia";
      return apiError(400, "invalid", msg);
    }
  }

  // Crear la campaña
  try {
    const targetType = body.data.targetType ?? "all_contacts";
    const campaign = await createCampaign(
      session.organizationId,
      session.userId,
      session.role,
      {
        name: body.data.name,
        templateId: body.data.templateId,
        mediaUrl: body.data.mediaUrl,
        mediaType: body.data.mediaType,
        variableValues: body.data.variableValues,
        targetType,
        targetStageIds: body.data.targetStageIds,
        scheduledAt: body.data.scheduledAt,
        sendImmediately: body.data.sendImmediately,
      }
    );

    if (!campaign) {
      return apiError(500, "internal", "No se pudo registrar la campaña");
    }

    // Si el propietario pidió enviar inmediatamente, disparar ejecución asíncrona
    if (session.role === "owner" && body.data.sendImmediately) {
      // Disparar en segundo plano sin bloquear la respuesta HTTP
      void executeCampaign(campaign.id).catch((err) => {
        console.error(`[campaigns] Error ejecutando campaña ${campaign.id}:`, err);
      });
    }

    return Response.json({ ok: true, campaign }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al crear la campaña";
    return apiError(400, "invalid", msg);
  }
});
