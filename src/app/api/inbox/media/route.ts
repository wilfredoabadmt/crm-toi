import { withAuth, apiError } from "@/lib/api";
import { getCredentialsByOrg } from "@/server/whatsapp/credentials";
import { graphRequest } from "@/lib/meta/client";

export const dynamic = "force-dynamic";

/**
 * Proxy autenticado para servir archivos multimedia (imágenes, audios, documentos)
 * recibidos a través de la WhatsApp Cloud API de Meta.
 *
 * Endpoint: GET /api/inbox/media?id=<media_id>
 */
export const GET = withAuth(async (session, req: Request) => {
  const url = new URL(req.url);
  const mediaId = url.searchParams.get("id");

  if (!mediaId || !mediaId.trim()) {
    return apiError(400, "missing_id", "Falta el identificador del archivo multimedia.");
  }

  const creds = await getCredentialsByOrg(session.organizationId);
  if (!creds || !creds.token) {
    return apiError(403, "no_credentials", "No hay credenciales de WhatsApp activas para esta organización.");
  }

  try {
    // 1. Obtener la URL temporal del archivo desde la Graph API de Meta
    const metaMedia = await graphRequest<{
      url?: string;
      mime_type?: string;
      sha256?: string;
      file_size?: number;
    }>(mediaId.trim(), { token: creds.token });

    if (!metaMedia?.url) {
      return apiError(404, "media_not_found", "No se encontró el recurso multimedia en Meta.");
    }

    // 2. Descargar el binario desde los servidores de Meta (lookaside) usando el Bearer token
    const binaryRes = await fetch(metaMedia.url, {
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "User-Agent": "curl/8.0",
      },
    });

    if (!binaryRes.ok || !binaryRes.body) {
      return apiError(
        binaryRes.status,
        "download_failed",
        `Error al descargar el archivo desde los servidores de Meta (${binaryRes.status}).`
      );
    }

    const contentType =
      metaMedia.mime_type ||
      binaryRes.headers.get("content-type") ||
      "application/octet-stream";

    // 3. Devolver el stream al navegador con cabeceras de caché
    return new Response(binaryRes.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error(`[api/inbox/media] Error al procesar mediaId=${mediaId}:`, err);
    return apiError(500, "meta_media_error", "Error interno al obtener el archivo multimedia de Meta.");
  }
});
