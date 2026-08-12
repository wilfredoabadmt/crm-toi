"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Compass,
  Crosshair,
  Globe,
  Loader2,
  MapPin,
  Navigation,
  Pentagon,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CoverageMapPicker, type PolygonPoint } from "@/components/agent/coverage-map-picker";

export type CoverageZoneItem = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  type?: "radius" | "polygon";
  polygon?: PolygonPoint[] | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
};

export function CoverageManagerSection() {
  const [zones, setZones] = useState<CoverageZoneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form (Crear)
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radiusKm, setRadiusKm] = useState("10");
  const [notes, setNotes] = useState("");
  const [zoneMode, setZoneMode] = useState<"radius" | "polygon">("radius");
  const [polygonPoints, setPolygonPoints] = useState<PolygonPoint[]>([]);

  // Form (Editar)
  const [editingZone, setEditingZone] = useState<CoverageZoneItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");
  const [editRadius, setEditRadius] = useState("10");
  const [editActive, setEditActive] = useState(true);
  const [editNotes, setEditNotes] = useState("");
  const [editMode, setEditMode] = useState<"radius" | "polygon">("radius");
  const [editPolygon, setEditPolygon] = useState<PolygonPoint[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Probador de Cobertura GPS
  const [testLat, setTestLat] = useState("");
  const [testLng, setTestLng] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    hasCoverage: boolean;
    matchingZone?: { name: string; distanceKm: number; radiusKm: number; type?: string; notes: string | null } | null;
    closestZone?: { name: string; distanceKm: number; radiusKm: number; type?: string } | null;
  } | null>(null);

  const fetchZones = useCallback(async () => {
    try {
      const res = await fetch("/api/coverage/zones");
      if (res.ok) {
        const data = (await res.json()) as { zones: CoverageZoneItem[] };
        setZones(data.zones ?? []);
      }
    } catch {
      // ignorar
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchZones();
  }, [fetchZones]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    const radNum = parseFloat(radiusKm);

    if (!name.trim() || isNaN(latNum) || isNaN(lngNum)) {
      setErrorMsg("Ingresa un nombre y una ubicación válida.");
      return;
    }

    if (zoneMode === "polygon" && polygonPoints.length < 3) {
      setErrorMsg("Dibuja al menos 3 puntos en el mapa para crear un polígono de cobertura.");
      return;
    }

    if (zoneMode === "radius" && isNaN(radNum)) {
      setErrorMsg("Ingresa un radio en KM válido.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/coverage/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          latitude: latNum,
          longitude: lngNum,
          radiusKm: radNum || 10,
          type: zoneMode,
          polygon: zoneMode === "polygon" ? polygonPoints : undefined,
          notes: notes.trim() || undefined,
        }),
      });

      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        // respuesta vacia o no json
      }

      if (!res.ok || !data.ok) {
        let msg = "Error al crear la zona de cobertura.";
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
        setName("");
        setLatitude("");
        setLongitude("");
        setRadiusKm("10");
        setNotes("");
        setZoneMode("radius");
        setPolygonPoints([]);
        void fetchZones();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(zone: CoverageZoneItem) {
    setEditingZone(zone);
    setEditName(zone.name);
    setEditLat(zone.latitude.toString());
    setEditLng(zone.longitude.toString());
    setEditRadius(zone.radiusKm.toString());
    setEditActive(zone.isActive);
    setEditNotes(zone.notes ?? "");
    setEditMode((zone.type as "radius" | "polygon") ?? "radius");
    setEditPolygon(Array.isArray(zone.polygon) ? zone.polygon : []);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingZone) return;

    const latNum = parseFloat(editLat);
    const lngNum = parseFloat(editLng);
    const radNum = parseFloat(editRadius);

    if (!editName.trim() || isNaN(latNum) || isNaN(lngNum)) {
      return;
    }

    if (editMode === "polygon" && editPolygon.length < 3) {
      return;
    }

    setSavingEdit(true);

    try {
      const res = await fetch("/api/coverage/zones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingZone.id,
          name: editName.trim(),
          latitude: latNum,
          longitude: lngNum,
          radiusKm: radNum || 10,
          type: editMode,
          polygon: editMode === "polygon" ? editPolygon : null,
          isActive: editActive,
          notes: editNotes.trim() || null,
        }),
      });

      if (res.ok) {
        setEditingZone(null);
        void fetchZones();
      }
    } catch {
      // ignorar
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleZoneActive(zone: CoverageZoneItem) {
    try {
      await fetch("/api/coverage/zones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: zone.id,
          isActive: !zone.isActive,
        }),
      });
      void fetchZones();
    } catch {
      // ignorar
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de eliminar esta zona de cobertura?")) return;
    try {
      await fetch(`/api/coverage/zones?id=${id}`, { method: "DELETE" });
      void fetchZones();
    } catch {
      // ignorar
    }
  }

  async function handleTestCoverage(e: React.FormEvent) {
    e.preventDefault();
    const latNum = parseFloat(testLat);
    const lngNum = parseFloat(testLng);

    if (isNaN(latNum) || isNaN(lngNum)) return;

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/coverage/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: latNum, longitude: lngNum }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          hasCoverage: boolean;
          matchingZone?: { name: string; distanceKm: number; radiusKm: number; type?: string; notes: string | null } | null;
          closestZone?: { name: string; distanceKm: number; radiusKm: number; type?: string } | null;
        };
        setTestResult(data);
      }
    } catch {
      // ignorar
    } finally {
      setTesting(false);
    }
  }

  function useCurrentLocation() {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(6));
          setLongitude(pos.coords.longitude.toFixed(6));
          setTestLat(pos.coords.latitude.toFixed(6));
          setTestLng(pos.coords.longitude.toFixed(6));
        },
        () => {
          alert("No se pudo obtener la ubicación GPS del navegador.");
        }
      );
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Áreas y Zonas de Cobertura GPS
            </CardTitle>
            <CardDescription className="mt-1">
              Configura radios o polígonos personalizados para verificar la cobertura de los clientes en WhatsApp.
            </CardDescription>
          </div>
          <Badge variant="secondary">{zones.filter((z) => z.isActive).length} zonas activas</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Formulario Agregar Zona */}
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-4 rounded-lg border p-4 bg-card/50">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Agregar Zona o Sucursal de Cobertura
            </p>
            <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation} className="text-xs">
              <Crosshair className="mr-1 h-3.5 w-3.5" /> Usar mi GPS
            </Button>
          </div>

          {errorMsg && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
              {errorMsg}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="zone-name">Nombre de la Zona / Sucursal</Label>
              <Input
                id="zone-name"
                placeholder="p. ej. Sucursal Central - Cobertura 15km"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {zoneMode === "radius" && (
              <div className="space-y-1.5">
                <Label htmlFor="zone-radius">Radio de Cobertura (KM)</Label>
                <Input
                  id="zone-radius"
                  type="number"
                  step="0.1"
                  placeholder="10"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Seleccionador Visual en Mapa */}
          <CoverageMapPicker
            mode={zoneMode}
            latitude={parseFloat(latitude) || -12.046374}
            longitude={parseFloat(longitude) || -77.042793}
            radiusKm={parseFloat(radiusKm) || 10}
            polygon={polygonPoints}
            onChangeMode={setZoneMode}
            onChangeLocation={(lat, lng) => {
              setLatitude(lat.toFixed(6));
              setLongitude(lng.toFixed(6));
            }}
            onChangePolygon={setPolygonPoints}
            existingZones={zones}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="zone-lat">Latitud GPS (Generada)</Label>
              <Input
                id="zone-lat"
                placeholder="-12.046374"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="zone-lng">Longitud GPS (Generada)</Label>
              <Input
                id="zone-lng"
                placeholder="-77.042793"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="zone-notes">Notas / Horarios / Condiciones (Opcional)</Label>
            <Textarea
              id="zone-notes"
              rows={2}
              placeholder="p. ej. Despacho garantizado en 45 mins. Envíos gratis sobre $20."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            disabled={
              submitting ||
              !name.trim() ||
              !latitude ||
              !longitude ||
              (zoneMode === "polygon" && polygonPoints.length < 3)
            }
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando Zona…
              </>
            ) : (
              <>
                <Plus className="mr-1 h-4 w-4" />{" "}
                {zoneMode === "polygon"
                  ? `Registrar Polígono (${polygonPoints.length} vértices)`
                  : "Registrar Zona de Cobertura"}
              </>
            )}
          </Button>
        </form>

        {/* Modal/Formulario de Edición */}
        {editingZone && (
          <form onSubmit={(e) => void handleUpdate(e)} className="space-y-4 rounded-lg border border-primary/40 p-4 bg-primary/5">
            <p className="text-sm font-semibold flex items-center gap-2 text-primary">
              <Pencil className="h-4 w-4" />
              Editar Zona: {editingZone.name}
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-zone-name">Nombre</Label>
                <Input
                  id="edit-zone-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              {editMode === "radius" && (
                <div className="space-y-1.5">
                  <Label htmlFor="edit-zone-radius">Radio en KM</Label>
                  <Input
                    id="edit-zone-radius"
                    type="number"
                    step="0.1"
                    value={editRadius}
                    onChange={(e) => setEditRadius(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Seleccionador Visual en Mapa para Edición */}
            <CoverageMapPicker
              mode={editMode}
              latitude={parseFloat(editLat) || -12.046374}
              longitude={parseFloat(editLng) || -77.042793}
              radiusKm={parseFloat(editRadius) || 10}
              polygon={editPolygon}
              onChangeMode={setEditMode}
              onChangeLocation={(lat, lng) => {
                setEditLat(lat.toFixed(6));
                setEditLng(lng.toFixed(6));
              }}
              onChangePolygon={setEditPolygon}
              existingZones={zones.filter((z) => z.id !== editingZone.id)}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-zone-lat">Latitud GPS (Generada)</Label>
                <Input
                  id="edit-zone-lat"
                  value={editLat}
                  onChange={(e) => setEditLat(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-zone-lng">Longitud GPS (Generada)</Label>
                <Input
                  id="edit-zone-lng"
                  value={editLng}
                  onChange={(e) => setEditLng(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-zone-notes">Notas</Label>
              <Textarea
                id="edit-zone-notes"
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="rounded border-input text-primary"
                />
                Zona Activa
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditingZone(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingEdit || (editMode === "polygon" && editPolygon.length < 3)}
              >
                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        )}

        {/* Probador Interactivo de Cobertura GPS */}
        <div className="space-y-3 rounded-lg border border-brand-soft p-4 bg-brand-tint/30">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            Probador de Cobertura en Tiempo Real
          </p>
          <form onSubmit={(e) => void handleTestCoverage(e)} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 flex-1 min-w-[140px]">
              <Label htmlFor="test-lat" className="text-xs">Latitud</Label>
              <Input
                id="test-lat"
                placeholder="-12.046374"
                className="h-8 text-xs"
                value={testLat}
                onChange={(e) => setTestLat(e.target.value)}
              />
            </div>
            <div className="space-y-1 flex-1 min-w-[140px]">
              <Label htmlFor="test-lng" className="text-xs">Longitud</Label>
              <Input
                id="test-lng"
                placeholder="-77.042793"
                className="h-8 text-xs"
                value={testLng}
                onChange={(e) => setTestLng(e.target.value)}
              />
            </div>
            <Button type="submit" size="sm" className="h-8 text-xs" disabled={testing || !testLat || !testLng}>
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Search className="mr-1 h-3.5 w-3.5" /> Evaluar Cobertura</>}
            </Button>
          </form>

          {testResult && (
            <div className="mt-3 rounded-md border p-3 bg-background">
              {testResult.hasCoverage ? (
                <div className="flex items-start gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">¡TIENE COBERTURA VÁLIDA!</p>
                    <p className="mt-0.5">
                      Coincide con <span className="font-semibold text-foreground">{testResult.matchingZone?.name}</span>
                      {" "}(
                      {testResult.matchingZone?.type === "polygon"
                        ? "zona poligonal"
                        : `a ${testResult.matchingZone?.distanceKm} km del centro, radio máximo ${testResult.matchingZone?.radiusKm} km`}
                      ).
                    </p>
                    {testResult.matchingZone?.notes && (
                      <p className="mt-1 text-muted-foreground">Nota: {testResult.matchingZone.notes}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-xs font-medium">
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">FUERA DE COBERTURA</p>
                    {testResult.closestZone ? (
                      <p className="mt-0.5">
                        La zona más cercana es <span className="font-semibold text-foreground">{testResult.closestZone.name}</span> ubicada a {testResult.closestZone.distanceKm} km
                        {testResult.closestZone.type === "polygon" ? " (zona poligonal)" : ` (radio permitido: ${testResult.closestZone.radiusKm} km)`}.
                      </p>
                    ) : (
                      <p className="mt-0.5">No hay zonas de cobertura activas configuradas.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lista de Zonas de Cobertura */}
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando zonas…</div>
        ) : zones.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No hay zonas de cobertura configuradas aún. Registra una zona arriba.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {zones.map((zone) => {
              const zType = (zone.type ?? "radius") as "radius" | "polygon";
              return (
                <div
                  key={zone.id}
                  className={`relative flex flex-col justify-between rounded-lg border p-3.5 shadow-sm transition-all ${
                    zone.isActive ? "bg-card hover:border-primary/50" : "bg-muted/40 opacity-75"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-1.5">
                          {zType === "polygon" ? (
                            <Pentagon className="h-4 w-4 text-red-500 shrink-0" />
                          ) : (
                            <Navigation className="h-4 w-4 text-primary shrink-0" />
                          )}
                          {zone.name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {zone.latitude.toFixed(6)}, {zone.longitude.toFixed(6)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={zone.isActive ? "default" : "secondary"} className="text-[10px]">
                          {zone.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {zType === "polygon" ? (
                            <><Pentagon className="mr-0.5 h-2.5 w-2.5" /> Polígono ({Array.isArray(zone.polygon) ? zone.polygon.length : 0} pts)</>
                          ) : (
                            <><Circle className="mr-0.5 h-2.5 w-2.5" /> Radio</>
                          )}
                        </Badge>
                      </div>
                    </div>

                    <div className="rounded bg-secondary/50 p-2 text-xs">
                      {zType === "polygon" ? (
                        <p className="font-semibold text-foreground">
                          Área: <span className="text-red-500">Polígono con {Array.isArray(zone.polygon) ? zone.polygon.length : 0} vértices</span>
                        </p>
                      ) : (
                        <p className="font-semibold text-foreground">
                          Radio Permitido: <span className="text-primary">{zone.radiusKm} km</span>
                        </p>
                      )}
                      {zone.notes && (
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                          {zone.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t pt-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => void toggleZoneActive(zone)}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <Power className={`h-3.5 w-3.5 ${zone.isActive ? "text-emerald-500" : "text-muted-foreground"}`} />
                      {zone.isActive ? "Desactivar" : "Activar"}
                    </button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => startEditing(zone)}
                        title="Editar zona"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        onClick={() => void handleDelete(zone.id)}
                        title="Eliminar zona"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
