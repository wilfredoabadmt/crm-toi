"use client";

import { useCallback, useEffect, useState } from "react";
import { Image as ImageIcon, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type AgentMediaItem = {
  id: string;
  category: "comunicados" | "catalogos" | "ubicacion" | "pagos" | "soporte_garantia" | "promociones" | "general";
  name: string;
  url: string;
  rule: string;
  filename: string;
  mimeType: string;
  createdAt: string;
};

const CATEGORIES: { slug: AgentMediaItem["category"]; label: string }[] = [
  { slug: "comunicados", label: "Comunicados" },
  { slug: "catalogos", label: "Catálogos y Precios" },
  { slug: "ubicacion", label: "Ubicación" },
  { slug: "pagos", label: "Pagos y QR" },
  { slug: "soporte_garantia", label: "Soporte y Garantía" },
  { slug: "promociones", label: "Promociones" },
  { slug: "general", label: "General" },
];

export function MediaManagerSection() {
  const [items, setItems] = useState<AgentMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states (Crear)
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [rule, setRule] = useState("");
  const [category, setCategory] = useState<AgentMediaItem["category"]>("general");

  // Form states (Editar / Actualizar)
  const [editingItem, setEditingItem] = useState<AgentMediaItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editRule, setEditRule] = useState("");
  const [editCategory, setEditCategory] = useState<AgentMediaItem["category"]>("general");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/media");
      if (res.ok) {
        const data = (await res.json()) as { media: AgentMediaItem[] };
        setItems(data.media ?? []);
      }
    } catch {
      // ignorar error de red inicial
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMedia();
  }, [fetchMedia]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !name.trim() || !rule.trim()) {
      setErrorMsg("Completa todos los campos y selecciona una imagen.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name.trim());
    formData.append("rule", rule.trim());
    formData.append("category", category);

    try {
      const res = await fetch("/api/agent/media", {
        method: "POST",
        body: formData,
      });

      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        // respuesta vacía o no json
      }

      if (!res.ok || !data.ok) {
        let msg = "Error al subir la imagen.";
        if (typeof data.detail === "string" && data.detail.length > 0) {
          msg = data.detail;
        } else if (typeof data.error === "string" && data.error.length > 0) {
          msg = data.error;
        } else if (
          typeof data.error === "object" &&
          data.error &&
          "message" in data.error &&
          typeof (data.error as { message?: unknown }).message === "string"
        ) {
          msg = (data.error as { message: string }).message;
        }
        setErrorMsg(msg);
      } else {
        // Limpiar formulario y recargar
        setFile(null);
        setName("");
        setRule("");
        setCategory("general");
        void fetchMedia();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(item: AgentMediaItem) {
    setEditingItem(item);
    setEditName(item.name);
    setEditRule(item.rule);
    setEditCategory(item.category);
    setEditFile(null);
    setEditError(null);
  }

  function cancelEditing() {
    setEditingItem(null);
    setEditFile(null);
    setEditError(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem || !editName.trim() || !editRule.trim()) {
      setEditError("Ingresa un nombre y una regla válidos.");
      return;
    }

    setSavingEdit(true);
    setEditError(null);

    const formData = new FormData();
    formData.append("id", editingItem.id);
    formData.append("name", editName.trim());
    formData.append("rule", editRule.trim());
    formData.append("category", editCategory);
    if (editFile) {
      formData.append("file", editFile);
    }

    try {
      const res = await fetch("/api/agent/media", {
        method: "PUT",
        body: formData,
      });

      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        // respuesta no json
      }

      if (!res.ok || !data.ok) {
        let msg = "Error al actualizar la imagen.";
        if (typeof data.detail === "string") msg = data.detail;
        else if (typeof data.error === "string") msg = data.error;
        else if (
          typeof data.error === "object" &&
          data.error &&
          "message" in data.error &&
          typeof (data.error as { message?: unknown }).message === "string"
        ) {
          msg = (data.error as { message: string }).message;
        }
        setEditError(msg);
      } else {
        cancelEditing();
        void fetchMedia();
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Error al guardar cambios.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de eliminar esta imagen? Se borrará también de Cloudflare R2.")) {
      return;
    }
    try {
      const res = await fetch(`/api/agent/media?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        void fetchMedia();
      }
    } catch {
      // ignorar
    }
  }

  const filteredItems = items.filter(
    (item) => selectedCategory === "all" || item.category === selectedCategory
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Recursos de Imágenes y Medios
            </CardTitle>
            <CardDescription className="mt-1">
              CRUD completo de imágenes alojadas en Cloudflare R2 con sincronización en tiempo real.
            </CardDescription>
          </div>
          <Badge variant="secondary">{items.length} imágenes registradas</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Formulario de Carga (Crear) */}
        <form onSubmit={(e) => void handleUpload(e)} className="space-y-4 rounded-lg border p-4 bg-card/50">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Subir nueva imagen a Cloudflare R2
          </p>

          {errorMsg && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
              {errorMsg}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="media-name">Nombre / Identificador</Label>
              <Input
                id="media-name"
                placeholder="p. ej. Catálogo de Precios 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="media-category">Categoría</Label>
              <select
                id="media-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as AgentMediaItem["category"])}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="media-rule">Regla de Entrega para la IA</Label>
            <Textarea
              id="media-rule"
              rows={2}
              placeholder="p. ej. Entregar únicamente cuando el cliente consulte precios, catálogo o menú de servicios."
              value={rule}
              onChange={(e) => setRule(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="media-file">Imagen (PNG, JPG, WEBP, PDF)</Label>
            <Input
              id="media-file"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <Button type="submit" disabled={submitting || !file || !name.trim() || !rule.trim()}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo a Cloudflare R2…
              </>
            ) : (
              <>
                <Plus className="mr-1 h-4 w-4" /> Subir y Registrar Imagen
              </>
            )}
          </Button>
        </form>

        {/* Modal/Formulario de Edición (Actualizar) */}
        {editingItem && (
          <form onSubmit={(e) => void handleUpdate(e)} className="space-y-4 rounded-lg border border-primary/40 p-4 bg-primary/5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-2 text-primary">
                <Pencil className="h-4 w-4" />
                Editar Recurso de Imagen #{editingItem.id}
              </p>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEditing}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {editError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
                {editError}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Nombre / Identificador</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-category">Categoría</Label>
                <select
                  id="edit-category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as AgentMediaItem["category"])}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-rule">Regla de Entrega para la IA</Label>
              <Textarea
                id="edit-rule"
                rows={2}
                value={editRule}
                onChange={(e) => setEditRule(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-file">Reemplazar Imagen en Cloudflare R2 (Opcional)</Label>
              <Input
                id="edit-file"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-[11px] text-muted-foreground">
                Si eliges un nuevo archivo, se actualizará en R2 y la versión anterior será eliminada automáticamente.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={cancelEditing}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingEdit || !editName.trim() || !editRule.trim()}>
                {savingEdit ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando en R2…
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Filtros por Categoría */}
        <div className="flex flex-wrap gap-1.5 border-b pb-3">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            Todas ({items.length})
          </button>
          {CATEGORIES.map((c) => {
            const count = items.filter((i) => i.category === c.slug).length;
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => setSelectedCategory(c.slug)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedCategory === c.slug
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {c.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Lista de Imágenes (Read, Update, Delete) */}
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando recursos…</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No hay imágenes registradas en esta categoría.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-lg border bg-card p-3 shadow-sm transition-all hover:border-primary/50"
              >
                <div className="space-y-2">
                  <div className="relative aspect-video w-full overflow-hidden rounded-md bg-secondary/50">
                    {/* Visualización de la imagen */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/agent/media/file?id=${item.id}`}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-1">
                    <h4 className="font-medium text-sm line-clamp-1">{item.name}</h4>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {CATEGORIES.find((c) => c.slug === item.category)?.label ?? item.category}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">
                    <span className="font-medium text-foreground">Regla:</span> {item.rule}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
                  <a
                    href={`/api/agent/media/file?id=${item.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-medium text-primary hover:underline"
                    title="Abrir imagen de R2 en una nueva pestaña"
                  >
                    Ver Imagen ↗
                  </a>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => startEditing(item)}
                      title="Editar recurso"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-500"
                      onClick={() => void handleDelete(item.id)}
                      title="Eliminar recurso de R2 y BD"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
