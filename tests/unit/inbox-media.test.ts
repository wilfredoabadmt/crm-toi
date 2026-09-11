import { describe, expect, it } from "vitest";
import { parseMediaContent, previewText } from "@/components/inbox/helpers";

describe("Gestión de Multimedia en Bandeja (inbox-media)", () => {
  it("parsea imágenes entrantes con etiqueta [MEDIA:id] y caption", () => {
    const raw = "[MEDIA:104857291823] aquí están los requisitos de instalación";
    const parsed = parseMediaContent("image", raw);

    expect(parsed.isMedia).toBe(true);
    expect(parsed.type).toBe("image");
    expect(parsed.url).toBe("/api/inbox/media?id=104857291823");
    expect(parsed.caption).toBe("aquí están los requisitos de instalación");
  });

  it("parsea imágenes entrantes con etiqueta [MEDIA:id] sin caption", () => {
    const raw = "[MEDIA:987654321]";
    const parsed = parseMediaContent("image", raw);

    expect(parsed.isMedia).toBe(true);
    expect(parsed.type).toBe("image");
    expect(parsed.url).toBe("/api/inbox/media?id=987654321");
    expect(parsed.caption).toBeNull();
  });

  it("parsea imágenes salientes generadas por el agente [IMAGEN: url] caption", () => {
    const raw = "[IMAGEN: https://r2.toi.bo/catalog.jpg]\nCatálogo de planes 2026";
    const parsed = parseMediaContent("image", raw);

    expect(parsed.isMedia).toBe(true);
    expect(parsed.type).toBe("image");
    expect(parsed.url).toBe("https://r2.toi.bo/catalog.jpg");
    expect(parsed.caption).toBe("Catálogo de planes 2026");
  });

  it("parsea documentos entrantes [DOC:id:filename] caption", () => {
    const raw = "[DOC:554433:factura_luz.pdf] Comprobante de luz";
    const parsed = parseMediaContent("document", raw);

    expect(parsed.isMedia).toBe(true);
    expect(parsed.type).toBe("document");
    expect(parsed.url).toBe("/api/inbox/media?id=554433");
    expect(parsed.filename).toBe("factura_luz.pdf");
    expect(parsed.caption).toBe("Comprobante de luz");
  });

  it("parsea notas de voz y audios [AUDIO:id]", () => {
    const raw = "[AUDIO:889900]";
    const parsed = parseMediaContent("audio", raw);

    expect(parsed.isMedia).toBe(true);
    expect(parsed.type).toBe("audio");
    expect(parsed.url).toBe("/api/inbox/media?id=889900");
  });

  it("genera previewText descriptivo para la lista de conversaciones", () => {
    expect(previewText("[MEDIA:123] Requisitos")).toBe("📷 Foto: Requisitos");
    expect(previewText("[MEDIA:123]")).toBe("📷 Foto");
    expect(previewText("[DOC:123:cedula.pdf]")).toBe("📄 cedula.pdf");
    expect(previewText("[AUDIO:123]")).toBe("🎵 Nota de voz");
    expect(previewText("Hola, buenas tardes")).toBe("Hola, buenas tardes");
  });
});
