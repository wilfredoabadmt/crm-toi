"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Tag as TagIcon, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TagItem {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

const PRESET_COLORS = [
  "#3b82f6", // Azul
  "#10b981", // Esmeralda
  "#f59e0b", // Ámbar
  "#ef4444", // Rojo
  "#8b5cf6", // Púrpura
  "#ec4899", // Rosa
  "#64748b", // Pizarra
  "#06b6d4", // Cian
];

export function TagsClient() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags || []);
      }
    } catch (err) {
      console.error("Error al cargar etiquetas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTags();
  }, [fetchTags]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || "No se pudo crear la etiqueta");
      }
      setName("");
      void fetchTags();
    } catch (err: any) {
      setError(err.message || "Error al crear etiqueta");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Seguro que deseas eliminar esta etiqueta?")) return;
    try {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      if (res.ok) void fetchTags();
    } catch (err) {
      console.error("Error al eliminar etiqueta:", err);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <TagIcon className="h-6 w-6 text-primary" />
          Etiquetas de Contactos (Tags)
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Crea etiquetas de colores para identificar clientes VIP, morosos, tipos de planes y filtrar audiencias en Campañas.
        </p>
      </div>

      {/* Formulario de Creación */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Nueva Etiqueta</CardTitle>
          <CardDescription className="text-xs">
            Asigna un nombre descriptivo y elige un color identificador.
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

            <div className="grid gap-4 sm:grid-cols-12 items-end">
              <div className="space-y-1.5 sm:col-span-6">
                <Label htmlFor="tag-name" className="text-xs">Nombre de la etiqueta</Label>
                <Input
                  id="tag-name"
                  placeholder="ej. VIP, Moroso, Reclamo Pendiente, Fibra 100M"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-4">
                <Label className="text-xs">Color identificador</Label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`h-6 w-6 rounded-full border transition-all ${
                          color === c ? "scale-110 ring-2 ring-primary ring-offset-1" : "opacity-80 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-7 w-7 rounded cursor-pointer border-0 p-0"
                    title="Color personalizado"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving || !name.trim()} className="w-full h-9 text-xs">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
                  Guardar
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Listado de Etiquetas Existentes */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Etiquetas registradas ({tags.length})
        </h3>

        {loading ? (
          <p className="text-xs text-muted-foreground">Cargando etiquetas…</p>
        ) : tags.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground bg-card">
            No hay etiquetas creadas todavía. Crea la primera arriba para clasificar a tus contactos.
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
            {tags.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-sm hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="h-3.5 w-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-xs font-semibold text-foreground truncate">
                    {t.name}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void handleDelete(t.id)}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
