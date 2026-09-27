import type { z } from "zod";
import { getEnv, isAiConfigured } from "@/lib/env";

/**
 * Adaptador LLM OpenRouter-compatible — ÚNICA frontera con el proveedor de IA
 * (Constitución II). Regla operativa: la salida del modelo es impredecible;
 * todo consumo pasa por extracción robusta + Zod + reintentos, y un hipo del
 * proveedor jamás propaga excepción (resultado `error` tipado).
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatJsonResult<T> =
  | { ok: true; data: T; raw: string }
  | { ok: false; error: "not_configured" | "provider_error" | "invalid_output"; detail: string };

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

export async function chatJson<T>(
  schema: z.ZodType<T>,
  messages: ChatMessage[],
  opts?: {
    model?: string;
    judge?: boolean;
    timeoutMs?: number;
    baseUrl?: string;
    token?: string;
  }
): Promise<ChatJsonResult<T>> {
  const env = getEnv();
  const token = opts?.token ?? process.env.OPENROUTER_API_TOKEN ?? env.OPENROUTER_API_TOKEN;
  if (!token?.trim()) {
    return {
      ok: false,
      error: "not_configured",
      detail: "Sin API Token configurado para el proveedor de IA",
    };
  }

  const baseUrl = (opts?.baseUrl ?? process.env.OPENROUTER_BASE_URL ?? env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api").replace(/\/+$/, "");

  const model =
    opts?.model ??
    process.env.OPENROUTER_MODEL ??
    (opts?.judge
      ? (env.OPENROUTER_JUDGE_MODEL ?? env.OPENROUTER_MODEL)
      : env.OPENROUTER_MODEL);
  if (!model?.trim()) {
    return {
      ok: false,
      error: "not_configured",
      detail: "Sin modelo de IA configurado",
    };
  }

  let lastDetail = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const attemptMessages: ChatMessage[] =
      attempt === 1
        ? messages
        : [
            ...messages,
            {
              role: "system",
              content:
                "STRICT: tu respuesta anterior no fue JSON válido según el esquema. Responde ÚNICAMENTE el objeto JSON, sin explicaciones ni markdown.",
            },
          ];
    try {
      const raw = await callProvider({
        baseUrl,
        model,
        token,
        messages: attemptMessages,
        timeoutMs: opts?.timeoutMs,
      });
      const extracted = extractJson(raw);
      if (extracted === null) {
        lastDetail = `sin JSON extraíble (raw=${truncate(raw)})`;
        continue;
      }
      const parsed = schema.safeParse(extracted);
      if (!parsed.success) {
        lastDetail = `no cumple el esquema: ${parsed.error.issues
          .map((i) => i.path.join(".") + " " + i.message)
          .join("; ")} (raw=${truncate(raw)})`;
        continue;
      }
      return { ok: true, data: parsed.data, raw };
    } catch (err) {
      lastDetail = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  return {
    ok: false,
    error: lastDetail.includes("esquema") || lastDetail.includes("JSON")
      ? "invalid_output"
      : "provider_error",
    detail: lastDetail,
  };
}

async function callProvider(input: {
  baseUrl: string;
  model: string;
  token: string;
  messages: ChatMessage[];
  timeoutMs?: number;
}): Promise<string> {
  const { baseUrl, model, token, messages, timeoutMs = 60_000 } = input;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const cleanBase = baseUrl.trim().replace(/\/+$/, "");
  const isAnthropic = cleanBase.includes("anthropic.com") || token.trim().startsWith("sk-ant-");

  try {
    if (isAnthropic) {
      // Formato oficial Anthropic Messages API
      const endpoint = cleanBase.endsWith("/v1")
        ? `${cleanBase}/messages`
        : `${cleanBase}/v1/messages`;

      const systemMsg = messages
        .filter((m) => m.role === "system")
        .map((m) => m.content)
        .join("\n\n");

      const conversationMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }));

      // Si no quedaron mensajes de conversación, enviar un placeholder
      if (conversationMessages.length === 0) {
        conversationMessages.push({ role: "user", content: "Genera la respuesta solicitada." });
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-api-key": token.trim(),
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model.trim(),
          system: systemMsg || undefined,
          messages: conversationMessages,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`proveedor Anthropic respondió ${res.status}: ${truncate(text)}`);
      }

      const json = (await res.json()) as {
        content?: { type: string; text?: string }[];
      };
      const textBlock = json.content?.find((c) => c.type === "text")?.text;
      if (typeof textBlock !== "string" || textBlock.length === 0) {
        throw new Error("respuesta de Anthropic sin contenido de texto");
      }
      return textBlock;
    }

    // Formato estándar compatible OpenAI (OpenAI, DeepSeek, Groq, xAI, OpenRouter, Custom, etc.)
    const endpoint = cleanBase.endsWith("/v1")
      ? `${cleanBase}/chat/completions`
      : `${cleanBase}/v1/chat/completions`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        // El token jamás se loguea; solo viaja en este header.
        Authorization: `Bearer ${token.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: model.trim(), messages }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`proveedor respondió ${res.status}: ${truncate(text)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new Error("respuesta del proveedor sin contenido");
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extracción robusta de JSON de una respuesta de modelo:
 * 1) bloque ```json ... ``` (o ``` ... ```), 2) el texto completo,
 * 3) del primer `{` al último `}`.
 */
export function extractJson(raw: string): unknown | null {
  const candidates: string[] = [];
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) candidates.push(fence[1].trim());
  candidates.push(raw.trim());
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first !== -1 && last > first) {
    candidates.push(raw.slice(first, last + 1));
  }
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      // siguiente candidato
    }
  }
  return null;
}

function truncate(s: string, n = 300): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
