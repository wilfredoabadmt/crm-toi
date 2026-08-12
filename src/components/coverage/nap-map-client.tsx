"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type NapMapPin = {
  id: string;
  napCode: string;
  lat: number;
  lng: number;
  red: string;
  puertos: string;
  estado: string;
};

type Props = {
  naps: NapMapPin[];
  clientLocation?: { lat: number; lng: number } | null;
  assignedNapId?: string | null;
  routePolyline?: Array<[number, number]>;
  onSelectCoordinates?: (lat: number, lng: number) => void;
  interactiveSelect?: boolean;
  height?: string;
};

// Crear íconos SVG limpios para evitar problemas con assets estáticos de Leaflet
const createCustomIcon = (color: string, label?: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="30" height="44">
      <path fill="${color}" stroke="#ffffff" stroke-width="1.8" d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z"/>
      <circle cx="12" cy="12" r="5" fill="#ffffff"/>
      ${
        label
          ? `<text x="12" y="15" font-size="8" font-weight="bold" fill="#1e293b" text-anchor="middle">${label}</text>`
          : ""
      }
    </svg>
  `;
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: svg,
    iconSize: [30, 44],
    iconAnchor: [15, 44],
    popupAnchor: [0, -38],
  });
};

const iconClient = createCustomIcon("#2563eb"); // Azul vibrante para Cliente
const iconNapActive = createCustomIcon("#16a34a"); // Verde para NAP Activa
const iconNapAssigned = createCustomIcon("#059669"); // Esmeralda destacado para NAP Asignada
const iconNapInactive = createCustomIcon("#94a3b8"); // Gris para Inactiva / Saturada

export default function NapMapClient({
  naps,
  clientLocation,
  assignedNapId,
  routePolyline,
  onSelectCoordinates,
  interactiveSelect = false,
  height = "550px",
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const polylineLayer = useRef<L.Polyline | null>(null);
  const isInitialRender = useRef(true);

  // Inicializar Mapa
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    // Coordenadas iniciales por defecto (El Alto / La Paz)
    const initialLat = clientLocation?.lat ?? naps[0]?.lat ?? -16.497;
    const initialLng = clientLocation?.lng ?? naps[0]?.lng ?? -68.259;

    const map = L.map(mapRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | TOI Cobertura',
      maxZoom: 19,
    }).addTo(map);

    markersLayer.current = L.layerGroup().addTo(map);
    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  // Manejar clics interactivos en el mapa para marcar posición del cliente
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (interactiveSelect && onSelectCoordinates) {
        onSelectCoordinates(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [interactiveSelect, onSelectCoordinates]);

  // Actualizar marcadores, polilíneas y encuadre de cámara (Zoom inteligente)
  useEffect(() => {
    const map = leafletMap.current;
    const layer = markersLayer.current;
    if (!map || !layer) return;

    layer.clearLayers();

    if (polylineLayer.current) {
      polylineLayer.current.remove();
      polylineLayer.current = null;
    }

    const allNapsBounds = L.latLngBounds([]);

    // 1. Renderizar Marcadores de Cajas NAP
    naps.forEach((nap) => {
      const isAssigned = nap.id === assignedNapId;
      const icon = isAssigned
        ? iconNapAssigned
        : nap.estado === "ACTIVO"
        ? iconNapActive
        : iconNapInactive;

      const marker = L.marker([nap.lat, nap.lng], {
        icon,
        zIndexOffset: isAssigned ? 1000 : 0,
      }).bindPopup(`
        <div class="p-1 font-sans text-xs">
          <div class="font-bold text-sm text-slate-800">${nap.napCode}</div>
          <div class="text-slate-600">Red: <span class="font-semibold">${nap.red}</span></div>
          <div class="text-slate-600">Puertos: <span class="font-semibold">${nap.puertos}</span></div>
          <div class="mt-1">
            <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
              nap.estado === "ACTIVO"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-700"
            }">${nap.estado}</span>
          </div>
        </div>
      `);

      marker.addTo(layer);
      allNapsBounds.extend([nap.lat, nap.lng]);
    });

    // 2. Renderizar Marcador del Cliente
    if (clientLocation) {
      const clientMarker = L.marker([clientLocation.lat, clientLocation.lng], {
        icon: iconClient,
        draggable: interactiveSelect,
        zIndexOffset: 2000, // Siempre visible por encima
      }).bindPopup(`
        <div class="p-1 font-sans text-xs font-bold text-blue-600">
          📍 Ubicación Marcada del Cliente
        </div>
      `);

      if (interactiveSelect) {
        clientMarker.on("dragend", (e: any) => {
          const latLng = e.target.getLatLng();
          if (onSelectCoordinates) {
            onSelectCoordinates(latLng.lat, latLng.lng);
          }
        });
      }

      clientMarker.addTo(layer);
    }

    // 3. Trazar Polilínea de Ruta si existe
    if (routePolyline && routePolyline.length >= 2) {
      polylineLayer.current = L.polyline(routePolyline, {
        color: "#2563eb",
        weight: 5,
        opacity: 0.9,
        dashArray: "8, 8",
      }).addTo(map);
    }

    // 4. ZOOM ELEGANTE E INTELIGENTE: Mantener la cámara donde marcó el cliente
    setTimeout(() => {
      map.invalidateSize();

      if (clientLocation) {
        // Enfoque exclusivo en la ubicación del cliente y la NAP asignada/ruta
        const focusBounds = L.latLngBounds([[clientLocation.lat, clientLocation.lng]]);

        const assignedNap = naps.find((n) => n.id === assignedNapId);
        if (assignedNap) {
          focusBounds.extend([assignedNap.lat, assignedNap.lng]);
        }

        if (routePolyline && routePolyline.length > 0) {
          routePolyline.forEach((pt) => focusBounds.extend(pt));
        }

        if (assignedNap || (routePolyline && routePolyline.length > 0)) {
          // Encuadre cercano entre el cliente y su NAP asignada
          map.fitBounds(focusBounds, { padding: [60, 60], maxZoom: 17, animate: true });
        } else {
          // Centrado directo en el punto marcado a nivel de calle
          map.setView([clientLocation.lat, clientLocation.lng], 16, { animate: true });
        }
      } else if (isInitialRender.current && allNapsBounds.isValid() && naps.length > 0) {
        // Vista general solo en la carga inicial cuando no hay cliente seleccionado
        map.fitBounds(allNapsBounds, { padding: [40, 40], maxZoom: 15 });
        isInitialRender.current = false;
      }
    }, 150);
  }, [naps, clientLocation, assignedNapId, routePolyline]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800">
      <div ref={mapRef} style={{ height, width: "100%" }} />
      {interactiveSelect && (
        <div className="absolute top-3 right-3 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <span>📍 Haz clic en el mapa para marcar coordenadas</span>
        </div>
      )}
    </div>
  );
}
