"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Bot,
  Calendar,
  MessageSquare,
  Users,
  Clock,
  Download,
  Flame,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AnalyticsSummary, DateRange } from "@/server/reports/service";

const RANGE_LABELS: Record<DateRange, string> = {
  today: "Hoy",
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  month: "Este mes",
};

export function ReportsClient() {
  const [range, setRange] = useState<DateRange>("7d");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics(range);
  }, [range]);

  async function fetchMetrics(selectedRange: DateRange) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/reports?range=${selectedRange}`);
      if (!res.ok) throw new Error("No se pudieron cargar las métricas");
      const data = await res.json();
      setSummary(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al obtener reporte");
    } finally {
      setLoading(false);
    }
  }

  function handleExportCsv() {
    window.open(`/api/reports/export?range=${range}`, "_blank");
  }

  return (
    <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header con Filtros de Fecha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-brand-primary" />
            Panel de Métricas y Rendimiento
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitoreo en tiempo real de volumen de atención, automatización de IA, horas pico y conversión del pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-accent/40 p-1 rounded-lg border">
            {(["today", "7d", "30d", "month"] as DateRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  range === r
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/40 p-3 rounded-lg border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !summary ? (
        <div className="flex h-72 items-center justify-center text-muted-foreground">
          <BarChart3 className="mr-2 h-5 w-5 animate-spin text-brand-primary" />
          <span>Cargando métricas y análisis de datos...</span>
        </div>
      ) : summary ? (
        <div className="space-y-6">
          {/* Tarjetas KPI Principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Conversaciones Activas */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Conversaciones Activas
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Inbox className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">
                  {summary.kpis.totalConversations}
                </span>
                {summary.kpis.unreadConversations > 0 && (
                  <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                    {summary.kpis.unreadConversations} sin leer
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Clientes que interactuaron en este período
              </p>
            </div>

            {/* KPI 2: Automatización por IA */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Automatización IA
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
                  {summary.kpis.aiAutomationRate}%
                </span>
                <span className="text-xs text-muted-foreground">
                  de mensajes salientes
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.kpis.aiGeneratedMessages} respuestas automáticas del Agente
              </p>
            </div>

            {/* KPI 3: Volumen de Mensajes */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Volumen de Mensajes
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">
                  {summary.kpis.totalMessages}
                </span>
                <span className="text-xs text-muted-foreground">totales</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>📥 {summary.kpis.inboundMessages} recibidos</span>
                <span>📤 {summary.kpis.outboundMessages} enviados</span>
              </div>
            </div>

            {/* KPI 4: Conversión y Citas */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Citas y Conversión
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">
                  {summary.kpis.totalAppointments}
                </span>
                <span className="text-xs text-muted-foreground">citas agendadas</span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                <span className="font-semibold text-emerald-600">{summary.kpis.conversionRate}%</span> cierre en pipeline ({summary.kpis.wonLeads} ganados)
              </p>
            </div>
          </div>

          {/* Gráficos de Actividad: Horas Pico y Días de la Semana */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Histograma de Horas Pico (2 columnas) */}
            <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-brand-primary" />
                    Distribución de Actividad por Hora (00:00 - 23:00)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Volumen de mensajes en cada franja horaria para planificar turnos del equipo
                  </p>
                </div>

                <Badge variant="outline" className="gap-1.5 self-start sm:self-auto bg-brand-primary/5 text-brand-primary border-brand-primary/20">
                  <Flame className="h-3.5 w-3.5 text-amber-500" />
                  Hora Pico: <strong>{summary.peakHour.hour}</strong> ({summary.peakHour.total} msgs)
                </Badge>
              </div>

              {/* Visualizador de Barras Horarias */}
              <div className="pt-6">
                {(() => {
                  const maxHourly = Math.max(
                    ...summary.hourlyActivity.map((h) => h.total),
                    1
                  );

                  return (
                    <div className="flex items-end gap-1 sm:gap-1.5 h-44 w-full pt-4 border-b pb-2">
                      {summary.hourlyActivity.map((item) => {
                        const heightPct = Math.round((item.total / maxHourly) * 100);
                        const isPeak = item.total > 0 && item.label === summary.peakHour.hour;

                        return (
                          <div
                            key={item.hour}
                            className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                          >
                            {/* Tooltip Hover */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 pointer-events-none bg-popover text-popover-foreground border text-[11px] font-medium p-1 px-2 rounded shadow-lg whitespace-nowrap z-20">
                              {item.label}: {item.total} msgs ({item.inbound} in / {item.outbound} out)
                            </div>

                            {/* Barra */}
                            <div
                              style={{ height: `${Math.max(heightPct, item.total > 0 ? 8 : 2)}%` }}
                              className={`w-full rounded-t-sm transition-all duration-300 ${
                                isPeak
                                  ? "bg-amber-500 shadow-md shadow-amber-500/20"
                                  : item.total > 0
                                  ? "bg-brand-primary group-hover:bg-brand-primary/80"
                                  : "bg-muted/40"
                              }`}
                            />

                            {/* Etiqueta Eje X (cada 3 horas en pantallas pequeñas) */}
                            <span className="text-[9px] sm:text-[10px] font-mono text-muted-foreground/70 group-hover:text-foreground">
                              {Number(item.hour) % 3 === 0 ? item.hour : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-brand-primary" />
                    Volumen regular
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                    Hora de mayor saturación
                  </span>
                </div>
              </div>
            </div>

            {/* Actividad por Día de la Semana (1 columna) */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-brand-primary" />
                  Carga por Día de la Semana
                </h3>
                <p className="text-xs text-muted-foreground">
                  Días con mayor densidad de interacciones
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {(() => {
                  const maxDay = Math.max(
                    ...summary.weekdayActivity.map((d) => d.total),
                    1
                  );

                  return summary.weekdayActivity.map((day) => {
                    const pct = Math.round((day.total / maxDay) * 100);

                    return (
                      <div key={day.dayNum} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{day.day}</span>
                          <span className="text-muted-foreground font-mono">
                            {day.total} msgs
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-accent/40 overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full rounded-full bg-brand-primary transition-all duration-300"
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Desglose del Pipeline & Productividad por Departamento */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pipeline Funnel */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-brand-primary" />
                    Embudo de Ventas (Pipeline)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Distribución de los {summary.kpis.totalLeads} prospectos por etapa
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                  {summary.kpis.conversionRate}% Conversión
                </Badge>
              </div>

              <div className="space-y-3.5 pt-2">
                {summary.pipelineBreakdown.map((stage) => {
                  const color =
                    stage.kind === "won"
                      ? "bg-emerald-500"
                      : stage.kind === "lost"
                      ? "bg-rose-500"
                      : "bg-brand-primary";

                  return (
                    <div key={stage.stageId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              stage.kind === "won"
                                ? "bg-emerald-500"
                                : stage.kind === "lost"
                                ? "bg-rose-500"
                                : "bg-blue-500"
                            }`}
                          />
                          <span className="font-medium">{stage.stageName}</span>
                          {stage.kind === "won" && (
                            <span className="text-[10px] text-emerald-600 uppercase font-semibold">
                              (Ganados)
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-muted-foreground">
                          {stage.count} leads ({stage.percentage}%)
                        </span>
                      </div>

                      <div className="h-2 w-full rounded-full bg-accent/40 overflow-hidden">
                        <div
                          style={{ width: `${Math.max(stage.percentage, stage.count > 0 ? 5 : 0)}%` }}
                          className={`h-full rounded-full ${color} transition-all duration-300`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Carga por Departamento / Área */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand-primary" />
                  Carga por Departamento y Asesor
                </h3>
                <p className="text-xs text-muted-foreground">
                  Asignación y atención de clientes por área operativa
                </p>
              </div>

              <div className="divide-y divide-border">
                {summary.departmentWorkload.map((dept) => (
                  <div key={dept.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: dept.badgeColor }}
                        />
                        <span className="font-medium text-sm">{dept.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Responsable: <strong className="text-foreground">{dept.assignedName}</strong> ({dept.assignedEmail})
                      </p>
                    </div>

                    <div className="text-right">
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs px-2.5 py-1"
                        style={{
                          backgroundColor: `${dept.badgeColor}15`,
                          color: dept.badgeColor,
                          border: `1px solid ${dept.badgeColor}30`,
                        }}
                      >
                        {dept.activeLeads} en atención
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
