"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Image as ImageIcon,
  Loader2,
  Play,
  StopCircle,
  Video,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CampaignDetail {
  id: string;
  name: string;
  status: "draft" | "pending_approval" | "scheduled" | "sending" | "completed" | "cancelled" | "failed";
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "document" | null;
  variableValues?: Record<string, string> | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  template?: {
    id: string;
    name: string;
    language: string;
    body: string;
  } | null;
  creator?: {
    name: string;
    email: string;
  } | null;
  sampleRecipients?: Array<{
    id: string;
    contactName: string;
    phone: string;
    status: "pending" | "sent" | "delivered" | "read" | "failed";
    error?: string | null;
  }>;
}

interface CampaignDetailModalProps {
  campaignId: string | null;
  onClose: () => void;
  onRefresh: () => void;
  userRole: string;
}

export function CampaignDetailModal({
  campaignId,
  onClose,
  onRefresh,
  userRole,
}: CampaignDetailModalProps) {
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      if (!res.ok) throw new Error("Error al obtener detalle de la campaña");
      const json = (await res.json()) as { campaign: CampaignDetail };
      setData(json.campaign);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error de carga");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  async function handleAction(action: "approve" | "cancel" | "execute_now") {
    if (!campaignId) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Error procesando acción");
      }

      await fetchDetail();
      onRefresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Fallo en la acción");
    } finally {
      setActionLoading(false);
    }
  }

  if (!campaignId) return null;

  const pct = data && data.totalRecipients > 0
    ? Math.round(((data.sentCount + data.failedCount) / data.totalRecipients) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        className="flex h-[85vh] max-h-[750px] w-full max-w-3xl flex-col rounded-xl border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/20">
          <div>
            <h3 className="text-base font-bold text-foreground">
              {data?.name || "Detalle de Campaña"}
            </h3>
            <p className="text-xs text-muted-foreground">
              ID: <span className="font-mono">{campaignId}</span> · Creada por {data?.creator?.name || "Usuario"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Cuerpo con Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
              <span>Cargando datos...</span>
            </div>
          ) : data ? (
            <>
              {/* Tarjetas de Métricas de Entrega */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border bg-card p-3 text-center">
                  <p className="text-[11px] font-medium text-muted-foreground">Total Audiencia</p>
                  <p className="text-xl font-extrabold text-foreground mt-0.5">{data.totalRecipients}</p>
                </div>
                <div className="rounded-lg border bg-card p-3 text-center">
                  <p className="text-[11px] font-medium text-emerald-600">Enviados con Éxito</p>
                  <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{data.sentCount}</p>
                </div>
                <div className="rounded-lg border bg-card p-3 text-center">
                  <p className="text-[11px] font-medium text-blue-600">Entregados en Celular</p>
                  <p className="text-xl font-extrabold text-blue-600 mt-0.5">{data.deliveredCount}</p>
                </div>
                <div className="rounded-lg border bg-card p-3 text-center">
                  <p className="text-[11px] font-medium text-destructive">Fallidos / Errores</p>
                  <p className="text-xl font-extrabold text-destructive mt-0.5">{data.failedCount}</p>
                </div>
              </div>

              {/* Barra de Progreso de Envío */}
              <div className="rounded-lg border bg-muted/15 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Progreso de Despacho</span>
                  <span>{pct}% ({data.sentCount + data.failedCount} de {data.totalRecipients})</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-brand transition-all duration-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Detalles de Configuración y Plantilla */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg border bg-card p-3.5 space-y-2">
                  <p className="font-bold text-muted-foreground uppercase tracking-wider text-[10.5px]">
                    Plantilla de WhatsApp
                  </p>
                  <p className="font-semibold text-foreground text-sm">
                    {data.template?.name || "Sin nombre"} ({data.template?.language.toUpperCase()})
                  </p>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 p-2 rounded border">
                    {data.template?.body}
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-3.5 space-y-2.5">
                  <p className="font-bold text-muted-foreground uppercase tracking-wider text-[10.5px]">
                    Cronograma y Recursos
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        Estado: <strong className="capitalize">{data.status.replace("_", " ")}</strong>
                      </span>
                    </div>
                    {data.scheduledAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Programada: {new Date(data.scheduledAt).toLocaleString()}</span>
                      </div>
                    )}
                    {data.mediaUrl && (
                      <div className="flex items-center gap-2 pt-1">
                        {data.mediaType === "video" ? (
                          <Video className="h-4 w-4 text-brand" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-emerald-600" />
                        )}
                        <a
                          href={data.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand hover:underline font-medium truncate max-w-[220px]"
                        >
                          Ver archivo ({data.mediaType?.toUpperCase()})
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Muestra de Destinatarios */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Destinatarios (Muestra de primeros 50)
                </p>
                <div className="max-h-48 overflow-y-auto rounded-lg border divide-y text-xs">
                  {data.sampleRecipients && data.sampleRecipients.length > 0 ? (
                    data.sampleRecipients.map((rcpt) => (
                      <div key={rcpt.id} className="flex items-center justify-between p-2.5 hover:bg-muted/20">
                        <div>
                          <span className="font-semibold text-foreground">{rcpt.contactName}</span>
                          <span className="text-muted-foreground ml-2 font-mono">{rcpt.phone}</span>
                          {rcpt.error && (
                            <p className="text-[11px] text-destructive mt-0.5">{rcpt.error}</p>
                          )}
                        </div>
                        <Badge
                          variant={
                            rcpt.status === "sent" || rcpt.status === "delivered" || rcpt.status === "read"
                              ? "outline"
                              : rcpt.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {rcpt.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-xs">
                      No hay destinatarios registrados.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer con Botones de Acción */}
        <div className="flex items-center justify-between border-t px-6 py-4 bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>

          <div className="flex items-center gap-2">
            {/* Si está pendiente y es owner -> botón para Aprobar */}
            {data?.status === "pending_approval" && userRole === "owner" && (
              <Button
                size="sm"
                onClick={() => void handleAction("approve")}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Aprobar y Programar Campaña
              </Button>
            )}

            {/* Si está programada y es owner -> botón para Forzar Despacho Inmediato */}
            {data?.status === "scheduled" && userRole === "owner" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleAction("execute_now")}
                disabled={actionLoading}
              >
                <Play className="mr-1.5 h-4 w-4 text-brand" />
                Despachar Ahora Mismo
              </Button>
            )}

            {/* Botón para Cancelar */}
            {data && (data.status === "scheduled" || data.status === "pending_approval" || data.status === "sending") && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (confirm("¿Seguro que deseas cancelar esta campaña?")) {
                    void handleAction("cancel");
                  }
                }}
                disabled={actionLoading}
              >
                <StopCircle className="mr-1.5 h-4 w-4" />
                Cancelar Campaña
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
