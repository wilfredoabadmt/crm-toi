import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { isAiConfigured } from "@/lib/env";
import { getLlmCredentials, saveLlmCredentials } from "@/server/ai/credentials";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.agentProfile)
    .where(scoped(schema.agentProfile.organizationId, session.organizationId))
    .limit(1);
  const p = rows[0];
  if (!p) return apiError(404, "not_found", "Perfil del agente no encontrado");

  const llmCreds = await getLlmCredentials(session.organizationId);

  return Response.json({
    profile: {
      enabled: p.enabled,
      name: p.name,
      tone: p.tone,
      instructions: p.instructions,
      escalationRules: p.escalationRules,
      greeting: p.greeting,
    },
    llmConfig: {
      baseUrl: llmCreds.baseUrl,
      model: llmCreds.model,
      tokenLast4: llmCreds.tokenLast4,
      isCustom: llmCreds.isCustom,
      configured: Boolean(llmCreds.token),
    },
    aiConfigured: Boolean(llmCreds.token) || isAiConfigured(),
  });
});

const putSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().trim().min(1).max(60).optional(),
  tone: z.string().max(500).nullable().optional(),
  instructions: z.string().max(8000).nullable().optional(),
  escalationRules: z.string().max(4000).nullable().optional(),
  greeting: z.string().max(1000).nullable().optional(),
  // Campos de LLM (solo modificables si se envían)
  llmBaseUrl: z.string().url().optional(),
  llmModel: z.string().min(1).optional(),
  llmToken: z.string().optional(),
});

export const PUT = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, putSchema);
  if (!body.ok) return body.response;

  const { llmBaseUrl, llmModel, llmToken, ...profileFields } = body.data;

  // Si se envían cambios de LLM, verificar rol de owner
  if (llmBaseUrl !== undefined || llmModel !== undefined || llmToken !== undefined) {
    if (session.role !== "owner") {
      return apiError(403, "forbidden", "Solo el propietario puede modificar las credenciales del LLM");
    }
    await saveLlmCredentials(session.organizationId, {
      baseUrl: llmBaseUrl,
      model: llmModel,
      token: llmToken,
    });
  }

  if (Object.keys(profileFields).length > 0) {
    const db = getDb();
    const updated = await db
      .update(schema.agentProfile)
      .set({ ...profileFields, updatedAt: new Date() })
      .where(scoped(schema.agentProfile.organizationId, session.organizationId))
      .returning();
    if (!updated[0]) return apiError(404, "not_found", "Perfil no encontrado");
  }

  return Response.json({ ok: true });
});
