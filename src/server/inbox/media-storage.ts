import { graphRequest } from "@/lib/meta/client";
import { isR2Configured, uploadToR2 } from "@/lib/storage/r2";

const MIME_EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "audio/ogg": ".ogg",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/aac": ".aac",
  "video/mp4": ".mp4",
  "application/pdf": ".pdf",
};

/**
 * Descarga un archivo multimedia desde Meta WhatsApp Cloud API y lo almacena
 * de forma permanente en Cloudflare R2 para que nunca caduque.
 *
 * Si R2 no está configurado o falla la descarga, retorna `null` para que el sistema
 * use el proxy directo como fallback sin romper la ejecución.
 */
export async function persistMetaMediaToR2(input: {
  mediaId: string;
  token: string;
  fallbackFilename?: string;
}): Promise<string | null> {
  const { mediaId, token, fallbackFilename } = input;

  if (!mediaId || !token || !isR2Configured()) {
    return null;
  }

  try {
    // 1. Obtener la URL temporal del archivo desde Meta Graph API
    const metaMedia = await graphRequest<{
      url?: string;
      mime_type?: string;
      sha256?: string;
      file_size?: number;
    }>(mediaId.trim(), { token });

    if (!metaMedia?.url) {
      console.warn(`[media-storage] No se obtuvo URL temporal para mediaId=${mediaId}`);
      return null;
    }

    // 2. Descargar el binario desde Meta
    const binaryRes = await fetch(metaMedia.url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "curl/8.0",
      },
    });

    if (!binaryRes.ok) {
      console.warn(
        `[media-storage] Error al descargar de Meta (${binaryRes.status}) para mediaId=${mediaId}`
      );
      return null;
    }

    const arrayBuffer = await binaryRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = metaMedia.mime_type || binaryRes.headers.get("content-type") || "application/octet-stream";
    const ext = MIME_EXT_MAP[mimeType] || "";

    const filename = fallbackFilename
      ? fallbackFilename.replace(/[^a-zA-Z0-9_.-]/g, "_")
      : `${mediaId}${ext || ".bin"}`;

    // 3. Subir de forma permanente a Cloudflare R2
    const publicUrl = await uploadToR2({
      file: buffer,
      filename,
      mimeType,
      exactKey: `inbox-media/${mediaId}${ext}`,
    });

    return publicUrl;
  } catch (err) {
    console.warn(`[media-storage] No se pudo persistir mediaId=${mediaId} en R2 (se usará fallback):`, err);
    return null;
  }
}
