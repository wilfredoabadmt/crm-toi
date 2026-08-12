"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Filter,
  MapPin,
  RefreshCw,
  Loader2,
  X,
  Check,
} from "lucide-react";
import dynamic from "next/dynamic";
import NapExcelImporter from "./nap-excel-importer";

const NapMapClient = dynamic(() => import("./nap-map-client"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-500">
      Cargando Mapa...
    </div>
  ),
});

export type CajaNap = {
  id: string;
  napCode: string;
  puertos: string;
  ubicacionRaw: string | null;
  latitud: number;
  longitud: number;
  red: string;
  estado: "ACTIVO" | "INACTIVO" | "SATURADO";
  notes: string | null;
  createdAt: string;
};

export default function NapCrudTable() {
  const [naps, setNaps] = useState<CajaNap[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState("");
  const [selectedRed, setSelectedRed] = useState("TODAS");
  const [selectedEstado, setSelectedEstado] = useState("TODOS");

  // Modal Crear / Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNap, setEditingNap] = useState<CajaNap | null>(null);
  const [formData, setFormData] = useState({
    napCode: "",
    puertos: "x16",
    red: "LAGUNAS",
    latitud: -16.49787,
    longitud: -68.25956,
    estado: "ACTIVO" as "ACTIVO" | "INACTIVO" | "SATURADO",
    ubicacionRaw: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchNaps = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedRed !== "TODAS") params.set("red", selectedRed);
      if (selectedEstado !== "TODOS") params.set("estado", selectedEstado);

      const res = await fetch(`/api/coverage/naps?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        setNaps(data.naps);
      }
    } catch (err) {
      console.error("Error al cargar Cajas NAP:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNaps();
  }, [selectedRed, selectedEstado]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNaps();
  };

  const handleOpenCreate = () => {
    setEditingNap(null);
    setFormData({
      napCode: "",
      puertos: "x16",
      red: "LAGUNAS",
      latitud: naps[0]?.latitud ?? -16.49787,
      longitud: naps[0]?.longitud ?? -68.25956,
      estado: "ACTIVO",
      ubicacionRaw: "",
      notes: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (nap: CajaNap) => {
    setEditingNap(nap);
    setFormData({
      napCode: nap.napCode,
      puertos: nap.puertos,
      red: nap.red,
      latitud: nap.latitud,
      longitud: nap.longitud,
      estado: nap.estado,
      ubicacionRaw: nap.ubicacionRaw || "",
      notes: nap.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingNap ? "PUT" : "POST";
      const payload = editingNap ? { id: editingNap.id, ...formData } : formData;

      const res = await fetch("/api/coverage/naps", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setModalOpen(false);
        fetchNaps();
      } else {
        alert(data.error?.message || "Error al guardar Caja NAP");
      }
    } catch (err) {
      alert("Error de red al guardar Caja NAP");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/coverage/naps?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteConfirmId(null);
        fetchNaps();
      }
    } catch (err) {
      alert("Error al eliminar la Caja NAP");
    }
  };

  // Obtener lista única de Zonas de Red para el filtro
  const uniqueRedes = Array.from(
    new Set(["LAGUNAS", "SAN ROQUE", "CIELO MALL", "COMPLEJO", "KISWARAS", "SENKATA", "CAPACASI", ...naps.map((n) => n.red)])
  );

  return (
    <div className="space-y-6">
      {/* Importador Masivo de Excel */}
      <NapExcelImporter onSuccess={fetchNaps} />

      {/* Controles de Búsqueda y Filtros */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto flex-1">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código NAP, red o puertos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition"
          >
            Buscar
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Red:</span>
            <select
              value={selectedRed}
              onChange={(e) => setSelectedRed(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs py-1.5 px-2 font-medium"
            >
              <option value="TODAS">Todas las Redes</option>
              {uniqueRedes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <span>Estado:</span>
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs py-1.5 px-2 font-medium"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="ACTIVO">ACTIVO</option>
              <option value="INACTIVO">INACTIVO</option>
              <option value="SATURADO">SATURADO</option>
            </select>
          </div>

          <button
            onClick={fetchNaps}
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Caja NAP</span>
          </button>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span>Cargando Cajas NAP...</span>
          </div>
        ) : naps.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <MapPin className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No se encontraron Cajas NAP</p>
            <p className="text-xs text-slate-400 mt-1">
              Prueba cambiando los filtros de búsqueda o importa un archivo Excel.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-xs">
                <tr>
                  <th className="py-3 px-4">Código NAP</th>
                  <th className="py-3 px-4">Zona de Red</th>
                  <th className="py-3 px-4">Puertos</th>
                  <th className="py-3 px-4">Coordenadas (Lat, Lng)</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {naps.map((nap) => (
                  <tr key={nap.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{nap.napCode}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                        {nap.red}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">{nap.puertos}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                      {nap.latitud.toFixed(5)}, {nap.longitud.toFixed(5)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          nap.estado === "ACTIVO"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : nap.estado === "SATURADO"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {nap.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(nap)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 rounded transition"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {deleteConfirmId === nap.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 p-1 rounded border border-rose-200">
                            <button
                              onClick={() => handleDelete(nap.id)}
                              className="p-1 text-rose-600 hover:text-rose-800 font-bold text-xs"
                              title="Confirmar Borrado"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="p-1 text-slate-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(nap.id)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 rounded transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {editingNap ? `Editar Caja NAP: ${editingNap.napCode}` : "Registrar Nueva Caja NAP"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Código NAP *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: C1, 110 - ODN 2C"
                    value={formData.napCode}
                    onChange={(e) => setFormData({ ...formData, napCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Puertos / Tipo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: x16, x8, x6"
                    value={formData.puertos}
                    onChange={(e) => setFormData({ ...formData, puertos: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Zona de Red *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: SAN ROQUE, LAGUNAS"
                    value={formData.red}
                    onChange={(e) => setFormData({ ...formData, red: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estado *
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm font-semibold"
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                    <option value="SATURADO">SATURADO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Latitud *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.latitud}
                    onChange={(e) => setFormData({ ...formData, latitud: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Longitud *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.longitud}
                    onChange={(e) => setFormData({ ...formData, longitud: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              {/* Selector en Mapa Interactivo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ubicación en Mapa (Haz clic o arrastra para ajustar coordenadas):
                </label>
                <NapMapClient
                  naps={[]}
                  clientLocation={{ lat: formData.latitud, lng: formData.longitud }}
                  interactiveSelect={true}
                  onSelectCoordinates={(lat, lng) =>
                    setFormData({
                      ...formData,
                      latitud: parseFloat(lat.toFixed(6)),
                      longitud: parseFloat(lng.toFixed(6)),
                    })
                  }
                  height="260px"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar Caja NAP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
