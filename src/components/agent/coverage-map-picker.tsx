"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, Compass, Loader2, Pentagon, Search, Undo2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type PolygonPoint = { lat: number; lng: number };

export type ZoneOnMap = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  type?: "radius" | "polygon";
  polygon?: PolygonPoint[] | null;
  isActive: boolean;
};

type Props = {
  mode: "radius" | "polygon";
  latitude: number;
  longitude: number;
  radiusKm: number;
  polygon: PolygonPoint[];
  onChangeMode: (mode: "radius" | "polygon") => void;
  onChangeLocation: (lat: number, lng: number) => void;
  onChangePolygon: (pts: PolygonPoint[]) => void;
  existingZones?: ZoneOnMap[];
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
  }
}

export function CoverageMapPicker({
  mode,
  latitude,
  longitude,
  radiusKm,
  polygon,
  onChangeMode,
  onChangeLocation,
  onChangePolygon,
  existingZones = [],
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activePolygonRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polygonMarkersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingLayersRef = useRef<any[]>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Cargar libreria Leaflet de CDN dinámicamente si no está en window
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.L) {
      setMapLoaded(true);
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => {
      setMapLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // Inicializar mapa de Leaflet
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = window.L;
    if (!L) return;

    const safeLat = (typeof latitude === 'number' && !isNaN(latitude)) ? latitude : -12.046374;
    const safeLng = (typeof longitude === 'number' && !isNaN(longitude)) ? longitude : -77.042793;
    const safeRadius = (typeof radiusKm === 'number' && !isNaN(radiusKm) && radiusKm > 0) ? radiusKm : 10;

    const map = L.map(mapContainerRef.current).setView([safeLat, safeLng], 13);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Marcador desplazable principal (modo Radio)
    const icon = L.divIcon({
      className: "custom-leaflet-pin",
      html: `<div style="background-color: #2563eb; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center;">
              <div style="background:white; width:6px; height:6px; border-radius:50%;"></div>
             </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([safeLat, safeLng], {
      draggable: true,
      icon,
    }).addTo(map);
    markerRef.current = marker;

    const circle = L.circle([safeLat, safeLng], {
      color: "#2563eb",
      fillColor: "#3b82f6",
      fillOpacity: 0.2,
      radius: safeRadius * 1000,
    }).addTo(map);
    circleRef.current = circle;

    // Polígono activo
    const polyShape = L.polygon([], {
      color: "#ef4444",
      fillColor: "#f87171",
      fillOpacity: 0.3,
    }).addTo(map);
    activePolygonRef.current = polyShape;

    // Escuchar evento de arrastrar pin principal
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onChangeLocation(pos.lat, pos.lng);
    });

    // Escuchar clic en cualquier parte del mapa
    map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
      const currentMode = (map as unknown as { _customMode?: string })._customMode || "radius";

      if (currentMode === "polygon") {
        // En modo Polígono: Añadir punto al polígono
        const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
        const updated = [...polygon, newPoint];
        onChangePolygon(updated);

        // Si es el primer punto, actualizar también el punto central
        if (polygon.length === 0) {
          onChangeLocation(e.latlng.lat, e.latlng.lng);
        }
      } else {
        // En modo Radio: Mover pin y centro
        marker.setLatLng(e.latlng);
        circle.setLatLng(e.latlng);
        onChangeLocation(e.latlng.lat, e.latlng.lng);
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded]);

  // Sincronizar el modo actual en el objeto map
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current._customMode = mode;
    }
  }, [mode]);

  // Actualizar visibilidad de elementos según modo (Radio vs Polígono)
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !circleRef.current || !activePolygonRef.current) return;
    const L = window.L;
    if (!L) return;

    if (mode === "radius") {
      // Mostrar pin y círculo, ocultar polígono en edición si no hay puntos
      if (latitude && longitude) {
        const safeLat2 = (typeof latitude === 'number' && !isNaN(latitude)) ? latitude : -12.046374;
        const safeLng2 = (typeof longitude === 'number' && !isNaN(longitude)) ? longitude : -77.042793;
        const safeRad2 = (typeof radiusKm === 'number' && !isNaN(radiusKm) && radiusKm > 0) ? radiusKm : 10;
        const newPos = [safeLat2, safeLng2];
        markerRef.current.setLatLng(newPos);
        circleRef.current.setLatLng(newPos);
        circleRef.current.setRadius(safeRad2 * 1000);
      }
      markerRef.current.setOpacity(1);
      circleRef.current.setStyle({ opacity: 1, fillOpacity: 0.2 });
      activePolygonRef.current.setStyle({ opacity: 0, fillOpacity: 0 });
    } else {
      // Modo Polígono: ocultar círculo y ajustar opacidad de polígono activo
      circleRef.current.setStyle({ opacity: 0, fillOpacity: 0 });
      markerRef.current.setOpacity(0.5);

      const polyLatLngs = polygon.map((p) => [p.lat, p.lng]);
      activePolygonRef.current.setLatLngs(polyLatLngs);
      activePolygonRef.current.setStyle({ opacity: 1, fillOpacity: 0.3 });

      // Limpiar y redibujar marcadores de vértices
      polygonMarkersRef.current.forEach((m) => mapInstanceRef.current.removeLayer(m));
      polygonMarkersRef.current = [];

      polygon.forEach((pt, idx) => {
        const vertexIcon = L.divIcon({
          className: "polygon-vertex-pin",
          html: `<div style="background-color: #ef4444; color:white; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; font-size:10px; font-weight:bold; display:flex; align-items:center; justify-content:center; box-shadow: 0 1px 4px rgba(0,0,0,0.4);">${idx + 1}</div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

        const vMarker = L.marker([pt.lat, pt.lng], { icon: vertexIcon }).addTo(mapInstanceRef.current);
        polygonMarkersRef.current.push(vMarker);
      });
    }
  }, [mode, latitude, longitude, radiusKm, polygon, mapLoaded]);

  // Renderizar otras zonas existentes registradas en el mapa (Verdes para activas)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const L = window.L;
    if (!L) return;

    // Limpiar capas previas
    existingLayersRef.current.forEach((layer) => mapInstanceRef.current.removeLayer(layer));
    existingLayersRef.current = [];

    existingZones.forEach((z) => {
      if (!z.isActive) return;

      if (z.type === "polygon" && Array.isArray(z.polygon) && z.polygon.length >= 3) {
        const polyPts = z.polygon.map((p) => [p.lat, p.lng]);
        const pLayer = L.polygon(polyPts, {
          color: "#10b981",
          fillColor: "#10b981",
          fillOpacity: 0.2,
        }).addTo(mapInstanceRef.current);
        pLayer.bindTooltip(`<b>${z.name}</b><br>Tipo: Polígono (${z.polygon.length} vértices)`, { permanent: false });
        existingLayersRef.current.push(pLayer);
      } else {
        const cLayer = L.circle([z.latitude, z.longitude], {
          color: "#10b981",
          fillColor: "#10b981",
          fillOpacity: 0.15,
          radius: (typeof z.radiusKm === 'number' && !isNaN(z.radiusKm) && z.radiusKm > 0) ? z.radiusKm * 1000 : 10000,
        }).addTo(mapInstanceRef.current);
        cLayer.bindTooltip(`<b>${z.name}</b><br>Radio: ${z.radiusKm} km`, { permanent: false });
        existingLayersRef.current.push(cLayer);
      }
    });
  }, [existingZones, mapLoaded]);

  // Buscador por Dirección o Ciudad con Nominatim
  async function handleSearchAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}`
      );
      if (!res.ok) throw new Error("Error en el servicio de búsqueda.");

      const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      if (!data || data.length === 0) {
        setSearchError("No se encontraron resultados para esa dirección o ciudad.");
      } else {
        const first = data[0]!;
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);

        if (!isNaN(lat) && !isNaN(lng)) {
          onChangeLocation(lat, lng);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([lat, lng], 14);
          }
        }
      }
    } catch {
      setSearchError("No se pudo conectar con el servicio de mapas.");
    } finally {
      setSearching(false);
    }
  }

  function handleUndoPoint() {
    if (polygon.length > 0) {
      const updated = polygon.slice(0, -1);
      onChangePolygon(updated);
    }
  }

  function handleClearPolygon() {
    onChangePolygon([]);
  }

  return (
    <div className="space-y-3 rounded-lg border p-3 bg-card">
      {/* Selector de Modo: Radio en KM vs Polígono Personalizado */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
        <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-md">
          <Button
            type="button"
            size="sm"
            variant={mode === "radius" ? "default" : "ghost"}
            className="h-7 text-xs"
            onClick={() => onChangeMode("radius")}
          >
            <Circle className="mr-1 h-3.5 w-3.5" /> Radio en KM
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "polygon" ? "default" : "ghost"}
            className="h-7 text-xs"
            onClick={() => onChangeMode("polygon")}
          >
            <Pentagon className="mr-1 h-3.5 w-3.5 text-red-400" /> Polígono Personalizado
          </Button>
        </div>

        <span className="text-[11px] text-muted-foreground">
          {mode === "radius"
            ? "Haz clic o arrastra el pin para marcar el centro"
            : "Haz clic secuencialmente en el mapa para marcar los vértices del polígono"}
        </span>
      </div>

      {/* Buscador de dirección */}
      <form onSubmit={(e) => void handleSearchAddress(e)} className="flex gap-2">
        <Input
          placeholder="Buscar por dirección, ciudad o barrio (ej. Miraflores, Lima)..."
          className="h-8 text-xs"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs shrink-0" disabled={searching}>
          {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Search className="mr-1 h-3.5 w-3.5" /> Buscar</>}
        </Button>
      </form>

      {searchError && (
        <p className="text-xs text-red-500">{searchError}</p>
      )}

      {/* Controles de Polígono cuando se está trazando */}
      {mode === "polygon" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded bg-red-50 dark:bg-red-950/40 p-2 text-xs border border-red-200 dark:border-red-900/50">
          <span className="font-semibold text-red-700 dark:text-red-300 flex items-center gap-1">
            <Pentagon className="h-3.5 w-3.5" />
            Vértices marcados: <b>{polygon.length}</b> {polygon.length < 3 ? "(mínimo 3 requeridos)" : "✅ Válido"}
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs border-red-300 dark:border-red-800"
              onClick={handleUndoPoint}
              disabled={polygon.length === 0}
            >
              <Undo2 className="mr-1 h-3 w-3" /> Deshacer Último
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs border-red-300 dark:border-red-800 text-red-600 dark:text-red-400"
              onClick={handleClearPolygon}
              disabled={polygon.length === 0}
            >
              <X className="mr-1 h-3 w-3" /> Limpiar
            </Button>
          </div>
        </div>
      )}

      {/* Contenedor del Mapa */}
      <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
        {!mapLoaded ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" /> Cargando mapa interactivo...
          </div>
        ) : (
          <div ref={mapContainerRef} className="h-full w-full z-0" />
        )}
      </div>

      {latitude && longitude ? (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-secondary/50 p-2 rounded">
          <span className="flex items-center gap-1">
            <Compass className="h-3.5 w-3.5 text-primary" />
            Centro GPS: <b>{latitude.toFixed(6)}, {longitude.toFixed(6)}</b>
          </span>
          <span>
            {mode === "radius" ? (
              <>Radio visual: <b>{radiusKm} km</b></>
            ) : (
              <>Modo: <Badge variant="outline" className="text-[10px] text-red-500 border-red-400">Polígono ({polygon.length} puntos)</Badge></>
            )}
          </span>
        </div>
      ) : null}
    </div>
  );
}
