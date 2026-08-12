"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Props = {
  onSuccess?: () => void;
};

export default function NapExcelImporter({ onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message?: string;
    total?: number;
    created?: number;
    updated?: number;
    error?: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/coverage/naps/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, error: data.error?.message || "Error al subir Excel" });
      } else {
        setResult({
          ok: true,
          message: data.message,
          total: data.total,
          created: data.created,
          updated: data.updated,
        });
        setFile(null);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setResult({ ok: false, error: err.message || "Error de red al procesar el archivo" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
        <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        <span>Importación Masiva desde Excel (UBICACION DE LAS NAPS_TOI.xlsx)</span>
      </div>

      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100/50 transition">
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="hidden"
          id="nap-excel-file-input"
        />
        <label
          htmlFor="nap-excel-file-input"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          <Upload className="w-8 h-8 text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {file ? file.name : "Selecciona o arrastra el archivo Excel de Cajas NAP (.xlsx)"}
          </span>
          <span className="text-xs text-slate-500">
            Parseo automático de NAP, TIPO (Puertos), UBICACIÓN, LATITUD, LONGITUD y RED.
          </span>
        </label>
      </div>

      {file && (
        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importando...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Procesar e Importar Excel</span>
              </>
            )}
          </button>
        </div>
      )}

      {result && (
        <div
          className={`p-3.5 rounded-lg text-sm flex items-start gap-3 ${
            result.ok
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          )}
          <div>
            {result.ok ? (
              <div>
                <p className="font-semibold">{result.message}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Total de filas procesadas: {result.total} | Nuevas: {result.created} | Actualizadas: {result.updated}
                </p>
              </div>
            ) : (
              <p className="font-medium">{result.error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
