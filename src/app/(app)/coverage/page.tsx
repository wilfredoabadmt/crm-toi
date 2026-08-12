"use client";

import { useState } from "react";
import { MapPin, Sliders, ShieldCheck } from "lucide-react";
import NapVerifierView from "@/components/coverage/nap-verifier-view";
import NapCrudTable from "@/components/coverage/nap-crud-table";

export default function CoveragePage() {
  const [activeTab, setActiveTab] = useState<"verifier" | "crud">("verifier");

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Pestañas Superiores */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("verifier")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
              activeTab === "verifier"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verificador de Cobertura</span>
          </button>

          <button
            onClick={() => setActiveTab("crud")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
              activeTab === "crud"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Gestión de Cajas NAP</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <MapPin className="w-4 h-4 text-emerald-500" />
          <span>Módulo GPS TOI (OpenRouteService / OSRM)</span>
        </div>
      </div>

      {/* Vistas */}
      <div className="pb-12">
        {activeTab === "verifier" ? <NapVerifierView /> : <NapCrudTable />}
      </div>
    </div>
  );
}
