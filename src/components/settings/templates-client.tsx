"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { TemplateDto } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const STATUS_BADGE: Record<
  TemplateDto["status"],
  { label: string; variant: "secondary" | "warning" | "success" | "destructive" }
> = {
  draft: { label: "Borrador", variant: "secondary" },
  pending: { label: "Pendiente de Meta", variant: "warning" },
  approved: { label: "Aprobada", variant: "success" },
  rejected: { label: "Rechazada", variant: "destructive" },
};

export function TemplatesClient() {
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/templates").catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as { templates: TemplateDto[] };
    setTemplates(data.templates);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  async function sync() {
    setSyncing(true);
    setSyncMsg(null);
    const res = await fetch("/api/templates/sync", { method: "POST" }).catch(
      () => null
    );
    setSyncing(false);
    if (res?.ok) {
      const data = (await res.json()) as { updated: number };
      setSyncMsg(
        data.updated > 0
          ? `${data.updated} plantilla(s) actualizada(s)`
          : "Todo al día"
      );
      void refetch();
    } else {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setSyncMsg(data?.error?.message ?? "No se pudo sincronizar");
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Las plantillas permiten reabrir conversaciones con la ventana de 24 h
          cerrada. Meta las aprueba en horas o días; el estado se actualiza por
          webhook y con el botón Sincronizar (imprescindible en modo agencia,
          donde los eventos de plantillas no llegan al webhook de la instancia).
        </p>
        <Button variant="outline" size="sm" disabled={syncing} onClick={() => void sync()}>
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          Sincronizar
        </Button>
      </div>
      {syncMsg && <p className="text-xs text-muted-foreground">{syncMsg}</p>}

      <CreateForm onCreated={() => void refetch()} />

      <div className="space-y-2">
        {templates.map((t) => (
          <div key={t.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-sm font-medium">
                {t.name}{" "}
                <span className="text-muted-foreground">({t.language})</span>
              </p>
              <Badge variant={STATUS_BADGE[t.status].variant}>
                {STATUS_BADGE[t.status].label}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t.body}</p>
            {t.status === "rejected" && t.rejectionReason && (
              <p className="mt-2 text-xs text-destructive">
                Razón del rechazo: {t.rejectionReason}
              </p>
            )}
          </div>
        ))}
        {templates.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Sin plantillas todavía. Crea la primera arriba — por ejemplo un
            «seguimos disponibles, ¿retomamos tu cotización?» para
            conversaciones frías.
          </p>
        )}
      </div>
    </div>
  );
}

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("es_MX");
  const [category, setCategory] = useState<"UTILITY" | "MARKETING">("UTILITY");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detección de variables
  const variableMatches = [...body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)];
  const variableNumbers = [...new Set(variableMatches.map((m) => parseInt(m[1]!, 10)))].sort(
    (a, b) => a - b
  );
  const nextVarNum = variableNumbers.length > 0 ? Math.max(...variableNumbers) + 1 : 1;

  // Validación local instantánea
  let inlineError: string | null = null;
  for (let i = 0; i < variableNumbers.length; i++) {
    const expected = i + 1;
    if (variableNumbers[i] !== expected) {
      inlineError = `Variables no secuenciales: se esperaba {{${expected}}} y se encontró {{${variableNumbers[i]}}}`;
      break;
    }
  }

  // Previsualización con variables ficticias
  const previewBody = body
    ? body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_match, num) => {
        if (num === "1") return "Juan Pérez";
        if (num === "2") return "15 de Octubre";
        if (num === "3") return "14:30";
        return `[Dato ${num}]`;
      })
    : "Escribe el cuerpo de tu plantilla a la izquierda para previsualizar cómo se verá en WhatsApp…";

  function insertVariable() {
    setBody((prev) => {
      const addition = `{{${nextVarNum}}}`;
      return prev ? `${prev} ${addition}` : addition;
    });
  }

  async function create() {
    if (inlineError) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, language, category, body }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(data?.error?.message ?? "No se pudo crear la plantilla");
      return;
    }
    setName("");
    setBody("");
    onCreated();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva plantilla de WhatsApp</CardTitle>
        <CardDescription>
          Puedes incluir variables secuenciales como <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code>, etc. 
          Al guardarla, se enviará directamente a aprobación oficial de Meta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-12">
          {/* Formulario Izquierdo */}
          <div className="space-y-4 md:col-span-7">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="tpl-name">Nombre</Label>
                <Input
                  id="tpl-name"
                  placeholder="seguimiento_cotizacion"
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="tpl-lang">Idioma</Label>
                <select
                  id="tpl-lang"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
                >
                  <option value="es_MX">es_MX (Latam)</option>
                  <option value="es">es (Español)</option>
                  <option value="es_AR">es_AR (Argentina)</option>
                  <option value="en_US">en_US (Inglés)</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="tpl-cat">Categoría</Label>
                <select
                  id="tpl-cat"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as "UTILITY" | "MARKETING")
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
                >
                  <option value="UTILITY">UTILITY (seguimiento)</option>
                  <option value="MARKETING">MARKETING</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="tpl-body">Cuerpo del mensaje</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={insertVariable}
                  className="h-7 text-xs font-mono font-medium text-primary hover:text-primary"
                >
                  + Insertar {`{{${nextVarNum}}}`}
                </Button>
              </div>
              <Textarea
                id="tpl-body"
                rows={4}
                maxLength={1024}
                placeholder="Hola {{1}}, seguimos disponibles para tu proyecto. ¿Deseas retomar la cotización enviada el {{2}}?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {variableNumbers.length > 0
                    ? `${variableNumbers.length} variable(s) detectada(s)`
                    : "Sin variables (mensaje fijo)"}
                </span>
                <span className={body.length > 1000 ? "text-amber-600 font-semibold" : ""}>
                  {body.length} / 1024 caracteres
                </span>
              </div>
            </div>

            {inlineError && (
              <p className="text-xs font-medium text-destructive">{inlineError}</p>
            )}
            {error && <p className="text-xs font-medium text-destructive">{error}</p>}

            <Button
              disabled={saving || !name.trim() || !body.trim() || !!inlineError}
              onClick={() => void create()}
              className="w-full sm:w-auto"
            >
              {saving ? "Enviando a Meta…" : "Crear y enviar a aprobación"}
            </Button>
          </div>

          {/* Simulador WhatsApp Derecho */}
          <div className="flex flex-col items-center justify-start rounded-xl border bg-muted/20 p-4 md:col-span-5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Simulador WhatsApp
            </p>
            <div className="w-full max-w-[270px] rounded-2xl border-4 border-muted-foreground/20 bg-[#efeae2] p-3 shadow-md min-h-[190px] flex flex-col justify-end">
              <div className="rounded-lg bg-white p-3 shadow-sm text-xs text-foreground space-y-1">
                <p className="whitespace-pre-wrap leading-relaxed text-[12px] text-slate-800">
                  {previewBody}
                </p>
                <div className="flex justify-end pt-1">
                  <span className="text-[10px] text-slate-400">12:00</span>
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-center text-muted-foreground">
              Vista previa en tiempo real con datos de muestra para validar legibilidad.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
