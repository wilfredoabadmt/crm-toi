"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ACCENT_PRESETS, isValidHex, resolveAccentSet, type Branding } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

export function BrandingClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [accent, setAccent] = useState("#3f5972");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { branding: Branding } | null) => {
        if (d) {
          setName(d.branding.name);
          setAccent(d.branding.accent);
          setLogoUrl(d.branding.logoUrl ?? null);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const isPreset = accent.toLowerCase() in ACCENT_PRESETS;
  const previewSet = resolveAccentSet(accent);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG o WebP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen no debe superar los 2MB.");
      return;
    }

    setError(null);
    setUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/settings/branding/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Error al subir el logo");
      }

      setLogoUrl(data.url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al procesar la imagen";
      setError(msg);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/settings/branding", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), accent, logoUrl }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(data?.error?.message ?? "No se pudo guardar");
      return;
    }
    setSaved(true);
    // Re-renderiza el árbol server (layout raíz inyecta el acento, logo y el título)
    router.refresh();
  }

  if (!loaded) return <p className="text-sm text-text-3">Cargando…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Marca del CRM</CardTitle>
          <CardDescription>
            Este CRM es tuyo: personaliza el logo de tu empresa, el nombre comercial y los colores de acento.
            Se reflejarán en la barra lateral, en la pantalla de inicio de sesión y en todo el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campo de Logo */}
          <div className="space-y-2">
            <Label>Logo del Sistema</Label>
            <div className="flex items-center gap-4">
              {/* Contenedor visual del logo o placeholder */}
              <div className="relative flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-1 overflow-hidden shrink-0">
                {uploadingLogo ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Logo CRM"
                    className="h-full w-full object-contain rounded-lg"
                  />
                ) : (
                  <ImageIcon className="h-7 w-7 text-muted-foreground/60" />
                )}
              </div>

              {/* Botones de acción del logo */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => void handleLogoUpload(e)}
                    className="hidden"
                    id="brand-logo-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5 text-xs"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {logoUrl ? "Cambiar logo" : "Subir logo"}
                  </Button>

                  {logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogoUrl(null)}
                      className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                    >
                      <X className="h-3.5 w-3.5" />
                      Quitar
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Recomendado: PNG o SVG transparente, relación cuadrada o apaisada (máx. 2MB).
                </p>
              </div>
            </div>
          </div>

          {/* Campo de Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="brand-name">Nombre</Label>
            <Input
              id="brand-name"
              maxLength={30}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vocero"
              className="max-w-xs"
            />
          </div>

          {/* Color de acento */}
          <div className="space-y-2">
            <Label>Color de acento</Label>
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(ACCENT_PRESETS).map(([hex, preset]) => (
                <button
                  key={hex}
                  onClick={() => setAccent(hex)}
                  title={preset.label}
                  aria-label={preset.label}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                    accent.toLowerCase() === hex
                      ? "border-foreground/40 bg-secondary"
                      : "hover:bg-accent"
                  )}
                >
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ background: hex }}
                  />
                  {preset.label}
                </button>
              ))}
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                  !isPreset ? "border-foreground/40 bg-secondary" : "hover:bg-accent"
                )}
              >
                <input
                  type="color"
                  value={isValidHex(accent) ? accent : "#3f5972"}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-4 w-4 cursor-pointer appearance-none border-0 bg-transparent p-0"
                />
                Personalizado
              </label>
            </div>
            <p className="text-xs text-text-3">
              Con un color personalizado, los tonos derivados (hover, fondos
              suaves) se calculan solos y se ajusta el contraste.
            </p>
          </div>

          {/* Vista previa en tiempo real */}
          <div className="rounded-xl border p-4 shadow-sm" style={{ background: previewSet.tint }}>
            <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Vista previa en tiempo real
            </span>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={name || "Logo"}
                  className="h-[34px] w-auto max-w-[42px] object-contain rounded-sm shrink-0"
                />
              ) : (
                <span
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-sm text-[15px] font-bold text-white shrink-0"
                  style={{ background: previewSet.accent }}
                >
                  {(name.trim() || "Vocero").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0">
                <span className="block text-[15px] font-[650] leading-tight truncate">
                  {name.trim() || "Vocero"}
                </span>
                <span className="block text-[11px] text-text-3">CRM · WhatsApp</span>
              </span>
              <span className="flex-1" />
              <span
                className="rounded-md px-3 py-1.5 text-xs font-medium text-white shadow-xs"
                style={{ background: previewSet.accent }}
              >
                Botón de ejemplo
              </span>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && <p className="text-sm font-medium" style={{ color: previewSet.text }}>Marca guardada exitosamente ✓</p>}
          <Button disabled={saving || !name.trim()} onClick={() => void save()}>
            {saving ? "Guardando…" : "Guardar marca"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

