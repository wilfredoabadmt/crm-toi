import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getR2Object } from "@/lib/storage/r2";

export const dynamic = "force-dynamic";

/**
 * Sirve directamente una imagen o archivo de Cloudflare R2 vía proxy HTTP.
 * Garantiza que la imagen sea públicamente accesible para la API de Meta WhatsApp y navegadores.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  let key = searchParams.get("key");
  let mimeType = "image/jpeg";

  if (id && !key) {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.agentMedia)
      .where(eq(schema.agentMedia.id, id))
      .limit(1);

    const item = rows[0];
    if (item) {
      mimeType = item.mimeType || "image/jpeg";
      const match = item.url.match(/agent-media\/.+$/);
      if (match) {
        key = match[0];
      }
    }
  }

  if (!key) {
    return new Response("Archivo no encontrado", { status: 404 });
  }

  try {
    const file = await getR2Object(key);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(file.body);
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": file.contentType || mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[api/agent/media/file] Error al servir objeto de R2:", err);
    return new Response("Error al obtener la imagen", { status: 500 });
  }
}
