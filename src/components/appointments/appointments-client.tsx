"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  List,
  MapPin,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  User,
  Wrench,
  AlertCircle,
  Phone,
  Bot,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AppointmentModal } from "./appointment-modal";

export interface AppointmentItem {
  id: string;
  title: string;
  type: "instalacion" | "visita_tecnica" | "reunion" | "revision";
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  scheduledAt: string;
  durationMinutes: number;
  locationAddress?: string | null;
  locationCoords?: string | null;
  meetingUrl?: string | null;
  notes?: string | null;
  confirmationStatus: "pending" | "sent" | "delivered" | "failed" | "none";
  createdByType: "user" | "ai_agent";
  contact: {
    id: string;
    name: string;
    phone: string;
  };
  assignedUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

const TYPE_CONFIG: Record<
  AppointmentItem["type"],
  { label: string; color: string; bgBadge: string }
> = {
  instalacion: {
    label: "Instalación",
    color: "text-blue-600",
    bgBadge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  visita_tecnica: {
    label: "Visita Técnica",
    color: "text-amber-600",
    bgBadge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  reunion: {
    label: "Reunión",
    color: "text-purple-600",
    bgBadge: "bg-purple-50 text-purple-700 border-purple-200",
  },
  revision: {
    label: "Revisión",
    color: "text-emerald-600",
    bgBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

const STATUS_CONFIG: Record<
  AppointmentItem["status"],
  { label: string; badgeVariant: "outline" | "secondary"; colorClass: string }
> = {
  scheduled: {
    label: "Programada",
    badgeVariant: "outline",
    colorClass: "bg-blue-500/10 text-blue-700 border-blue-300",
  },
  confirmed: {
    label: "Confirmada",
    badgeVariant: "outline",
    colorClass: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  },
  completed: {
    label: "Completada",
    badgeVariant: "outline",
    colorClass: "bg-slate-500/10 text-slate-700 border-slate-300",
  },
  cancelled: {
    label: "Cancelada",
    badgeVariant: "secondary",
    colorClass: "bg-red-500/10 text-red-700 border-red-200",
  },
  no_show: {
    label: "No asistió",
    badgeVariant: "secondary",
    colorClass: "bg-amber-500/10 text-amber-700 border-amber-200",
  },
};

export function AppointmentsClient() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentItem | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/appointments");
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error("Error al cargar citas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAppointments();
  }, [fetchAppointments]);

  // Filtrado reactivo
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      if (filterType !== "all" && app.type !== filterType) return false;
      if (filterStatus !== "all" && app.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const contactMatch = app.contact.name.toLowerCase().includes(q) || app.contact.phone.includes(q);
        const titleMatch = app.title.toLowerCase().includes(q);
        const techMatch = app.assignedUser?.name.toLowerCase().includes(q);
        if (!contactMatch && !titleMatch && !techMatch) return false;
      }
      return true;
    });
  }, [appointments, filterType, filterStatus, searchQuery]);

  // Métricas agregadas de cabecera
  const metrics = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayApps = appointments.filter((a) => a.scheduledAt.startsWith(today!));
    const confirmed = appointments.filter((a) => a.status === "confirmed").length;
    const scheduled = appointments.filter((a) => a.status === "scheduled").length;
    const aiGenerated = appointments.filter((a) => a.createdByType === "ai_agent").length;

    return {
      todayCount: todayApps.length,
      confirmedCount: confirmed,
      pendingCount: scheduled,
      aiCount: aiGenerated,
    };
  }, [appointments]);

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-primary" />
            Agenda y Visitas Técnicas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Coordina instalaciones, visitas y reuniones agendadas por tu equipo o por el Agente IA con confirmación de WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchAppointments()}
            disabled={loading}
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Button
            onClick={() => {
              setEditingAppointment(null);
              setModalOpen(true);
            }}
            className="shadow-sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva Cita
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Citas de Hoy</span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{metrics.todayCount}</div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Confirmadas</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{metrics.confirmedCount}</div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Por Atender</span>
            <CalendarIcon className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600">{metrics.pendingCount}</div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Por Agente IA</span>
            <Bot className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-600">{metrics.aiCount}</div>
        </div>
      </div>

      {/* Barra de Filtros y Selector de Vistas */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por contacto, título o técnico…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">Todos los tipos</option>
            <option value="instalacion">Instalación</option>
            <option value="visita_tecnica">Visita Técnica</option>
            <option value="reunion">Reunión Comercial</option>
            <option value="revision">Revisión</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">Todos los estados</option>
            <option value="scheduled">Programada</option>
            <option value="confirmed">Confirmada</option>
            <option value="completed">Completada</option>
            <option value="cancelled">Cancelada</option>
            <option value="no_show">No asistió</option>
          </select>
        </div>

        {/* Alternador de Vista (Calendario vs Lista) */}
        <div className="flex items-center gap-1 rounded-lg border bg-muted/20 p-1 self-end md:self-auto">
          <Button
            variant={viewMode === "calendar" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            className="h-7 text-xs px-2.5 font-medium"
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
            Calendario
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="h-7 text-xs px-2.5 font-medium"
          >
            <List className="mr-1.5 h-3.5 w-3.5" />
            Lista
          </Button>
        </div>
      </div>

      {/* Contenedor Principal: Vista Lista o Vista Calendario */}
      {viewMode === "list" ? (
        <div className="space-y-3">
          {filteredAppointments.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground bg-card">
              <CalendarDays className="mx-auto h-10 w-10 stroke-1 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium">No hay citas registradas</p>
              <p className="text-xs text-muted-foreground mt-1">
                Haz clic en &quot;Nueva Cita&quot; para registrar visitas o reuniones para tu equipo.
              </p>
            </div>
          ) : (
            filteredAppointments.map((app) => (
              <div
                key={app.id}
                onClick={() => {
                  setEditingAppointment(app);
                  setModalOpen(true);
                }}
                className="group cursor-pointer rounded-xl border bg-card p-4 shadow-sm hover:border-primary/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[11px] font-semibold ${TYPE_CONFIG[app.type].bgBadge}`}>
                      {TYPE_CONFIG[app.type].label}
                    </Badge>
                    <Badge variant={STATUS_CONFIG[app.status].badgeVariant} className={`text-[11px] ${STATUS_CONFIG[app.status].colorClass}`}>
                      {STATUS_CONFIG[app.status].label}
                    </Badge>
                    {app.createdByType === "ai_agent" && (
                      <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                        <Bot className="h-3 w-3" />
                        Agendado por IA
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                    {app.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {app.contact.name}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {app.contact.phone}
                    </span>
                    {app.assignedUser && (
                      <span className="flex items-center gap-1.5 text-primary">
                        <Wrench className="h-3.5 w-3.5" />
                        {app.assignedUser.name}
                      </span>
                    )}
                    {app.locationAddress && (
                      <span className="flex items-center gap-1 text-muted-foreground max-w-xs truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {app.locationAddress}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-right shrink-0">
                  <div className="flex flex-col items-start md:items-end">
                    <span className="font-semibold text-foreground">
                      {new Date(app.scheduledAt).toLocaleDateString("es-ES", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(app.scheduledAt).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      ({app.durationMinutes} min)
                    </span>
                  </div>

                  {app.confirmationStatus === "sent" && (
                    <div title="Confirmación de WhatsApp enviada" className="flex items-center gap-1 text-emerald-600 text-[11px] bg-emerald-50 px-2 py-1 rounded">
                      <MessageSquare className="h-3.5 w-3.5" />
                      WhatsApp
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Vista Calendario Mensual / Semanal */
        <CalendarGrid
          appointments={filteredAppointments}
          onSelectAppointment={(app) => {
            setEditingAppointment(app);
            setModalOpen(true);
          }}
        />
      )}

      {/* Modal de Creación / Edición */}
      {modalOpen && (
        <AppointmentModal
          isOpen={modalOpen}
          appointment={editingAppointment}
          onClose={() => {
            setModalOpen(false);
            setEditingAppointment(null);
          }}
          onSuccess={() => {
            setModalOpen(false);
            setEditingAppointment(null);
            void fetchAppointments();
          }}
        />
      )}
    </div>
  );
}

/** Componente de Grilla de Calendario */
function CalendarGrid({
  appointments,
  onSelectAppointment,
}: {
  appointments: AppointmentItem[];
  onSelectAppointment: (app: AppointmentItem) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Días en el mes actual
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Domingo
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Agrupar citas por fecha clave "YYYY-MM-DD"
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, AppointmentItem[]>();
    for (const app of appointments) {
      const dateKey = app.scheduledAt.split("T")[0]!;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(app);
    }
    return map;
  }, [appointments]);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base text-foreground">
          {monthNames[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs px-2"
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs px-2"
            onClick={() => setCurrentDate(new Date())}
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs px-2"
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          >
            Siguiente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border bg-muted/40 text-center text-xs font-semibold text-muted-foreground">
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
          <div key={d} className="bg-card py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border bg-muted/30">
        {/* Espacios vacíos antes del día 1 */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[90px] bg-card/40 p-1.5" />
        ))}

        {/* Días del mes */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const monthPad = String(month + 1).padStart(2, "0");
          const dayPad = String(day).padStart(2, "0");
          const dateKey = `${year}-${monthPad}-${dayPad}`;
          const dayApps = appointmentsByDate.get(dateKey) || [];

          const isToday =
            new Date().toISOString().split("T")[0] === dateKey;

          return (
            <div
              key={day}
              className={`min-h-[100px] p-1.5 bg-card flex flex-col justify-between transition-colors hover:bg-muted/10 ${
                isToday ? "border-2 border-primary/60" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                  }`}
                >
                  {day}
                </span>
                {dayApps.length > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {dayApps.length}
                  </span>
                )}
              </div>

              <div className="mt-1 space-y-1 overflow-y-auto max-h-[70px]">
                {dayApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => onSelectAppointment(app)}
                    className="cursor-pointer truncate rounded px-1.5 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-85 border border-transparent"
                    style={{
                      backgroundColor:
                        app.type === "instalacion"
                          ? "#dbeafe"
                          : app.type === "visita_tecnica"
                          ? "#fef3c7"
                          : "#f3e8ff",
                      color:
                        app.type === "instalacion"
                          ? "#1e40af"
                          : app.type === "visita_tecnica"
                          ? "#92400e"
                          : "#6b21a8",
                    }}
                    title={`${app.title} - ${app.contact.name}`}
                  >
                    {new Date(app.scheduledAt).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    {app.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
