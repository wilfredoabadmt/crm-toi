import { getLlmCredentials } from "@/server/ai/credentials";

/**
 * Transcribe un archivo de audio (OGG/Opus de WhatsApp u otro formato) a texto
 * utilizando el endpoint Whisper compatible (OpenAI, Groq o pasarelas afines).
 *
 * Devuelve el texto transcrito limpio, o `null` si no se pudo transcribir o si el audio no contenía voz.
 */
export async function transcribeAudio(input: {
  buffer: Buffer;
  mimeType?: string;
  filename?: string;
  organizationId: string;
}): Promise<string | null> {
  const { buffer, mimeType = "audio/ogg", filename = "audio.ogg", organizationId } = input;

  if (!buffer || buffer.length === 0) return null;

  try {
    const creds = await getLlmCredentials(organizationId);

    // Determinar endpoint y token para transcripción de audio
    let transcriptionUrl = "https://api.openai.com/v1/audio/transcriptions";
    let token: string | null = null;
    let model = "whisper-1";

    const baseClean = (creds.baseUrl || "").toLowerCase();

    if (baseClean.includes("groq.com") && creds.token) {
      transcriptionUrl = "https://api.groq.com/openai/v1/audio/transcriptions";
      token = creds.token;
      model = "whisper-large-v3";
    } else if (baseClean.includes("openai.com") && creds.token) {
      transcriptionUrl = "https://api.openai.com/v1/audio/transcriptions";
      token = creds.token;
      model = "whisper-1";
    } else if (process.env.GROQ_API_TOKEN) {
      // Fallback a Groq en env si existe
      transcriptionUrl = "https://api.groq.com/openai/v1/audio/transcriptions";
      token = process.env.GROQ_API_TOKEN;
      model = "whisper-large-v3";
    } else if (process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN) {
      // Fallback a OpenAI en env si existe
      transcriptionUrl = "https://api.openai.com/v1/audio/transcriptions";
      token = process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN || null;
      model = "whisper-1";
    } else if (creds.token && (baseClean.includes("openai") || baseClean.includes("openrouter"))) {
      // Intentar con las credenciales activas del proveedor
      token = creds.token;
      if (baseClean.includes("openrouter")) {
        transcriptionUrl = "https://openrouter.ai/api/v1/audio/transcriptions";
      }
    }

    if (!token) {
      // Si no hay token para audio disponible, retornar null pacíficamente
      return null;
    }

    // Preparar FormData
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    formData.append("file", blob, filename);
    formData.append("model", model);
    formData.append("language", "es"); // Español preferido para WhatsApp ISP
    formData.append("response_format", "json");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000); // 15s max

    const res = await fetch(transcriptionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.trim()}`,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[transcription] Proveedor respondió ${res.status}: ${errText.slice(0, 150)}`);
      return null;
    }

    const data = (await res.json()) as { text?: string };
    const text = data.text?.trim();

    if (!text || text.length === 0) return null;

    return text;
  } catch (err) {
    console.warn("[transcription] Error al transcribir audio:", err);
    return null;
  }
}
