"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Image as ImageIcon,
  Loader2,
  Send,
  Sparkles,
  Upload,
  Users,
  Video,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  language: string;
  body: string;
  status: "draft" | "pending" | "approved" | "rejected";
}

interface PipelineStageItem {
  id: string;
  name: string;
  kind: "open" | "won" | "lost";
  departmentId?: string | null;
}

interface CampaignWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userRole: string;
}

export function CampaignWizardModal({
  isOpen,
  onClose,
  onSuccess,
  userRole,
}: CampaignWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Estados de datos base
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [stages, setStages] = useState<PipelineStageItem[]>([]);
  const [loadingBase, setLoadingBase] = useState(true);

  // Paso 1: Configuración de contenido
  const [name, setName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "document" | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Paso 2: Audiencia
  const [targetType, setTargetType] = useState<"all_contacts" | "pipeline_stages">("all_contacts");
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [calculatingAudience, setCalculatingAudience] = useState(false);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [sampleContacts, setSampleContacts] = useState<Array<{ name: string; phone: string }>>([]);

  // Paso 3: Programación y prueba
  const [sendOption, setSendOption] = useState<"immediate" | "scheduled">("scheduled");
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    // Por defecto mañana a las 09:00 AM
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testStatusMsg, setTestStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Cargar plantillas y etapas al abrir
  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      setLoadingBase(true);
      try {
        const [tplRes, stgRes] = await Promise.all([
          fetch("/api/templates").catch(() => null),
          fetch("/api/pipeline/stages").catch(() => null),
        ]);

        if (tplRes?.ok) {
          const tplData = (await tplRes.json()) as { templates: TemplateItem[] };
          const approved = (tplData.templates || []).filter((t) => t.status === "approved");
          setTemplates(approved);
          if (approved.length > 0 && !selectedTemplateId) {
            setSelectedTemplateId(approved[0]!.id);
          }
        }

        if (stgRes?.ok) {
          const stgData = (await stgRes.json()) as { stages: PipelineStageItem[] };
          setStages(stgData.stages || []);
        }
      } finally {
        setLoadingBase(false);
      }
    }

    void loadData();
  }, [isOpen, selectedTemplateId]);

  // Plantilla actualmente seleccionada
  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Variables encontradas en la plantilla ({{1}}, {{2}}, etc.)
  const templateVariables = useMemo(() => {
    if (!activeTemplate) return [];
    const matches = activeTemplate.body.match(/\{\{(\d+)\}\}/g) || [];
    const unique = Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, ""))));
    return unique.sort((a, b) => Number(a) - Number(b));
  }, [activeTemplate]);

  // Previsualización interactiva del texto sustituido
  const previewText = useMemo(() => {
    if (!activeTemplate) return "";
    let body = activeTemplate.body;
    for (const v of templateVariables) {
      const val = variableValues[v]?.trim() || `[Variable ${v}]`;
      body = body.replaceAll(`{{${v}}}`, val);
    }
    return body;
  }, [activeTemplate, templateVariables, variableValues]);

  // Subir archivo multimedia a Cloudflare R2
  async function handleMediaUpload(file: File) {
    setUploadingMedia(true);
    setFormError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/campaigns/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Error al subir archivo");
      }

      const data = (await res.json()) as { url: string; mediaType: "image" | "video" | "document" };
      setMediaUrl(data.url);
      setMediaType(data.mediaType);
      setMediaFile(file);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error de subida");
    } finally {
      setUploadingMedia(false);
    }
  }

  // Recalcular audiencia cuando cambian los filtros
  useEffect(() => {
    if (!isOpen || step !== 2) return;

    let active = true;
    setCalculatingAudience(true);

    fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "calculate_audience",
        name: "test",
        templateId: selectedTemplateId || "none",
        targetType,
        targetStageIds: targetType === "pipeline_stages" ? selectedStages : undefined,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setAudienceCount(data.total ?? 0);
        setSampleContacts(data.contacts ?? []);
      })
      .catch(() => {
        if (active) setAudienceCount(0);
      })
      .finally(() => {
        if (active) setCalculatingAudience(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, step, targetType, selectedStages, selectedTemplateId]);

  // Enviar mensaje de prueba al celular del operador
  async function handleTestSend() {
    if (!testPhone.trim()) {
      setTestStatusMsg({ type: "error", text: "Por favor ingresa un número de teléfono para la prueba." });
      return;
    }
    if (!selectedTemplateId) {
      setTestStatusMsg({ type: "error", text: "Selecciona primero una plantilla aprobada." });
      return;
    }

    setSendingTest(true);
    setTestStatusMsg(null);

    try {
      const res = await fetch("/api/campaigns/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          recipientPhone: testPhone.trim(),
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          variableValues,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Meta rechazó el envío de prueba.");
      }

      setTestStatusMsg({
        type: "success",
        text: "¡Mensaje de prueba recibido en tu WhatsApp! Verifica cómo luce.",
      });
    } catch (err: unknown) {
      setTestStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Fallo en el envío de prueba",
      });
    } finally {
      setSendingTest(false);
    }
  }

  // Guardar y despachar o solicitar aprobación
  async function handleSubmit() {
    if (!name.trim()) {
      setFormError("Ingresa un nombre para la campaña");
      setStep(1);
      return;
    }
    if (!selectedTemplateId) {
      setFormError("Debes seleccionar una plantilla aprobada");
      setStep(1);
      return;
    }
    if (audienceCount === 0) {
      setFormError("La audiencia seleccionada no tiene contactos con teléfono válido");
      setStep(2);
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: name.trim(),
          templateId: selectedTemplateId,
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          variableValues,
          targetType,
          targetStageIds: targetType === "pipeline_stages" ? selectedStages : undefined,
          scheduledAt: sendOption === "scheduled" ? new Date(scheduledDate).toISOString() : null,
          sendImmediately: sendOption === "immediate",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Error al crear la campaña");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error al procesar la campaña");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        className="flex h-[90vh] max-h-[820px] w-full max-w-4xl flex-col rounded-xl border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del Modal */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground leading-tight">
                Crear Nueva Campaña / Recordatorio
              </h2>
              <p className="text-xs text-muted-foreground">
                Configura el mensaje, segmenta a tus clientes y programa la fecha de despacho
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Indicador de Pasos */}
        <div className="flex border-b bg-muted/10 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              step === 1
                ? "border-brand text-brand bg-brand/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-[11px]">
              1
            </span>
            <span>1. Mensaje y Multimedia</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              step === 2
                ? "border-brand text-brand bg-brand/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-[11px]">
              2
            </span>
            <span>2. Audiencia y Filtros</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(3)}
            className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              step === 3
                ? "border-brand text-brand bg-brand/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-[11px]">
              3
            </span>
            <span>3. Cronograma y Prueba</span>
          </button>
        </div>

        {/* Mensaje de error general si ocurre */}
        {formError && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Contenido Principal con Scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingBase ? (
            <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
              <span>Cargando plantillas aprobadas y embudos...</span>
            </div>
          ) : (
            <>
              {/* ============================================================ */}
              {/* PASO 1: CONTENIDO Y PLANTILLA */}
              {/* ============================================================ */}
              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Columna Izquierda: Formulario */}
                  <div className="md:col-span-7 space-y-4">
                    <div>
                      <Label htmlFor="camp-name">Nombre de la Campaña o Recordatorio</Label>
                      <Input
                        id="camp-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej. Promoción Fibra Óptica 500MB / Aviso de Mantenimiento"
                        className="mt-1 text-sm"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="camp-tpl">Plantilla Aprobada de WhatsApp</Label>
                        <span className="text-[11px] text-muted-foreground">
                          {templates.length} plantilla(s) disponible(s)
                        </span>
                      </div>
                      <select
                        id="camp-tpl"
                        value={selectedTemplateId}
                        onChange={(e) => {
                          setSelectedTemplateId(e.target.value);
                          setVariableValues({});
                        }}
                        className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.language.toUpperCase()}) · {t.category}
                          </option>
                        ))}
                      </select>
                      {templates.length === 0 && (
                        <p className="mt-1 text-xs text-amber-600">
                          ⚠️ No tienes plantillas aprobadas por Meta. Crea una en Ajustes &gt; Plantillas.
                        </p>
                      )}
                    </div>

                    {/* Cabecera Multimedia Opcional */}
                    <div className="rounded-lg border bg-muted/15 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                          <ImageIcon className="h-3.5 w-3.5 text-brand" />
                          <span>Cabecera Multimedia (Imagen o Video Opcional)</span>
                        </Label>
                        {mediaUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setMediaUrl("");
                              setMediaType(null);
                              setMediaFile(null);
                            }}
                            className="text-[11px] text-destructive hover:underline"
                          >
                            Eliminar archivo
                          </button>
                        )}
                      </div>

                      {mediaUrl ? (
                        <div className="flex items-center gap-3 rounded-md border bg-card p-2 text-xs">
                          {mediaType === "video" ? (
                            <Video className="h-6 w-6 text-brand shrink-0" />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-emerald-600 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1 truncate">
                            <p className="font-semibold truncate">
                              {mediaFile?.name || "Archivo multimedia en Cloudflare R2"}
                            </p>
                            <p className="text-[10.5px] text-muted-foreground truncate">{mediaUrl}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {mediaType?.toUpperCase()}
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-4 text-center">
                          <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                          <p className="text-xs font-medium text-foreground">
                            Arrastra o selecciona una imagen (JPG/PNG) o video (MP4)
                          </p>
                          <p className="text-[10.5px] text-muted-foreground mt-0.5">
                            Se alojará de forma segura en Cloudflare R2 para la entrega por WhatsApp
                          </p>
                          <label className="mt-2.5">
                            <input
                              type="file"
                              accept="image/*,video/mp4"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) void handleMediaUpload(f);
                              }}
                            />
                            <span className="inline-flex h-8 items-center justify-center rounded-md bg-brand px-3 text-xs font-medium text-white shadow-2xs hover:bg-brand/90 cursor-pointer">
                              {uploadingMedia ? (
                                <>
                                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                  Subiendo a R2…
                                </>
                              ) : (
                                "Examinar archivo"
                              )}
                            </span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Formulario de Variables dinámicas */}
                    {templateVariables.length > 0 && (
                      <div className="rounded-lg border bg-muted/15 p-3.5 space-y-2.5">
                        <Label className="text-xs font-semibold">
                          Variables de Texto de la Plantilla
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Completa el valor de cada variable. Puedes dejar la variable 1 vacía para que se reemplace automáticamente por el nombre de cada contacto.
                        </p>
                        <div className="space-y-2">
                          {templateVariables.map((v) => (
                            <div key={v} className="flex items-center gap-2 text-xs">
                              <span className="font-mono font-bold text-brand w-12 text-center bg-brand/10 py-1 rounded">
                                {"{{" + v + "}}"}
                              </span>
                              <Input
                                value={variableValues[v] || ""}
                                onChange={(e) =>
                                  setVariableValues({
                                    ...variableValues,
                                    [v]: e.target.value,
                                  })
                                }
                                placeholder={
                                  v === "1"
                                    ? "Nombre del cliente (vacío = automático)"
                                    : `Valor para variable ${v}`
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Columna Derecha: Vista Previa Fiel tipo WhatsApp */}
                  <div className="md:col-span-5 flex flex-col items-center justify-start">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Vista Previa en WhatsApp
                    </p>

                    {/* Marco simulador de teléfono */}
                    <div className="w-full max-w-[280px] rounded-2xl border-4 border-muted-foreground/20 bg-[#e5ddd5] p-3 shadow-lg min-h-[380px] flex flex-col justify-end">
                      {/* Burbuja de chat WhatsApp */}
                      <div className="rounded-lg bg-white p-2.5 shadow-sm text-xs text-foreground space-y-2">
                        {/* Cabecera multimedia en la burbuja */}
                        {mediaUrl && (
                          <div className="overflow-hidden rounded-md bg-muted/40 border max-h-40 flex items-center justify-center">
                            {mediaType === "video" ? (
                              <video
                                src={mediaUrl}
                                controls
                                className="w-full h-auto max-h-40 object-cover"
                              />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={mediaUrl}
                                alt="Cabecera"
                                className="w-full h-auto max-h-40 object-cover"
                              />
                            )}
                          </div>
                        )}

                        {/* Texto sustituido con variables */}
                        <p className="whitespace-pre-wrap leading-relaxed text-[12px]">
                          {previewText || "Selecciona una plantilla para previsualizar el mensaje."}
                        </p>

                        <div className="text-right text-[9.5px] text-muted-foreground">
                          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* PASO 2: AUDIENCIA Y FILTROS */}
              {/* ============================================================ */}
              {step === 2 && (
                <div className="space-y-6 max-w-2xl mx-auto">
                  <div className="text-center space-y-1">
                    <h3 className="text-base font-bold text-foreground">¿A quién deseas enviar este mensaje?</h3>
                    <p className="text-xs text-muted-foreground">
                      Elige si enviarás a toda tu libreta o a contactos en etapas específicas del Pipeline.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      onClick={() => setTargetType("all_contacts")}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        targetType === "all_contacts"
                          ? "border-brand bg-brand/5 ring-2 ring-brand/20"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                        <Users className="h-4 w-4 text-brand" />
                        <span>Todos los Contactos</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        Envía a todos los clientes registrados activos con un número telefónico válido.
                      </p>
                    </div>

                    <div
                      onClick={() => setTargetType("pipeline_stages")}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        targetType === "pipeline_stages"
                          ? "border-brand bg-brand/5 ring-2 ring-brand/20"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                        <FileText className="h-4 w-4 text-brand" />
                        <span>Por Etapa del Pipeline</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        Filtra únicamente por prospectos o clientes que estén en etapas comerciales clave.
                      </p>
                    </div>
                  </div>

                  {/* Selector de Etapas del Pipeline */}
                  {targetType === "pipeline_stages" && (
                    <div className="rounded-xl border bg-card p-4 space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Selecciona las Etapas del Embudo
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {stages.map((stg) => {
                          const checked = selectedStages.includes(stg.id);
                          return (
                            <label
                              key={stg.id}
                              className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs font-medium cursor-pointer transition-colors ${
                                checked ? "bg-brand/10 border-brand/50 text-brand" : "hover:bg-muted/30"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStages([...selectedStages, stg.id]);
                                  } else {
                                    setSelectedStages(selectedStages.filter((id) => id !== stg.id));
                                  }
                                }}
                                className="rounded text-brand focus:ring-brand"
                              />
                              <span>{stg.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Resumen de Audiencia Calculada */}
                  <div className="rounded-xl border bg-muted/20 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Audiencia estimada a despachar:</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {calculatingAudience ? (
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
                            Calculando contactos elegibles…
                          </span>
                        ) : (
                          <span className="text-xl font-extrabold text-foreground">
                            {audienceCount !== null ? `${audienceCount} contactos calificados` : "0 contactos"}
                          </span>
                        )}
                      </div>
                    </div>

                    {sampleContacts.length > 0 && (
                      <div className="text-right text-[11px] text-muted-foreground">
                        <span className="font-semibold">Ejemplos:</span>{" "}
                        {sampleContacts.slice(0, 2).map((c) => c.name).join(", ")}…
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* PASO 3: CRONOGRAMA Y PRUEBA */}
              {/* ============================================================ */}
              {step === 3 && (
                <div className="space-y-6 max-w-2xl mx-auto">
                  {/* Envío de Prueba Individual */}
                  <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4 text-brand" />
                        <h4 className="text-sm font-bold text-foreground">
                          Envío de Prueba Antierrores (Recomendado)
                        </h4>
                      </div>
                      <Badge variant="outline" className="text-[10.5px]">
                        Seguridad
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Recibe esta plantilla exactamente como la verá un cliente en tu propio número de WhatsApp para comprobar imagen, video y textos.
                    </p>

                    <div className="flex items-center gap-2">
                      <Input
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="Ej. +584141234567 o 584141234567"
                        className="text-xs bg-background h-9"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleTestSend()}
                        disabled={sendingTest || !testPhone.trim()}
                        className="shrink-0"
                      >
                        {sendingTest ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Enviando…
                          </>
                        ) : (
                          "Probar en mi celular"
                        )}
                      </Button>
                    </div>

                    {testStatusMsg && (
                      <p
                        className={`text-xs font-semibold ${
                          testStatusMsg.type === "success" ? "text-emerald-600" : "text-destructive"
                        }`}
                      >
                        {testStatusMsg.text}
                      </p>
                    )}
                  </div>

                  {/* Programación de Fecha y Hora */}
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-brand" />
                      <span>Momento de Despacho de la Campaña</span>
                    </h4>

                    <div className="space-y-2.5">
                      <label className="flex items-center gap-3 cursor-pointer text-xs font-medium">
                        <input
                          type="radio"
                          name="sendOption"
                          value="scheduled"
                          checked={sendOption === "scheduled"}
                          onChange={() => setSendOption("scheduled")}
                          className="text-brand focus:ring-brand"
                        />
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Programar para una fecha y hora específica</span>
                        </div>
                      </label>

                      {sendOption === "scheduled" && (
                        <div className="pl-6 pt-1">
                          <Input
                            type="datetime-local"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="max-w-xs text-xs h-9"
                          />
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            El despachador automático enviará los mensajes al llegar esta fecha y hora.
                          </p>
                        </div>
                      )}

                      <label className="flex items-center gap-3 cursor-pointer text-xs font-medium pt-1">
                        <input
                          type="radio"
                          name="sendOption"
                          value="immediate"
                          checked={sendOption === "immediate"}
                          onChange={() => setSendOption("immediate")}
                          className="text-brand focus:ring-brand"
                        />
                        <span>Despachar de inmediato (en cuanto se confirme)</span>
                      </label>
                    </div>
                  </div>

                  {/* Resumen del Flujo por Rol */}
                  <div className="rounded-lg border bg-muted/20 p-3 text-xs flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-muted-foreground">
                      {userRole === "owner" ? (
                        <>
                          Como <strong>Propietario</strong>, la campaña quedará{" "}
                          <strong>Programada y Lista</strong> para despacho automático sin requerir aprobación adicional.
                        </>
                      ) : (
                        <>
                          Como <strong>Miembro del equipo</strong>, esta campaña quedará en estado{" "}
                          <strong>Pendiente de Aprobación</strong> y será notificada al Propietario antes de su envío.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer con Botones de Navegación de Pasos */}
        <div className="flex items-center justify-between border-t px-6 py-4 bg-muted/20">
          <div>
            {step > 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                disabled={submitting}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Atrás
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancelar
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <Button
                size="sm"
                onClick={() => {
                  if (step === 1) {
                    if (!name.trim()) {
                      setFormError("Ingresa un nombre para la campaña");
                      return;
                    }
                    if (!selectedTemplateId) {
                      setFormError("Selecciona una plantilla aprobada");
                      return;
                    }
                  }
                  setFormError(null);
                  setStep((s) => (s + 1) as 2 | 3);
                }}
              >
                Siguiente
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="bg-brand text-white hover:bg-brand/90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando…
                  </>
                ) : userRole === "owner" ? (
                  sendOption === "immediate" ? (
                    "Lanzar Envío Inmediato"
                  ) : (
                    "Guardar y Programar Campaña"
                  )
                ) : (
                  "Enviar a Aprobación del Propietario"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
