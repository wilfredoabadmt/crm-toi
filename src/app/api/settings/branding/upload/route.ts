import { NextResponse } from "next/server";
import { withAuth, apiError } from "@/lib/api";
import { uploadToR2 } from "@/lib/storage/r2";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (session, req: Request) => {
  if (session.role !== "owner") {
    return apiError(403, "forbidden", "Solo el propietario puede subir el logo de la marca");
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return apiError(400, "bad_request", "Debes seleccionar una imagen para el logo");
    }

    const mimeType = file.type || "image/png";
    if (!mimeType.startsWith("image/")) {
      return apiError(400, "bad_request", "El archivo debe ser una imagen válida (PNG, JPG, WEBP, SVG)");
    }

    // Límite de tamaño: 2MB para logos
    if (file.size > 2 * 1024 * 1024) {
      return apiError(400, "bad_request", "El logo no debe exceder los 2MB de peso");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const publicUrl = await uploadToR2({
      file: buffer,
      filename: `branding/${session.organizationId}_logo_${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`,
      mimeType,
      folder: "branding",
    });

    return NextResponse.json({
      ok: true,
      url: publicUrl,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al subir el logo";
    return apiError(500, "internal_error", msg);
  }
});
