import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getEnv } from "@/lib/env";
import { syncEnvFile } from "@/server/ai/env-sync";

export type ResolvedLlmCredentials = {
  baseUrl: string;
  model: string;
  token: string | null;
  isCustom: boolean;
  tokenLast4: string | null;
};

/**
 * Obtiene las credenciales activas del LLM para la organización.
 * Prioriza las credenciales guardadas y cifradas en la BD.
 * Si no hay credenciales en BD, recurre a las variables de entorno globales.
 */
export async function getLlmCredentials(
  organizationId: string
): Promise<ResolvedLlmCredentials> {
  const db = getDb();
  const rows = await db
    .select({
      llmBaseUrl: schema.agentProfile.llmBaseUrl,
      llmModel: schema.agentProfile.llmModel,
      llmTokenCipher: schema.agentProfile.llmTokenCipher,
      llmTokenIv: schema.agentProfile.llmTokenIv,
      llmTokenTag: schema.agentProfile.llmTokenTag,
    })
    .from(schema.agentProfile)
    .where(scoped(schema.agentProfile.organizationId, organizationId))
    .limit(1);

  const profile = rows[0];

  // Si tiene token cifrado en BD
  if (
    profile?.llmTokenCipher &&
    profile?.llmTokenIv &&
    profile?.llmTokenTag
  ) {
    try {
      const decryptedToken = decryptSecret({
        cipher: profile.llmTokenCipher,
        iv: profile.llmTokenIv,
        tag: profile.llmTokenTag,
      });

      const baseUrl =
        profile.llmBaseUrl?.trim() ||
        process.env.OPENROUTER_BASE_URL ||
        "https://openrouter.ai/api";

      const model =
        profile.llmModel?.trim() ||
        process.env.OPENROUTER_MODEL ||
        "openai/gpt-4o-mini";

      return {
        baseUrl,
        model,
        token: decryptedToken,
        isCustom: true,
        tokenLast4: decryptedToken.slice(-4),
      };
    } catch (err) {
      console.error("[llm-credentials] error descifrando token en BD:", err);
    }
  }

  // Fallback al entorno del sistema
  const env = getEnv();
  const token = env.OPENROUTER_API_TOKEN || process.env.OPENROUTER_API_TOKEN || null;
  const baseUrl = env.OPENROUTER_BASE_URL || process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api";
  const model = env.OPENROUTER_MODEL || process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  return {
    baseUrl,
    model,
    token: token && token.trim().length > 0 ? token.trim() : null,
    isCustom: false,
    tokenLast4: token ? token.slice(-4) : null,
  };
}

/**
 * Guarda y cifra las credenciales de LLM en la base de datos de la organización,
 * actualiza las variables en la memoria del proceso en caliente (process.env)
 * y actualiza el archivo .env físico en disco.
 */
export async function saveLlmCredentials(
  organizationId: string,
  input: {
    baseUrl?: string | null;
    model?: string | null;
    token?: string | null;
  }
): Promise<void> {
  const db = getDb();
  const trimmedToken = input.token?.trim() || null;
  const trimmedBaseUrl = input.baseUrl?.trim() || "https://openrouter.ai/api";
  const trimmedModel = input.model?.trim() || "openai/gpt-4o-mini";

  let encFields = {
    llmTokenCipher: null as string | null,
    llmTokenIv: null as string | null,
    llmTokenTag: null as string | null,
  };

  if (trimmedToken) {
    const enc = encryptSecret(trimmedToken);
    encFields = {
      llmTokenCipher: enc.cipher,
      llmTokenIv: enc.iv,
      llmTokenTag: enc.tag,
    };
  }

  // 1. Guardar en Base de Datos
  await db
    .update(schema.agentProfile)
    .set({
      llmBaseUrl: trimmedBaseUrl,
      llmModel: trimmedModel,
      ...encFields,
      updatedAt: new Date(),
    })
    .where(scoped(schema.agentProfile.organizationId, organizationId));

  // 2. Actualizar variables de entorno en memoria para efecto instantáneo
  if (trimmedToken) {
    process.env.OPENROUTER_API_TOKEN = trimmedToken;
  }
  process.env.OPENROUTER_BASE_URL = trimmedBaseUrl;
  process.env.OPENROUTER_MODEL = trimmedModel;

  // 3. Sincronizar archivo .env en disco
  await syncEnvFile({
    token: trimmedToken,
    baseUrl: trimmedBaseUrl,
    model: trimmedModel,
  });
}
