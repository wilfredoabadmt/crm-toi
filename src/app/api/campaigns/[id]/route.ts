import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  approveCampaign,
  cancelCampaign,
  getCampaignById,
} from "@/server/campaigns/campaigns";
import { executeCampaign } from "@/server/campaigns/dispatch";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session, req: Request, context?: { params: Promise<{ id: string }> }) => {
  const params = await context?.params;
  const campaignId = params?.id;
  if (!campaignId) return apiError(400, "invalid", "ID de campaña no provisto");

  const campaign = await getCampaignById(session.organizationId, campaignId);
  if (!campaign) return apiError(404, "not_found", "Campaña no encontrada");

  return Response.json({ campaign });
});

const actionSchema = z.object({
  action: z.enum(["approve", "cancel", "execute_now"]),
});

export const POST = withAuth(async (session, req: Request, context?: { params: Promise<{ id: string }> }) => {
  const params = await context?.params;
  const campaignId = params?.id;
  if (!campaignId) return apiError(400, "invalid", "ID de campaña no provisto");

  const body = await parseBody(req, actionSchema);
  if (!body.ok) return body.response;

  try {
    if (body.data.action === "approve") {
      if (session.role !== "owner") {
        return apiError(403, "forbidden", "Solo el propietario puede aprobar campañas");
      }
      const updated = await approveCampaign(session.organizationId, campaignId, session.userId);
      return Response.json({ ok: true, campaign: updated });
    }

    if (body.data.action === "cancel") {
      const updated = await cancelCampaign(session.organizationId, campaignId);
      return Response.json({ ok: true, campaign: updated });
    }

    if (body.data.action === "execute_now") {
      if (session.role !== "owner") {
        return apiError(403, "forbidden", "Solo el propietario puede forzar el despacho inmediato");
      }
      void executeCampaign(campaignId).catch((err) => {
        console.error(`[campaigns] Error en execute_now para ${campaignId}:`, err);
      });
      return Response.json({ ok: true, message: "Despacho iniciado en segundo plano" });
    }

    return apiError(400, "invalid", "Acción no soportada");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error procesando acción de campaña";
    return apiError(400, "invalid", msg);
  }
});
