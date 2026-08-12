import { NextResponse } from "next/server";
import { withAuth, apiError } from "@/lib/api";
import { bulkUpsertCajasNap } from "@/server/coverage/naps";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

/**
 * POST /api/coverage/naps/import
 * Carga masiva de Cajas NAP desde archivo Excel (.xlsx o .xls).
 */
export const POST = withAuth(async (session, req: Request) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return apiError(400, "bad_request", "Debes adjuntar un archivo Excel en el campo 'file'.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return apiError(400, "bad_request", "El archivo Excel está vacío o no contiene hojas válidas.");
    }

    const sheet = workbook.Sheets[sheetName]!;

    // Obtener la matriz de filas de la hoja sin asumir que la fila 1 es el encabezado
    const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });

    if (matrix.length === 0) {
      return apiError(400, "bad_request", "No se encontraron filas de datos en la hoja del Excel.");
    }

    // Buscar la fila que contiene los encabezados reales
    let headerRowIndex = -1;
    let napCol = -1;
    let puertosCol = -1;
    let ubicacionCol = -1;
    let latCol = -1;
    let lngCol = -1;
    let redCol = -1;

    for (let r = 0; r < Math.min(matrix.length, 15); r++) {
      const row = matrix[r] || [];
      const rowTexts = row.map((cell: any) => String(cell).trim().toUpperCase());

      // Verificar si esta fila tiene palabras clave de encabezados
      const matchesKeywords = rowTexts.some((t: string) =>
        t.includes("NAP") || t.includes("RED") || t.includes("LATITUD") || t.includes("UBICAC") || t.includes("PUERTO")
      );

      if (matchesKeywords) {
        headerRowIndex = r;
        rowTexts.forEach((text: string, c: number) => {
          if (/NAP|CÓDIGO|CODIGO|CAJA/i.test(text) && napCol === -1) napCol = c;
          else if (/TIPO|PUERTO|CANTIDAD/i.test(text) && puertosCol === -1) puertosCol = c;
          else if (/UBICAC|COORDENADA/i.test(text) && ubicacionCol === -1) ubicacionCol = c;
          else if (/LATITUD|LAT/i.test(text) && latCol === -1) latCol = c;
          else if (/LONGITUD|LNG|LON/i.test(text) && lngCol === -1) lngCol = c;
          else if (/RED|ZONA|SECTOR/i.test(text) && redCol === -1) redCol = c;
        });

        if (napCol !== -1 || latCol !== -1 || ubicacionCol !== -1) {
          break;
        }
      }
    }

    // Fallback: Si no se detectó encabezado textual, usar la primera fila y asignar por índice posicional
    if (headerRowIndex === -1) {
      headerRowIndex = 0;
      napCol = 0;
      puertosCol = 1;
      ubicacionCol = 2;
      latCol = 3;
      lngCol = 4;
      redCol = 5;
    }

    const parsedRows: Array<{
      napCode: string;
      puertos: string;
      ubicacionRaw?: string;
      latitud: number;
      longitud: number;
      red: string;
    }> = [];

    // Parsear todas las filas posteriores a los encabezados
    for (let r = headerRowIndex + 1; r < matrix.length; r++) {
      const row = matrix[r] || [];

      const rawNap = napCol !== -1 && row[napCol] !== undefined ? String(row[napCol]).trim() : "";
      const rawPuertos = puertosCol !== -1 && row[puertosCol] !== undefined ? String(row[puertosCol]).trim() : "x16";
      const rawUbicacion = ubicacionCol !== -1 && row[ubicacionCol] !== undefined ? String(row[ubicacionCol]).trim() : "";
      const rawLat = latCol !== -1 && row[latCol] !== undefined ? String(row[latCol]).trim() : "";
      const rawLng = lngCol !== -1 && row[lngCol] !== undefined ? String(row[lngCol]).trim() : "";
      const rawRed = redCol !== -1 && row[redCol] !== undefined ? String(row[redCol]).trim() : "GENERAL";

      if (!rawNap) continue; // Omitir filas sin código de NAP

      let lat = parseFloat(rawLat.replace(",", "."));
      let lng = parseFloat(rawLng.replace(",", "."));

      // Si lat/lng están en la columna de Ubicación Raw (ej: "-16.49787, -68.25956")
      if ((isNaN(lat) || isNaN(lng)) && rawUbicacion) {
        const match = rawUbicacion.match(/(-?\d+[\.,]\d+)\s*,\s*(-?\d+[\.,]\d+)/);
        if (match && match[1] && match[2]) {
          lat = parseFloat(match[1].replace(",", "."));
          lng = parseFloat(match[2].replace(",", "."));
        }
      }

      if (isNaN(lat) || isNaN(lng)) {
        continue;
      }

      parsedRows.push({
        napCode: rawNap,
        puertos: rawPuertos || "x16",
        ubicacionRaw: rawUbicacion || `${lat}, ${lng}`,
        latitud: lat,
        longitud: lng,
        red: rawRed.toUpperCase() || "GENERAL",
      });
    }

    if (parsedRows.length === 0) {
      return apiError(
        400,
        "bad_request",
        "No se pudieron extraer Cajas NAP válidas del Excel. Verifica los encabezados (NAP, TIPO, UBICACIÓN, LATITUD, LONGITUD, RED)."
      );
    }

    const summary = await bulkUpsertCajasNap(session.organizationId, parsedRows);

    return NextResponse.json({
      ok: true,
      message: `Carga masiva completada: ${summary.created} creadas, ${summary.updated} actualizadas.`,
      total: parsedRows.length,
      ...summary,
    });
  } catch (err: any) {
    console.error("[api/coverage/naps/import] Error al importar Excel:", err);
    return apiError(500, "server_error", `Error al procesar el archivo Excel: ${err.message || err}`);
  }
});
