"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Paperclip,
  Sparkles,
  X,
} from "lucide-react";
import type { MessageDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { mediaLabel, parseMediaContent } from "./helpers";

function StatusTicks({ status }: { status: MessageDto["status"] }) {
  const cls = "h-[13px] w-[13px]";
  if (status === "pending") return <Clock3 className={cn(cls, "text-text-4")} strokeWidth={1.7} />;
  if (status === "sent") return <Check className={cn(cls, "text-text-4")} strokeWidth={1.7} />;
  if (status === "delivered")
    return <CheckCheck className={cn(cls, "text-text-4")} strokeWidth={1.7} />;
  if (status === "read")
    return <CheckCheck className={cn(cls, "text-brand")} strokeWidth={1.7} />;
  return <AlertTriangle className={cn(cls, "text-destructive")} strokeWidth={1.7} />;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
}

function bubbleTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function MessageThread({ messages }: { messages: MessageDto[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Cierra el lightbox con tecla Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxUrl(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-[3px] overflow-y-auto bg-chat px-[6%] py-5"
      >
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const newDay =
            !prev ||
            new Date(prev.createdAt).toDateString() !==
              new Date(m.createdAt).toDateString();
          const grouped =
            !newDay && prev !== undefined && prev.direction === m.direction;
          const out = m.direction === "out";
          const media = parseMediaContent(m.type, m.text);

          return (
            <div key={m.id}>
              {newDay && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full border bg-background px-3 py-1 text-[11.5px] font-semibold text-text-2 shadow-sm">
                    {dayLabel(m.createdAt)}
                  </span>
                </div>
              )}
              <div
                className={cn(
                  "flex",
                  out ? "justify-end" : "justify-start",
                  grouped ? "mt-[3px]" : "mt-2.5"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] sm:max-w-[64%] rounded-lg px-3 pb-1.5 pt-2 text-sm leading-[1.45] shadow-sm",
                    out
                      ? "border border-brand-soft bg-bubble-out text-bubble-out-text"
                      : "bg-background",
                    !grouped && (out ? "rounded-tr-[5px]" : "rounded-tl-[5px]")
                  )}
                >
                  {/* Contenido del mensaje según su tipo */}
                  {media.isMedia && media.url && media.type === "image" ? (
                    <div className="space-y-1.5">
                      <div
                        className="group relative cursor-pointer overflow-hidden rounded-md border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5"
                        onClick={() => setLightboxUrl(media.url)}
                        title="Clic para ver en grande"
                      >
                        <img
                          src={media.url}
                          alt={media.caption || "Imagen de WhatsApp"}
                          className="max-h-72 w-full object-cover transition duration-150 group-hover:opacity-90"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                          <span className="rounded-full bg-black/65 p-2 text-white shadow-md">
                            <ExternalLink className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                      {media.caption && (
                        <p className="whitespace-pre-wrap break-words text-sm pt-0.5">
                          {media.caption}
                        </p>
                      )}
                    </div>
                  ) : media.isMedia && media.url && media.type === "document" ? (
                    <a
                      href={media.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 rounded-md border border-border bg-muted/50 p-2 transition hover:bg-muted text-foreground"
                    >
                      <FileText className="h-5 w-5 text-brand shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">
                          {media.filename || "Documento adjunto"}
                        </p>
                        {media.caption && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {media.caption}
                          </p>
                        )}
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </a>
                  ) : media.isMedia && media.url && media.type === "audio" ? (
                    <div className="py-1">
                      <audio controls className="h-8 max-w-[240px]">
                        <source src={media.url} />
                        Tu navegador no soporta audio.
                      </audio>
                    </div>
                  ) : m.type === "text" || m.type === "template" ? (
                    <span className="whitespace-pre-wrap break-words">
                      {m.text}
                    </span>
                  ) : (
                    /* Fallback para archivos sin URL o tipos legacy */
                    <span className="inline-flex items-center gap-1.5 text-text-3">
                      <Paperclip className="h-3.5 w-3.5" strokeWidth={1.7} />
                      {mediaLabel(m.type)}
                      {m.text ? ` — ${m.text}` : ""}
                    </span>
                  )}

                  {/* Metadatos (hora, IA, ticks) */}
                  <span className="float-right ml-2 mt-1 flex items-center gap-1">
                    {m.aiGenerated && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] font-medium text-brand"
                        title="Respuesta generada por IA"
                      >
                        <Sparkles className="h-3 w-3" strokeWidth={1.7} /> IA
                      </span>
                    )}
                    <span className="text-[10.5px] text-text-4">
                      {bubbleTime(m.createdAt)}
                    </span>
                    {out && <StatusTicks status={m.status} />}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox / Modal para ver imagen en tamaño completo */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative flex max-h-[92vh] max-w-[92vw] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barra superior de controles */}
            <div className="mb-2 flex w-full justify-end gap-2">
              <a
                href={lightboxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-xs text-white hover:bg-white/20 transition"
                title="Abrir en pestaña nueva"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Pestaña nueva
              </a>
              <a
                href={lightboxUrl}
                download
                className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-xs text-white hover:bg-white/20 transition"
                title="Descargar imagen"
              >
                <Download className="h-3.5 w-3.5" /> Descargar
              </a>
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                className="rounded-md bg-white/10 p-1 text-white hover:bg-white/20 transition"
                title="Cerrar (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Imagen ampliada */}
            <img
              src={lightboxUrl}
              alt="Vista ampliada"
              className="max-h-[82vh] max-w-full rounded-md object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
