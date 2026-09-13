import { NextResponse } from "next/server";
import { withAuth, apiError } from "@/lib/api";
import { uploadToR2 } from "@/lib/storage/r2";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (session, req: Request) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return apiError(400, "bad_request", "Debes seleccionar un archivo para subir.");
    }

    const mimeType = file.type || "application/octet-stream";
    let mediaType: "image" | "video" | "document" = "document";

    if (mimeType.startsWith("image/")) {
      mediaType = "image";
    } else if (mimeType.startsWith("video/")) {
      mediaType = "video";
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir a Cloudflare R2
    const publicUrl = await uploadToR2({
      file: buffer,
      filename: `campaigns/${Date.now()}_${file.name || "media"}`,
      mimeType,
    });

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      mediaType,
      filename: file.name,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al subir archivo a R2";
    return apiError(500, "internal_error", msg);
  }
});
