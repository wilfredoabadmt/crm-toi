"use client";

import { useEffect, useState } from "react";
import type { TemplateDto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Selector de plantilla aprobada para conversaciones con ventana cerrada
 * (FR-005/FR-051). Sin plantillas aprobadas muestra el estado vacío.
 */
export function TemplateSender({
  conversationId,
  onSent,
}: {
  conversationId: string;
  onSent: () => void;
}) {
  const [templates, setTemplates] = useState<TemplateDto[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/templates")
      .then((r) => (r.ok ? r.json() : { templates: [] }))
      .then((d: { templates?: TemplateDto[] }) => {
        if (!cancelled) {
          setTemplates(
            (d.templates ?? []).filter((t) => t.status === "approved")
          );
        }
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (templates === null) {
    return <p className="text-xs text-muted-foreground">Cargando plantillas…</p>;
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay plantillas aprobadas. Créalas en{" "}
        <a href="/settings/templates" className="text-primary hover:underline">
          Configuración → Plantillas
        </a>{" "}
        y espera la aprobación de Meta.
      </p>
    );
  }

  const selected = templates.find((t) => t.id === selectedId) ?? null;
  const variableMatches = selected ? [...selected.body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)] : [];
  const variableNumbers = [...new Set(variableMatches.map((m) => m[1]!))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10)
  );

  const isFormValid =
    selected &&
    (!variableNumbers.length ||
      variableNumbers.every((num) => (variableValues[num] ?? "").trim().length > 0));

  async function send() {
    if (!selected || sending || !isFormValid) return;
    setSending(true);
    setError(null);
    const res = await fetch(
      `/api/conversations/${conversationId}/messages/template`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          templateId: selected.id,
          variables: variableValues,
          variable: variableValues["1"] || undefined,
        }),
      }
    );
    setSending(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(data?.error?.message ?? "No se pudo enviar la plantilla");
      return;
    }
    setSelectedId("");
    setVariableValues({});
    onSent();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="template-select">Plantilla aprobada</Label>
        <select
          id="template-select"
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setVariableValues({});
          }}
          className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Elige una plantilla…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.language})
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <p className="rounded-md bg-secondary/60 p-2.5 text-xs text-muted-foreground whitespace-pre-wrap">
          {selected.body}
        </p>
      )}
      {variableNumbers.length > 0 && (
        <div className="space-y-2 rounded-md border bg-muted/20 p-2.5">
          <Label className="text-xs font-semibold">Variables requeridas</Label>
          {variableNumbers.map((num) => (
            <div key={num} className="flex items-center gap-2 text-xs">
              <span className="font-mono font-bold text-primary w-12 text-center bg-primary/10 py-1 rounded">
                {"{{" + num + "}}"}
              </span>
              <Input
                value={variableValues[num] || ""}
                onChange={(e) =>
                  setVariableValues((prev) => ({
                    ...prev,
                    [num]: e.target.value,
                  }))
                }
                placeholder={
                  num === "1"
                    ? "Nombre del cliente o dato 1"
                    : `Valor para variable ${num}`
                }
                className="h-8 text-xs"
              />
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        onClick={() => void send()}
        disabled={!selected || sending || !isFormValid}
      >
        {sending ? "Enviando…" : "Enviar plantilla"}
      </Button>
    </div>
  );
}
