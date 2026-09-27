"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  Calendar,
  Users,
  CheckCircle2,
  Smartphone,
  AlertCircle,
  X,
  Megaphone,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface CampaignDraftData {
  name: string;
  templateId: string;
  templateName: string;
  variableValues?: Record<string, string>;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "document" | null;
  targetType: "all_contacts" | "pipeline_stages";
  targetStageIds?: string[];
  targetStageNames?: string[];
  scheduledAt?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  phoneNumberId?: string | null;
  estimatedAudience?: number;
}

interface CampaignAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userRole: string;
}

const QUICK_PROMPTS = [
  "Quiero enviar una promoción de instalación de fibra óptica para leads nuevos.",
  "¿Qué plantillas aprobadas tenemos disponibles?",
  "Crea una campaña para reactivar a los contactos en cotización.",
  "Avisa a los clientes que tenemos nuevo número de atención técnica.",
];

export function CampaignAiModal({
  isOpen,
  onClose,
  onSuccess,
  userRole,
}: CampaignAiModalProps) {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "initial",
      role: "assistant",
      content:
        "¡Hola! Soy tu Asistente Inteligente de Campañas de WhatsApp. Dime qué deseas comunicar (promoción, aviso, reactivación) o a qué contactos te gustaría llegar y te ayudaré a armar la campaña paso a paso.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(QUICK_PROMPTS);
  const [currentDraft, setCurrentDraft] = useState<CampaignDraftData | null>(null);

  // Estados de confirmación y prueba telefónica
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; text: string } | null>(null);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, currentDraft]);

  if (!isOpen) return null;

  async function handleSendMessage(textToSend?: string) {
    const text = (textToSend ?? inputValue).trim();
    if (!text || loading) return;

    setInputValue("");
    setActionError(null);
    setTestResult(null);

    const userMessage: MessageItem = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: text,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/campaigns/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error("No se pudo conectar con el servicio del asistente");
      }

      const data = await res.json();
      const action = data.action;

      if (action.type === "campaign_draft") {
        setCurrentDraft({
          name: action.name,
          templateId: action.templateId,
          templateName: action.templateName,
          variableValues: action.variableValues,
          mediaUrl: action.mediaUrl,
          mediaType: action.mediaType,
          targetType: action.targetType,
          targetStageIds: action.targetStageIds,
          targetStageNames: action.targetStageNames,
          scheduledAt: action.scheduledAt,
          departmentId: action.departmentId,
          departmentName: action.departmentName,
          phoneNumberId: action.phoneNumberId,
          estimatedAudience: action.estimatedAudience,
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `asst_${Date.now()}`,
            role: "assistant",
            content: action.text,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `asst_${Date.now()}`,
            role: "assistant",
            content: action.text,
          },
        ]);
      }

      if (action.suggestions && Array.isArray(action.suggestions)) {
        setSuggestions(action.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error procesando mensaje";
      setMessages((prev) => [
        ...prev,
        {
          id: `asst_${Date.now()}`,
          role: "assistant",
          content: `Hubo un error de comunicación: ${msg}. Por favor intenta de nuevo.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendTest() {
    if (!currentDraft || !testPhone.trim() || sendingTest) return;
    setSendingTest(true);
    setTestResult(null);
    setActionError(null);

    try {
      const res = await fetch("/api/campaigns/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: currentDraft.templateId,
          recipientPhone: testPhone.trim(),
          mediaUrl: currentDraft.mediaUrl,
          mediaType: currentDraft.mediaType,
          variableValues: currentDraft.variableValues,
          phoneNumberId: currentDraft.phoneNumberId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Falló el envío de prueba de WhatsApp");
      }

      setTestResult({
        success: true,
        text: `¡Prueba enviada con éxito al WhatsApp ${testPhone}! Revisa tu teléfono.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al enviar prueba";
      setTestResult({
        success: false,
        text: msg,
      });
    } finally {
      setSendingTest(false);
    }
  }

  async function handleConfirmCreate(sendImmediately: boolean = false) {
    if (!currentDraft || creatingCampaign) return;
    setCreatingCampaign(true);
    setActionError(null);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: currentDraft.name,
          templateId: currentDraft.templateId,
          mediaUrl: currentDraft.mediaUrl,
          mediaType: currentDraft.mediaType,
          variableValues: currentDraft.variableValues,
          phoneNumberId: currentDraft.phoneNumberId,
          departmentId: currentDraft.departmentId,
          targetType: currentDraft.targetType,
          targetStageIds: currentDraft.targetStageIds,
          scheduledAt: currentDraft.scheduledAt,
          sendImmediately,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "No se pudo registrar la campaña");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear la campaña";
      setActionError(msg);
    } finally {
      setCreatingCampaign(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col h-[85vh] max-h-[750px]">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                Asistente Inteligente de Campañas
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/30">
                  IA Generativa
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                Crea, segmenta y programa campañas masivas oficiales de WhatsApp conversando con el agente.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido dividido: Chat y Previsualización */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Columna Izquierda: Chat */}
          <div className={`flex flex-col h-full ${currentDraft ? "md:col-span-7" : "md:col-span-12"} border-r border-border/50`}>
            {/* Lista de Mensajes */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted/80 text-foreground border border-border/60 rounded-bl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted/80 border border-border/60 rounded-2xl rounded-bl-none px-4 py-2.5 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>El asistente está analizando plantillas y audiencia…</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Sugerencias rápidas */}
            {suggestions.length > 0 && !loading && (
              <div className="px-4 py-2 bg-muted/20 border-t border-border/40 flex flex-wrap gap-1.5">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(sug)}
                    className="text-xs px-2.5 py-1 rounded-full bg-background border border-border/80 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1"
                  >
                    <span>{sug}</span>
                    <ArrowRight className="w-3 h-3 opacity-60" />
                  </button>
                ))}
              </div>
            )}

            {/* Input de chat */}
            <div className="p-3 border-t border-border bg-background flex items-center gap-2">
              <Input
                placeholder="Escribe tu objetivo o responde al asistente…"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendMessage();
                  }
                }}
                disabled={loading}
                className="flex-1 text-sm bg-muted/30 focus-visible:ring-1"
              />
              <Button
                size="icon"
                onClick={() => void handleSendMessage()}
                disabled={!inputValue.trim() || loading}
                className="shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta de Previsualización y Confirmación */}
          {currentDraft && (
            <div className="md:col-span-5 flex flex-col h-full bg-muted/10 p-5 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-primary" />
                  Borrador Preparado
                </span>
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-300">
                  Listo para Confirmar
                </Badge>
              </div>

              {/* Tarjeta de Resumen */}
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Nombre de Campaña:</span>
                  <p className="font-medium text-foreground">{currentDraft.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
                  <div>
                    <span className="text-muted-foreground">Plantilla Oficial:</span>
                    <p className="font-semibold text-foreground truncate">{currentDraft.templateName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Audiencia Estimada:</span>
                    <p className="font-semibold text-primary flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {currentDraft.estimatedAudience ?? "Calculando…"} contactos
                    </p>
                  </div>
                </div>

                {currentDraft.targetStageNames && currentDraft.targetStageNames.length > 0 && (
                  <div className="pt-1 border-t border-border/40 text-xs">
                    <span className="text-muted-foreground">Etapas Filtradas:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {currentDraft.targetStageNames.map((stg, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] py-0">
                          {stg}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {currentDraft.departmentName && (
                  <div className="pt-1 border-t border-border/40 text-xs">
                    <span className="text-muted-foreground">Línea Emisora:</span>
                    <p className="font-medium text-foreground flex items-center gap-1 mt-0.5">
                      <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                      {currentDraft.departmentName}
                    </p>
                  </div>
                )}

                {currentDraft.variableValues && Object.keys(currentDraft.variableValues).length > 0 && (
                  <div className="pt-1 border-t border-border/40 text-xs">
                    <span className="text-muted-foreground">Variables de Mensaje:</span>
                    <div className="bg-muted/40 rounded p-2 mt-1 space-y-0.5">
                      {Object.entries(currentDraft.variableValues).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-muted-foreground font-mono">{"{{" + k + "}}"}:</span>
                          <span className="font-medium text-foreground">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-1 border-t border-border/40 text-xs flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>
                    {currentDraft.scheduledAt
                      ? `Programada para: ${new Date(currentDraft.scheduledAt).toLocaleString()}`
                      : "Salida inmediata tras confirmación"}
                  </span>
                </div>
              </div>

              {/* Sección de Prueba a mi WhatsApp */}
              <div className="bg-background border border-border/80 rounded-xl p-3.5 space-y-2">
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-primary" />
                  Enviar prueba a mi WhatsApp
                </span>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ej: +59178901234"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleSendTest()}
                    disabled={!testPhone.trim() || sendingTest}
                    className="shrink-0 h-8 text-xs gap-1"
                  >
                    {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3 h-3" />}
                    Probar
                  </Button>
                </div>
                {testResult && (
                  <p
                    className={`text-[11px] leading-tight flex items-center gap-1 ${
                      testResult.success ? "text-emerald-600" : "text-destructive"
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    {testResult.text}
                  </p>
                )}
              </div>

              {actionError && (
                <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-1.5 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Botones de Confirmación y Creación */}
              <div className="pt-2 space-y-2">
                <Button
                  onClick={() => void handleConfirmCreate(false)}
                  disabled={creatingCampaign}
                  className="w-full text-sm font-semibold shadow-md gap-2"
                >
                  {creatingCampaign ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {userRole === "owner" ? "Confirmar y Programar Campaña" : "Guardar para Aprobación"}
                </Button>

                {userRole === "owner" && (
                  <Button
                    variant="outline"
                    onClick={() => void handleConfirmCreate(true)}
                    disabled={creatingCampaign}
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                  >
                    Confirmar y Enviar de Inmediato
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
