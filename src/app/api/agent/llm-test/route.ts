import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

const testSchema = z.object({
  baseUrl: z.string().url("URL de endpoint inválida").default("https://openrouter.ai/api"),
  model: z.string().min(1, "El modelo es obligatorio"),
  token: z.string().min(1, "El token de API es obligatorio"),
});

export const POST = withAuth(async (session, req: Request) => {
  if (session.role !== "owner") {
    return apiError(403, "forbidden", "Solo el propietario puede probar credenciales del LLM");
  }

  const body = await parseBody(req, testSchema);
  if (!body.ok) return body.response;

  const { baseUrl, model, token } = body.data;
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000); // 12s timeout

  try {
    const res = await fetch(`${cleanBaseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.trim(),
        messages: [
          { role: "system", content: "You are a test helper. Reply only with JSON: {\"status\": \"ok\"}" },
          { role: "user", content: "ping" },
        ],
        max_tokens: 20,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      let parsedMessage = errText;
      try {
        const errJson = JSON.parse(errText);
        parsedMessage = errJson.error?.message || errJson.message || errText;
      } catch {
        // mantener errText original
      }
      return apiError(400, "provider_error", `El proveedor respondió con error (${res.status}): ${parsedMessage.slice(0, 200)}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;

    if (!content) {
      return apiError(422, "empty_response", "El modelo respondió con éxito pero el contenido del mensaje llegó vacío.");
    }

    return Response.json({
      ok: true,
      latencyMs,
      message: `Conexión exitosa con ${model} (${latencyMs}ms)`,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : "Error al conectar con el proveedor de IA";
    if (msg.includes("aborted")) {
      return apiError(408, "timeout", "La solicitud superó el tiempo límite (12s). Verifica la URL del endpoint.");
    }
    return apiError(500, "network_error", msg);
  }
});
