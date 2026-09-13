"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Sparkles,
  MessageSquare,
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface DayConfig {
  dayOfWeek: number;
  isOpen: boolean;
  openTime1: string;
  closeTime1: string;
  openTime2: string | null;
  closeTime2: string | null;
}

const DAY_NAMES: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

const TIMEZONES = [
  { value: "America/La_Paz", label: "Bolivia (La Paz) [UTC-4]" },
  { value: "America/Lima", label: "Perú (Lima) [UTC-5]" },
  { value: "America/Bogota", label: "Colombia (Bogotá) [UTC-5]" },
  { value: "America/Santiago", label: "Chile (Santiago) [UTC-3 / UTC-4]" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (Buenos Aires) [UTC-3]" },
  { value: "America/Asuncion", label: "Paraguay (Asunción) [UTC-4]" },
  { value: "America/Mexico_City", label: "México (CDMX) [UTC-6]" },
  { value: "America/Montevideo", label: "Uruguay (Montevideo) [UTC-3]" },
];

function ToggleSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
        checked ? "bg-brand-primary" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function BusinessHoursClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEnabled, setIsEnabled] = useState(true);
  const [timezone, setTimezone] = useState("America/La_Paz");
  const [outOfHoursAction, setOutOfHoursAction] = useState<
    "none" | "away_message" | "ai_takeover" | "both"
  >("away_message");
  const [awayMessage, setAwayMessage] = useState("");
  const [days, setDays] = useState<DayConfig[]>([]);
  const [currentStatus, setCurrentStatus] = useState<{
    isOpen: boolean;
    statusText: string;
    currentLocalTime: string;
  } | null>(null);

  useEffect(() => {
    fetchSchedule();
  }, []);

  async function fetchSchedule() {
    try {
      setLoading(true);
      const res = await fetch("/api/business-hours");
      if (!res.ok) throw new Error("No se pudo cargar la configuración de horario");
      const data = await res.json();
      if (data.schedule) {
        setIsEnabled(data.schedule.isEnabled);
        setTimezone(data.schedule.timezone || "America/La_Paz");
        setOutOfHoursAction(data.schedule.outOfHoursAction || "away_message");
        setAwayMessage(data.schedule.awayMessage || "");
      }
      if (data.days) {
        setDays(data.days);
      }
      if (data.currentStatus) {
        setCurrentStatus(data.currentStatus);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar horario");
    } finally {
      setLoading(false);
    }
  }

  function handleDayToggle(dayOfWeek: number, checked: boolean) {
    setDays((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, isOpen: checked } : d))
    );
  }

  function handleTimeChange(
    dayOfWeek: number,
    field: keyof DayConfig,
    value: string | null
  ) {
    setDays((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d))
    );
  }

  function handleSplitShiftToggle(dayOfWeek: number, enableSplit: boolean) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        if (enableSplit) {
          return {
            ...d,
            openTime2: "14:30",
            closeTime2: "18:30",
          };
        } else {
          return {
            ...d,
            openTime2: null,
            closeTime2: null,
          };
        }
      })
    );
  }

  function copyMonToWeekdays() {
    const monday = days.find((d) => d.dayOfWeek === 1);
    if (!monday) return;
    setDays((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek >= 2 && d.dayOfWeek <= 5) {
          return {
            ...d,
            isOpen: monday.isOpen,
            openTime1: monday.openTime1,
            closeTime1: monday.closeTime1,
            openTime2: monday.openTime2,
            closeTime2: monday.closeTime2,
          };
        }
        return d;
      })
    );
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const res = await fetch("/api/business-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isEnabled,
          timezone,
          outOfHoursAction,
          awayMessage,
          days,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al guardar cambios");
      }

      const updated = await res.json();
      if (updated.currentStatus) {
        setCurrentStatus(updated.currentStatus);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Clock className="mr-2 h-5 w-5 animate-spin text-brand-primary" />
        <span>Cargando horarios de atención...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header & Status Banner */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">
                Horarios de Atención y Fuera de Horario
              </h2>
              {currentStatus && isEnabled && (
                <Badge
                  variant={currentStatus.isOpen ? "default" : "secondary"}
                  className={
                    currentStatus.isOpen
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium"
                  }
                >
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                      currentStatus.isOpen ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  {currentStatus.isOpen ? "Abierto ahora" : "Cerrado ahora"} (
                  {currentStatus.currentLocalTime})
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Define los rangos de disponibilidad de tu equipo y automatiza
              respuestas cordiales o asistencia por IA cuando tu empresa esté fuera de oficina.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-accent/40 p-2.5 px-4 rounded-lg border">
            <Label htmlFor="master-toggle" className="text-sm font-semibold cursor-pointer">
              Control de horario
            </Label>
            <ToggleSwitch
              id="master-toggle"
              checked={isEnabled}
              onChange={setIsEnabled}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/40 p-3 rounded-lg border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>¡Horarios y reglas guardados correctamente en el sistema!</span>
          </div>
        )}
      </div>

      {/* Reglas Fuera de Horario */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b">
          <MessageSquare className="h-5 w-5 text-brand-primary" />
          <h3 className="font-semibold text-base">
            Comportamiento Fuera de Horario
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Zona Horaria del Negocio
            </Label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Se utiliza para calcular la hora local exacta de apertura y cierre.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              Acción al recibir un mensaje fuera de horario
            </Label>
            <select
              value={outOfHoursAction}
              onChange={(e) =>
                setOutOfHoursAction(
                  e.target.value as "none" | "away_message" | "ai_takeover" | "both"
                )
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="away_message">
                ✉️ Solo enviar mensaje de ausencia
              </option>
              <option value="ai_takeover">
                🤖 Delegar atención al Agente IA
              </option>
              <option value="both">
                ✨ Ambos: Enviar mensaje de ausencia + Delegar a IA
              </option>
              <option value="none">
                🚫 Ninguna acción (Silencioso)
              </option>
            </select>
            <p className="text-xs text-muted-foreground">
              El mensaje de ausencia cuenta con protección anti-spam (máximo 1 envío cada 24h por contacto).
            </p>
          </div>
        </div>

        {(outOfHoursAction === "away_message" || outOfHoursAction === "both") && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="away-msg" className="text-sm font-medium">
                Mensaje Automático de Ausencia
              </Label>
              <span className="text-xs text-muted-foreground">
                Usa <code className="bg-muted px-1 rounded font-mono">{"{{1}}"}</code> para insertar el nombre del cliente
              </span>
            </div>
            <Textarea
              id="away-msg"
              rows={3}
              value={awayMessage}
              onChange={(e) => setAwayMessage(e.target.value)}
              placeholder="Hola {{1}}, nuestro horario es de Lunes a Viernes de 8:30 a 18:30..."
              className="resize-y text-sm"
            />
          </div>
        )}
      </div>

      {/* Cuadrícula Semanal */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-primary" />
            <h3 className="font-semibold text-base">
              Planificación Semanal (Lunes a Domingo)
            </h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyMonToWeekdays}
            className="text-xs gap-1.5 self-start sm:self-auto"
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar Lunes a Martes-Viernes
          </Button>
        </div>

        <div className="divide-y divide-border">
          {days.map((day) => {
            const hasSplit = Boolean(day.openTime2 && day.closeTime2);
            return (
              <div
                key={day.dayOfWeek}
                className={`py-3.5 transition-colors ${
                  !day.isOpen ? "opacity-60 bg-muted/20 px-2 rounded-lg" : ""
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Día y Switch Abierto/Cerrado */}
                  <div className="w-40 flex items-center gap-3">
                    <ToggleSwitch
                      checked={day.isOpen}
                      onChange={(checked) =>
                        handleDayToggle(day.dayOfWeek, checked)
                      }
                    />
                    <div>
                      <span className="font-medium text-sm">
                        {DAY_NAMES[day.dayOfWeek]}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {day.isOpen ? "Abierto" : "Cerrado"}
                      </p>
                    </div>
                  </div>

                  {/* Rangos horarios */}
                  {day.isOpen ? (
                    <div className="flex-1 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-accent/30 p-1.5 px-2.5 rounded-md border text-sm">
                        <span className="text-xs text-muted-foreground mr-1">
                          {hasSplit ? "Turno 1:" : "Horario:"}
                        </span>
                        <Input
                          type="time"
                          value={day.openTime1}
                          onChange={(e) =>
                            handleTimeChange(day.dayOfWeek, "openTime1", e.target.value)
                          }
                          className="h-8 w-24 text-xs font-mono p-1"
                        />
                        <span className="text-muted-foreground text-xs">a</span>
                        <Input
                          type="time"
                          value={day.closeTime1}
                          onChange={(e) =>
                            handleTimeChange(day.dayOfWeek, "closeTime1", e.target.value)
                          }
                          className="h-8 w-24 text-xs font-mono p-1"
                        />
                      </div>

                      {hasSplit && (
                        <div className="flex items-center gap-1.5 bg-accent/30 p-1.5 px-2.5 rounded-md border text-sm">
                          <span className="text-xs text-muted-foreground mr-1">
                            Turno 2:
                          </span>
                          <Input
                            type="time"
                            value={day.openTime2 || "14:30"}
                            onChange={(e) =>
                              handleTimeChange(day.dayOfWeek, "openTime2", e.target.value)
                            }
                            className="h-8 w-24 text-xs font-mono p-1"
                          />
                          <span className="text-muted-foreground text-xs">a</span>
                          <Input
                            type="time"
                            value={day.closeTime2 || "18:30"}
                            onChange={(e) =>
                              handleTimeChange(day.dayOfWeek, "closeTime2", e.target.value)
                            }
                            className="h-8 w-24 text-xs font-mono p-1"
                          />
                        </div>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSplitShiftToggle(day.dayOfWeek, !hasSplit)}
                        className="text-xs text-brand-primary h-8"
                      >
                        {hasSplit ? "Quitar descanso" : "+ Añadir descanso / 2do turno"}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" />
                      El negocio permanece cerrado durante toda la jornada.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón Guardar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-brand-primary text-white hover:bg-brand-primary/90 px-6"
        >
          {saving ? (
            <>
              <Clock className="h-4 w-4 animate-spin" />
              Guardando configuración...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Guardar Horarios y Reglas
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
