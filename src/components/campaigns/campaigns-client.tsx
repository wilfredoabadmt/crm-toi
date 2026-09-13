"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  Video,
  Send,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CampaignWizardModal } from "./campaign-wizard-modal";
import { CampaignDetailModal } from "./campaign-detail-modal";

interface CampaignItem {
  id: string;
  name: string;
  status: "draft" | "pending_approval" | "scheduled" | "sending" | "completed" | "cancelled" | "failed";
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "document" | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdAt: string;
  template?: {
    id: string;
    name: string;
    category: string;
    language: string;
    body: string;
  };
  creator?: {
    name: string;
    email: string;
  };
}

const STATUS_CONFIG: Record<
  CampaignItem["status"],
  { label: string; badgeVariant: "secondary" | "outline" | "destructive"; colorClass: string }
> = {
  draft: { label: "Borrador", badgeVariant: "secondary", colorClass: "bg-muted text-muted-foreground" },
  pending_approval: { label: "Pendiente de Aprobación", badgeVariant: "outline", colorClass: "bg-amber-500/10 text-amber-600 border-amber-300" },
  scheduled: { label: "Programada", badgeVariant: "outline", colorClass: "bg-blue-500/10 text-blue-600 border-blue-300" },
  sending: { label: "Enviando…", badgeVariant: "outline", colorClass: "bg-purple-500/10 text-purple-600 border-purple-300 animate-pulse" },
  completed: { label: "Completada", badgeVariant: "outline", colorClass: "bg-emerald-500/10 text-emerald-600 border-emerald-300" },
  cancelled: { label: "Cancelada", badgeVariant: "secondary", colorClass: "bg-muted text-muted-foreground" },
  failed: { label: "Fallida", badgeVariant: "destructive", colorClass: "bg-destructive/10 text-destructive border-destructive/30" },
};

export function CampaignsClient({ userRole }: { userRole: string }) {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "scheduled" | "completed" | "pending_approval" | "draft">("all");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = (await res.json()) as { campaigns: CampaignItem[] };
        setCampaigns(data.campaigns || []);
      }
    } catch {
      // Ignorar error de red inicial
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCampaigns();
  }, [fetchCampaigns]);

  // Filtrado de campañas según la pestaña activa
  const filteredCampaigns = useMemo(() => {
    if (activeTab === "all") return campaigns;
    if (activeTab === "completed") {
      return campaigns.filter((c) => c.status === "completed" || c.status === "cancelled" || c.status === "failed");
    }
    return campaigns.filter((c) => c.status === activeTab);
  }, [campaigns, activeTab]);

  // Métricas agregadas
  const metrics = useMemo(() => {
    const total = campaigns.length;
    const scheduled = campaigns.filter((c) => c.status === "scheduled" || c.status === "sending").length;
    const pending = campaigns.filter((c) => c.status === "pending_approval").length;
    const totalSent = campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);
    const totalDelivered = campaigns.reduce((acc, c) => acc + (c.deliveredCount || 0), 0);
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 100;

    return { total, scheduled, pending, totalSent, deliveryRate };
  }, [campaigns]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Barra de Encabezado */}
      <header className="flex shrink-0 items-center justify-between border-b px-6 py-4 bg-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shadow-2xs">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground leading-none">
              Campañas y Recordatorios
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Difusión programada de plantillas oficiales de WhatsApp con imágenes, videos y variables
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchCampaigns()}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Button
            size="sm"
            onClick={() => setWizardOpen(true)}
            className="bg-brand text-white hover:bg-brand/90"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nueva Campaña
          </Button>
        </div>
      </header>

      {/* Tarjetas de Resumen Métrico */}
      <div className="border-b bg-muted/20 px-6 py-3.5 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-5xl">
          <div className="rounded-lg border bg-card p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Campañas Creadas</span>
              <FileCheck className="h-4 w-4 text-brand" />
            </div>
            <p className="text-2xl font-black text-foreground mt-1">{metrics.total}</p>
          </div>

          <div className="rounded-lg border bg-card p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600">En Despacho / Prog.</span>
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-blue-600 mt-1">{metrics.scheduled}</p>
          </div>

          <div className="rounded-lg border bg-card p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600">Por Aprobar</span>
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-600 mt-1">{metrics.pending}</p>
          </div>

          <div className="rounded-lg border bg-card p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600">Tasa de Entrega</span>
              <Send className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-1">{metrics.deliveryRate}%</p>
          </div>
        </div>
      </div>

      {/* Pestañas de Filtro */}
      <div className="flex items-center border-b px-6 bg-card shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "all"
              ? "border-brand text-brand"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Todas ({campaigns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("scheduled")}
          className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "scheduled"
              ? "border-brand text-brand"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Programadas ({campaigns.filter((c) => c.status === "scheduled" || c.status === "sending").length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pending_approval")}
          className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "pending_approval"
              ? "border-brand text-brand"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Por Aprobar ({campaigns.filter((c) => c.status === "pending_approval").length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "completed"
              ? "border-brand text-brand"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Enviadas / Historial ({campaigns.filter((c) => c.status === "completed" || c.status === "failed" || c.status === "cancelled").length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("draft")}
          className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "draft"
              ? "border-brand text-brand"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Borradores ({campaigns.filter((c) => c.status === "draft").length})
        </button>
      </div>

      {/* Lista de Campañas con Scroll */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
            <span>Cargando campañas…</span>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center max-w-md mx-auto my-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand mb-3">
              <Megaphone className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No hay campañas en esta sección</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
              Crea tu primera campaña para enviar promociones, recordatorios de citas o cobranza por WhatsApp.
            </p>
            <Button
              size="sm"
              onClick={() => setWizardOpen(true)}
              className="mt-4 bg-brand text-white hover:bg-brand/90"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Crear Campaña
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCampaigns.map((camp) => {
              const statusCfg = STATUS_CONFIG[camp.status] || STATUS_CONFIG.draft;
              const pct = camp.totalRecipients > 0
                ? Math.round(((camp.sentCount + camp.failedCount) / camp.totalRecipients) * 100)
                : 0;

              return (
                <div
                  key={camp.id}
                  onClick={() => setSelectedCampaignId(camp.id)}
                  className="group flex flex-col justify-between rounded-xl border bg-card p-4 shadow-2xs hover:border-brand/50 hover:shadow-md transition-all cursor-pointer space-y-3.5"
                >
                  <div className="space-y-2">
                    {/* Badge de Estado y Media */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold border ${statusCfg.colorClass}`}
                      >
                        {statusCfg.label}
                      </span>

                      {camp.mediaUrl && (
                        <span className="flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {camp.mediaType === "video" ? (
                            <Video className="h-3 w-3 text-brand" />
                          ) : (
                            <ImageIcon className="h-3 w-3 text-emerald-600" />
                          )}
                          <span>{camp.mediaType?.toUpperCase()}</span>
                        </span>
                      )}
                    </div>

                    {/* Título de la campaña */}
                    <h3 className="text-sm font-bold text-foreground group-hover:text-brand transition-colors line-clamp-1">
                      {camp.name}
                    </h3>

                    {/* Plantilla asociada */}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      Plantilla: <strong className="text-foreground">{camp.template?.name || "WhatsApp"}</strong>
                    </p>
                  </div>

                  {/* Progreso y Destinatarios */}
                  <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Audiencia:</span>
                      <span className="font-bold text-foreground">{camp.totalRecipients} clientes</span>
                    </div>

                    {/* Barra de progreso */}
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-brand transition-all rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{camp.sentCount} enviados</span>
                      {camp.failedCount > 0 && (
                        <span className="text-destructive font-semibold">{camp.failedCount} fallidos</span>
                      )}
                      <span>{pct}%</span>
                    </div>

                    {/* Fecha de programación o creación */}
                    <div className="pt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {camp.scheduledAt ? (
                        <>
                          <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span>Programada: {new Date(camp.scheduledAt).toLocaleDateString()} {new Date(camp.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>Creada: {new Date(camp.createdAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Asistente de Creación */}
      <CampaignWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={() => void fetchCampaigns()}
        userRole={userRole}
      />

      {/* Modal de Detalle y Acciones */}
      <CampaignDetailModal
        campaignId={selectedCampaignId}
        onClose={() => setSelectedCampaignId(null)}
        onRefresh={() => void fetchCampaigns()}
        userRole={userRole}
      />
    </div>
  );
}
