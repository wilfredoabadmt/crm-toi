"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Compass,
  Loader2,
  Route,
  Info,
} from "lucide-react";
import dynamic from "next/dynamic";
import { type CoverageQueryResult } from "@/server/coverage/naps";

const NapMapClient = dynamic(() => import("./nap-map-client"), {
  ssr: false,
  loading: () => (
    <div className="h-[450px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-500">
      Cargando Mapa del Verificador...
    </div>
  ),
});

export default function NapVerifierView() {
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Lista de NAPs para renderizar en el mapa
  const [napsList, setNapsList] = useState<any[]>([]);

  // Resultado de verificación
  const [result, setResult] = useState<CoverageQueryResult | null>(null);
  const [clientCoords, setClientCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Cargar Cajas NAP iniciales
  useEffect(() => {
    fetch("/api/coverage/naps")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.naps) {
          setNapsList(data.naps);
        }
      })
      .catch((err) => console.error("Error al cargar NAPs en mapa:", err));
  }, []);

  const handleVerify = async (lat?: number, lng?: number, queryText?: string) => {
    setLoading(true);
    setResult(null);

    try {
      const payload: any = {};
      if (typeof lat === "number" && typeof lng === "number") {
        payload.latitud = lat;
        payload.longitud = lng;
      } else {
        payload.coordenadas_o_link = queryText || inputQuery;
      }

      const res = await fetch("/api/v1/cobertura/consultar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error?.message || "Error al verificar cobertura");
      } else {
        setResult(data);
        if (typeof lat === "number" && typeof lng === "number") {
          setClientCoords({ lat, lng });
        } else if (data.polyline_coords && data.polyline_coords.length > 0) {
          const firstPoint = data.polyline_coords[0];
          setClientCoords({ lat: firstPoint[0], lng: firstPoint[1] });
        }
      }
    } catch (err) {
      alert("Error de conexión al servidor de cobertura");
    } finally {
      setLoading(false);
    }
  };

  // Opción B: Usar mi ubicación actual HTML5 Geolocation API
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("La geolocalización no está soportada por tu navegador.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setInputQuery(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        handleVerify(lat, lng);
      },
      (err) => {
        setLoading(false);
        alert(`No se pudo obtener la ubicación: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Opción C: Clic directo en el mapa
  const handleMapClick = (lat: number, lng: number) => {
    setInputQuery(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    handleVerify(lat, lng);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-emerald-400" />
            <span>TOI - Verificador de Cobertura de Cajas NAP</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Mapeo interactivo GPS con ruteo por calles (OSRM) y umbral automático de 300 metros.
          </p>
        </div>

        <button
          onClick={handleUseMyLocation}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shrink-0 disabled:opacity-50"
        >
          <Navigation className="w-4 h-4 fill-white" />
          <span>Usar Mi Ubicación Actual</span>
        </button>
      </div>

      {/* Selector de Entrada de Ubicación */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Ingresa Enlace de Google Maps o Coordenadas Brutas (Ej: -16.479268, -68.274197):
        </label>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Pegar link de Google Maps o lat, lng..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => handleVerify()}
            disabled={loading || !inputQuery.trim()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              <span>Verificar Cobertura</span>
            )}
          </button>
        </div>
      </div>

      {/* Resultados de Factibilidad */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Badge de Factibilidad + Instrucción IA */}
          <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-4 self-start">
            <div
              className={`p-5 rounded-2xl border shadow-md space-y-3 ${
                result.factible
                  ? "bg-emerald-50 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-100 dark:border-emerald-800"
                  : "bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-100 dark:border-amber-800"
              }`}
            >
              <div className="flex items-center gap-2 font-black text-lg">
                {result.factible ? (
                  <>
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-emerald-800 dark:text-emerald-300">[✔] COBERTURA FACTIBLE!</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-amber-800 dark:text-amber-300">[⚠] COBERTURA DISTANTE</span>
                  </>
                )}
              </div>

              {result.nap_asignada && (
                <div className="text-xs space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Caja NAP Asignada:</span>{" "}
                    <span className="font-bold">{result.nap_asignada.codigo}</span> (Red: {result.nap_asignada.red})
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Distancia por Ruta (Calles):</span>{" "}
                    <span className="font-bold text-sm">{result.distancia_ruta_metros} metros</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Distancia Lineal:</span>{" "}
                    <span>{result.distancia_lineal_metros} metros</span>
                  </div>
                </div>
              )}
            </div>

            {/* Mensaje para Agente IA / Operador */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-500" />
                  Instrucción para Agente / Operador
                </span>
                <button
                  onClick={() => copyToClipboard(result.mensaje_para_agente_ia)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copiado" : "Copiar"}</span>
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 font-mono">
                {result.mensaje_para_agente_ia}
              </p>
            </div>

            {/* Pasos de Recorrido por Calles */}
            {result.ruta_pasos && result.ruta_pasos.length > 0 && (
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 max-h-[250px] overflow-y-auto">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200">
                  <Route className="w-4 h-4 text-blue-600" />
                  <span>Guía del Recorrido (Paso a Paso)</span>
                </div>
                <ol className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 list-decimal list-inside">
                  {result.ruta_pasos.map((paso, idx) => (
                    <li key={idx} className="leading-tight">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{paso.instruction}</span>{" "}
                      {paso.distance_m > 0 && (
                        <span className="text-[11px] text-slate-500">({paso.distance_m}m)</span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Mapa Interactivo de Cobertura */}
          <div className="lg:col-span-2">
            <NapMapClient
              naps={napsList.map((n) => ({
                id: n.id,
                napCode: n.napCode,
                lat: n.latitud,
                lng: n.longitud,
                red: n.red,
                puertos: n.puertos,
                estado: n.estado,
              }))}
              clientLocation={clientCoords}
              assignedNapId={result.nap_asignada?.id}
              routePolyline={result.polyline_coords}
              interactiveSelect={true}
              onSelectCoordinates={handleMapClick}
              height="600px"
            />
          </div>
        </div>
      )}

      {/* Mapa sin resultado previo */}
      {!result && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <NapMapClient
            naps={napsList.map((n) => ({
              id: n.id,
              napCode: n.napCode,
              lat: n.latitud,
              lng: n.longitud,
              red: n.red,
              puertos: n.puertos,
              estado: n.estado,
            }))}
            interactiveSelect={true}
            onSelectCoordinates={handleMapClick}
            height="500px"
          />
        </div>
      )}
    </div>
  );
}
