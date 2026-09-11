/** Utilidades de presentación de la bandeja. */

export function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function formatRemaining(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const MEDIA_LABELS: Record<string, string> = {
  image: "Imagen",
  audio: "Audio",
  video: "Video",
  document: "Documento",
  sticker: "Sticker",
  location: "Ubicación",
  contacts: "Contacto compartido",
  template: "Plantilla",
};

export function mediaLabel(type: string): string {
  return MEDIA_LABELS[type] ?? "Contenido";
}

export interface ParsedMedia {
  isMedia: boolean;
  type: "image" | "document" | "audio" | "video" | "sticker" | "other";
  url: string | null;
  caption: string | null;
  filename?: string | null;
}

export function parseMediaContent(type: string, text: string | null): ParsedMedia {
  if (!text) {
    return {
      isMedia: type !== "text" && type !== "template",
      type: (type in MEDIA_LABELS ? type : "other") as ParsedMedia["type"],
      url: null,
      caption: null,
    };
  }

  // 1. [MEDIA:id] caption
  const mediaMatch = text.match(/^\[MEDIA:([^\]]+)\](?:\s*(.*))?$/s);
  if (mediaMatch) {
    return {
      isMedia: true,
      type: "image",
      url: `/api/inbox/media?id=${encodeURIComponent(mediaMatch[1]!)}`,
      caption: mediaMatch[2]?.trim() || null,
    };
  }

  // 2. [DOC:id:filename] caption
  const docMatch = text.match(/^\[DOC:([^:]+):([^\]]+)\](?:\s*(.*))?$/s);
  if (docMatch) {
    return {
      isMedia: true,
      type: "document",
      url: `/api/inbox/media?id=${encodeURIComponent(docMatch[1]!)}`,
      filename: docMatch[2]?.trim() || "documento",
      caption: docMatch[3]?.trim() || null,
    };
  }

  // 3. [AUDIO:id]
  const audioMatch = text.match(/^\[AUDIO:([^\]]+)\]/);
  if (audioMatch) {
    return {
      isMedia: true,
      type: "audio",
      url: `/api/inbox/media?id=${encodeURIComponent(audioMatch[1]!)}`,
      caption: null,
    };
  }

  // 4. [VIDEO:id] caption
  const videoMatch = text.match(/^\[VIDEO:([^\]]+)\](?:\s*(.*))?$/s);
  if (videoMatch) {
    return {
      isMedia: true,
      type: "video",
      url: `/api/inbox/media?id=${encodeURIComponent(videoMatch[1]!)}`,
      caption: videoMatch[2]?.trim() || null,
    };
  }

  // 5. [IMAGEN: url] caption
  const imgMatch = text.match(/^\[IMAGEN:\s*([^\]]+)\](?:\s*(.*))?$/s);
  if (imgMatch) {
    return {
      isMedia: true,
      type: "image",
      url: imgMatch[1]!.trim(),
      caption: imgMatch[2]?.trim() || null,
    };
  }

  // 6. URL directa si type es image
  if (type === "image") {
    const urlMatch = text.match(/^(https?:\/\/[^\s]+)(?:\s+(.*))?$/s);
    if (urlMatch) {
      return {
        isMedia: true,
        type: "image",
        url: urlMatch[1]!.trim(),
        caption: urlMatch[2]?.trim() || null,
      };
    }
  }

  return {
    isMedia: type !== "text" && type !== "template",
    type: (type in MEDIA_LABELS ? type : "other") as ParsedMedia["type"],
    url: null,
    caption: text,
  };
}

export function previewText(preview: string | null): string {
  if (!preview) return "";
  if (preview.startsWith("[MEDIA:")) {
    const caption = preview.replace(/^\[MEDIA:[^\]]+\]\s*/, "").trim();
    return caption ? `📷 Foto: ${caption}` : "📷 Foto";
  }
  if (preview.startsWith("[DOC:")) {
    const match = preview.match(/^\[DOC:[^:]+:([^\]]+)\]/);
    return `📄 ${match?.[1] ?? "Documento"}`;
  }
  if (preview.startsWith("[AUDIO:")) return "🎵 Nota de voz";
  if (preview.startsWith("[VIDEO:")) return "🎥 Video";
  if (preview.startsWith("[IMAGEN:")) return "📷 Imagen enviada";
  return MEDIA_LABELS[preview] ? `📎 ${MEDIA_LABELS[preview]}` : preview;
}
