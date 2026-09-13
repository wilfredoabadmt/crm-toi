"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Zap, Trash2, Loader2, AlertCircle, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface QuickReplyItem {
  id: string;
  shortcut: string;
  title: string;
  message: string;
  createdAt: string;
}

export function QuickRepliesClient() {
  const [replies, setReplies] = useState<QuickReplyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [shortcut, setShortcut] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReplies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quick-replies");
      if (res.ok) {
        const data = await res.json();
        setReplies(data.quickReplies || []);
      }
    } catch (err) {
      console.error("Error al cargar respuestas rápidas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReplies();
  }, [fetchReplies]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!shortcut.trim() || !title.trim() || !message.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/quick-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortcut, title, message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || "No se pudo crear la respuesta rápida");
      }
      setShortcut("");
      setTitle("");
      setMessage("");
      void fetchReplies();
    } catch (err: any) {
      setError(err.message || "Error al crear respuesta rápida");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Seguro que deseas eliminar este atajo?")) return;
    try {
      const res = await fetch(`/api/quick-replies/${id}`, { method: "DELETE" });
      if (res.ok) void fetchReplies();
    } catch (err) {
      console.error("Error al eliminar respuesta rápida:", err);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Zap className="h-6 w-6 text-amber-500" />
          Respuestas Rápidas (Fast Replies)
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configura atajos de teclado para responder en un instante desde la Bandeja escribiendo una barra diagonal (ejemplo: <code>/banco</code> o <code>/planes</code>).
        </p>
      </div>

      {/* Formulario de Creación */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Nueva Respuesta Rápida</CardTitle>
          <CardDescription className="text-xs">
            Define el atajo sin espacios ni caracteres especiales y el mensaje completo que se insertará en el chat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="qr-shortcut" className="text-xs">
                  Atajo (escribe sin la barra /)
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 font-mono text-muted-foreground text-xs font-bold">
                    /
                  </span>
                  <Input
                    id="qr-shortcut"
                    placeholder="banco, planes, horario"
                    value={shortcut}
                    onChange={(e) => setShortcut(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="pl-6 h-9 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qr-title" className="text-xs">
                  Título descriptivo
                </Label>
                <Input
                  id="qr-title"
                  placeholder="ej. Cuentas Bancarias y QR"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qr-msg" className="text-xs">
                Mensaje a enviar
              </Label>
              <Textarea
                id="qr-msg"
                placeholder="Escribe el texto completo que se insertará en el mensaje cuando el asesor use el atajo..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="text-xs"
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !shortcut.trim() || !message.trim()} className="text-xs">
                {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
                Guardar Respuesta Rápida
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Listado de Atajos */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Atajos configurados ({replies.length})
        </h3>

        {loading ? (
          <p className="text-xs text-muted-foreground">Cargando atajos…</p>
        ) : replies.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground bg-card">
            No tienes respuestas rápidas aún. Crea la primera para que los asesores puedan usar <code>/atajo</code> en el chat.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {replies.map((r) => (
              <div
                key={r.id}
                className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-sm hover:border-primary/40 transition-colors gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                      /{r.shortcut}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleDelete(r.id)}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <h4 className="font-semibold text-xs text-foreground">{r.title}</h4>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3 bg-muted/20 p-2 rounded">
                    {r.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
