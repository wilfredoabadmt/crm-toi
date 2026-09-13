"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";

interface StatusData {
  isEnabled: boolean;
  isOpen: boolean;
  statusText: string;
  currentLocalTime: string;
  timezone: string;
}

export function ScheduleStatusBadge() {
  const [status, setStatus] = useState<StatusData | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadStatus() {
      try {
        const res = await fetch("/api/business-hours/status");
        if (res.ok && mounted) {
          const data = await res.json();
          setStatus(data);
        }
      } catch {
        // silencioso
      }
    }

    loadStatus();
    // Actualizar cada 2 minutos
    const timer = setInterval(loadStatus, 120000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  if (!status || !status.isEnabled) return null;

  return (
    <Link
      href="/settings/business-hours"
      title={`Horario de atención: ${status.statusText} (${status.currentLocalTime}) - Clic para configurar`}
      className={`group flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors border ${
        status.isOpen
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status.isOpen ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
        }`}
      />
      <span>{status.isOpen ? "Abierto" : "Cerrado"}</span>
      {status.currentLocalTime && (
        <span className="opacity-70 font-mono text-[10px]">
          {status.currentLocalTime}
        </span>
      )}
      <Clock className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
