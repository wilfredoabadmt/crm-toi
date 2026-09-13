import { dispatchDueCampaigns } from "@/server/campaigns/dispatch";
import { getSessionOrNull } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 1. Validar por secreto de Cron si está configurado en variables de entorno
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    const dispatched = await dispatchDueCampaigns();
    return Response.json({ ok: true, dispatched });
  }

  // 2. O validar por sesión de usuario autenticado
  const session = await getSessionOrNull();
  if (session) {
    const dispatched = await dispatchDueCampaigns();
    return Response.json({ ok: true, dispatched });
  }

  // Si no hay secreto configurado en dev, permitir ejecución local
  if (!cronSecret && process.env.NODE_ENV !== "production") {
    const dispatched = await dispatchDueCampaigns();
    return Response.json({ ok: true, dispatched });
  }

  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: Request) {
  return POST(req);
}
