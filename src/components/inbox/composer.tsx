"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3, Send, Zap } from "lucide-react";
import type { ConversationDto, TemplateDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatRemaining } from "./helpers";
import { TemplateSender } from "./template-sender";

interface QuickReplyOption {
  id: string;
  shortcut: string;
  title: string;
  message: string;
}

export function Composer({
  conversation,
  onSend,
  onSent,
}: {
  conversation: ConversationDto;
  onSend: (text: string) => Promise<string | null>;
  onSent: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReplyOption[]>([]);
  const [showQrPopup, setShowQrPopup] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/templates").then((r) => (r.ok ? r.json() : { templates: [] })),
      fetch("/api/quick-replies").then((r) => (r.ok ? r.json() : { quickReplies: [] })),
    ])
      .then(([tplData, qrData]) => {
        if (!cancelled) {
          setTemplates(
            (tplData.templates ?? []).filter((t: any) => t.status === "approved")
          );
          setQuickReplies(qrData.quickReplies ?? []);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function autogrow() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  async function submit() {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setError(null);
    const err = await onSend(value);
    setSending(false);
    if (err) {
      setError(err);
      return;
    }
    setText("");
    if (taRef.current) taRef.current.style.height = "auto";
  }

  if (!conversation.windowOpen) {
    return (
      <div className="border-t bg-background px-[18px] py-3.5">
        <div className="mb-3 flex items-start gap-2 rounded-md border border-[#ece2cf] bg-[#faf7f0] p-3 text-sm text-[#8a6d3b]">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.7} />
          <div>
            <p className="font-medium">La ventana de 24 horas está cerrada.</p>
            <p className="opacity-80">
              WhatsApp solo permite texto libre dentro de las 24 horas
              siguientes al último mensaje del cliente. Para retomar la
              conversación, envía una plantilla aprobada.
            </p>
          </div>
        </div>
        <TemplateSender conversationId={conversation.id} onSent={onSent} />
      </div>
    );
  }

  // Filtro de atajos rápidos si el usuario escribe / o abre el menú
  const query = text.startsWith("/") ? text.slice(1).toLowerCase() : "";
  const filteredQr = showQrPopup || text.startsWith("/")
    ? quickReplies.filter((qr) =>
        qr.shortcut.toLowerCase().includes(query) ||
        qr.title.toLowerCase().includes(query)
      )
    : [];

  function selectQuickReply(qr: QuickReplyOption) {
    const firstName = conversation.contact.name.split(" ")[0] ?? "";
    const replaced = qr.message.replace(/\{\{\s*1\s*\}\}/g, firstName);
    setText(replaced);
    setShowQrPopup(false);
    taRef.current?.focus();
    setTimeout(autogrow, 0);
  }

  return (
    <div className="relative border-t bg-background px-[18px] pb-3.5 pt-3">
      {/* Popover flotante de Respuestas Rápidas */}
      {(showQrPopup || (text.startsWith("/") && filteredQr.length > 0)) && (
        <div className="absolute bottom-full left-4 mb-2 w-80 max-h-60 overflow-y-auto rounded-xl border bg-card p-2 shadow-xl z-20 space-y-1">
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-muted-foreground border-b mb-1">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" /> Respuestas Rápidas
            </span>
            <button
              onClick={() => setShowQrPopup(false)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              ×
            </button>
          </div>
          {filteredQr.length === 0 ? (
            <p className="p-2 text-center text-xs text-muted-foreground">
              Sin coincidencias para &quot;{query}&quot;
            </p>
          ) : (
            filteredQr.map((qr) => (
              <button
                key={qr.id}
                onClick={() => selectQuickReply(qr)}
                className="w-full text-left rounded-lg p-2 text-xs hover:bg-muted transition-colors flex flex-col gap-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{qr.title}</span>
                  <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    /{qr.shortcut}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{qr.message}</p>
              </button>
            ))
          )}
        </div>
      )}

      {templates.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {templates.slice(0, 4).map((t) => (
            <button
              key={t.id}
              className="rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-text-2 transition-colors hover:border-brand-soft hover:bg-brand-tint hover:text-brand-text"
              onClick={() => {
                const firstName = conversation.contact.name.split(" ")[0] ?? "";
                setText(t.body.replace(/\{\{\s*1\s*\}\}/g, firstName));
                taRef.current?.focus();
                setTimeout(autogrow, 0);
              }}
              title={t.body}
            >
              {t.name.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 rounded-md border bg-background px-3 py-2 transition-shadow focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand-soft">
        <button
          type="button"
          onClick={() => setShowQrPopup((prev) => !prev)}
          title="Respuestas Rápidas (o escribe /)"
          className="p-1.5 text-muted-foreground hover:text-amber-500 rounded transition-colors"
        >
          <Zap className="h-4 w-4" />
        </button>

        <textarea
          ref={taRef}
          placeholder="Escribe una respuesta (usa / para atajos rápidos)…"
          value={text}
          rows={1}
          onChange={(e) => {
            setText(e.target.value);
            autogrow();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          className="max-h-[120px] w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-text-3"
        />
        <button
          onClick={() => void submit()}
          disabled={sending || text.trim().length === 0}
          aria-label="Enviar"
          className={cn(
            "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-brand text-white transition-opacity hover:bg-brand-hover",
            (sending || !text.trim()) && "opacity-40"
          )}
        >
          <Send className="h-4 w-4" strokeWidth={1.7} />
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        {error ? <p className="text-xs text-destructive">{error}</p> : <span />}
        <p className="text-[11px] text-text-3">
          Ventana abierta · quedan {formatRemaining(conversation.windowRemainingMs)}
        </p>
      </div>
    </div>
  );
}
