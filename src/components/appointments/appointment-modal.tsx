"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Sparkles,
  Upload,
  User,
  Video,
  X,
  AlertCircle,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AppointmentItem } from "./appointments-client";

interface AppointmentModalProps {
  isOpen: boolean;
  appointment?: AppointmentItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface ContactOption {
  id: string;
  name: string;
  phone: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface TemplateOption {
  id: string;
  name: string;
  language: string;
  category: string;
  body: string;
  status: string;
}

export function AppointmentModal({
  isOpen,
  appointment,
  onClose,
  onSuccess,
}: AppointmentModalProps) {
  const isEditing = Boolean(appointment);

  // Estados de datos
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Campos del formulario
  const [title, setTitle] = useState(appointment?.title || "");
  const [contactId, setContactId] = useState(appointment?.contact.id || "");
  const [type, setType] = useState<AppointmentItem["type"]>(
    appointment?.type || "visita_tecnica"
  );
  const [status, setStatus] = useState<AppointmentItem["status"]>(
    appointment?.status || "scheduled"
  );
  
  // Fecha y hora local
  const defaultDate = appointment?.scheduledAt
    ? new Date(appointment.scheduledAt).toISOString().slice(0, 16)
    : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);

  const [scheduledAt, setScheduledAt] = useState(defaultDate);
  const [durationMinutes, setDurationMinutes] = useState(
    appointment?.durationMinutes || 60
  );
  const [assignedUserId, setAssignedUserId] = useState(
    appointment?.assignedUser?.id || ""
  );
  const [locationAddress, setLocationAddress] = useState(
    appointment?.locationAddress || ""
  );
  const [meetingUrl, setMeetingUrl] = useState(appointment?.meetingUrl || "");
  const [notes, setNotes] = useState(appointment?.notes || "");

  // Confirmación por WhatsApp
  const [sendConfirmation, setSendConfirmation] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "document">("image");
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Estado de guardado y errores
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar contactos, miembros y plantillas al abrir
  useEffect(() => {
    let cancelled = false;
    async function loadBase() {
      try {
        const [resContacts, resTemplates] = await Promise.all([
          fetch("/api/contacts?limit=100").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/templates").then((r) => (r.ok ? r.json() : null)),
        ]);

        if (!cancelled) {
          if (resContacts?.contacts) setContacts(resContacts.contacts);
          if (resTemplates?.templates) {
            setTemplates(
              resTemplates.templates.filter((t: any) => t.status === "approved")
            );
          }
        }
      } catch (err) {
        console.error("Error al cargar dependencias de citas:", err);
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    }

    void loadBase();
    return () => {
      cancelled = true;
    };
  }, []);

  // Subir imagen/video a Cloudflare R2
  async function handleFileUpload(file: File) {
    setUploadingMedia(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Error al subir archivo a R2");
      const data = await res.json();
      setMediaUrl(data.url);
      if (file.type.startsWith("video/")) {
        setMediaType("video");
      } else if (file.type.startsWith("image/")) {
        setMediaType("image");
      } else {
        setMediaType("document");
      }
    } catch (err: any) {
      setError(err.message || "Error al subir multimedia");
    } finally {
      setUploadingMedia(false);
    }
  }

  // Guardar cita
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !contactId || !scheduledAt) {
      setError("Por favor completa el título, contacto y fecha de la cita.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditing && appointment) {
        const res = await fetch(`/api/appointments/${appointment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            type,
            status,
            scheduledAt,
            durationMinutes,
            assignedUserId: assignedUserId || null,
            locationAddress: locationAddress || null,
            meetingUrl: meetingUrl || null,
            notes: notes || null,
          }),
        });

        if (!res.ok) throw new Error("No se pudo actualizar la cita");
      } else {
        const res = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            contactId,
            type,
            status,
            scheduledAt,
            durationMinutes,
            assignedUserId: assignedUserId || null,
            locationAddress: locationAddress || null,
            meetingUrl: meetingUrl || null,
            notes: notes || null,
            sendConfirmation,
            confirmationTemplateId: sendConfirmation ? selectedTemplateId || null : null,
            confirmationMediaUrl: sendConfirmation ? mediaUrl || null : null,
            confirmationMediaType: sendConfirmation && mediaUrl ? mediaType : null,
          }),
        });

        if (!res.ok) throw new Error("No se pudo registrar la cita");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Error al guardar cita");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/20">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {isEditing ? "Editar Cita / Visita" : "Agendar Nueva Cita o Visita Técnica"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configura los detalles de la visita y la confirmación automática por WhatsApp.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Formulario con Scroll */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Título de la actividad */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Título o Asunto de la Cita</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="p. ej. Instalación de Fibra Óptica 100M - Domicilio"
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Selector de Contacto */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cliente o Contacto</Label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                disabled={isEditing}
                className="flex h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              >
                <option value="">Seleccionar contacto…</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de Cita */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo de Cita</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="visita_tecnica">Visita Técnica</option>
                <option value="instalacion">Instalación de Servicio</option>
                <option value="reunion">Reunión Comercial</option>
                <option value="revision">Revisión / Mantenimiento</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Fecha y Hora */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold">Fecha y Hora Programada</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Duración en minutos */}
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-semibold">Duración (min)</Label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="flex h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
                <option value="90">1 hora 30 min</option>
                <option value="120">2 horas</option>
                <option value="180">3 horas</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Estado */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Estado</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="scheduled">Programada</option>
                <option value="confirmed">Confirmada por el cliente</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
                <option value="no_show">No se presentó</option>
              </select>
            </div>

            {/* Dirección / Ubicación */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Dirección o Enlace de Reunión</Label>
              <Input
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="Av. Principal #123 o Enlace de Google Meet"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Notas internas */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notas y Detalles de la Visita</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones para el técnico, requisitos llevados, código de ticket, etc."
              rows={2}
              className="text-xs"
            />
          </div>

          {/* Sección de Confirmación por WhatsApp (solo al crear) */}
          {!isEditing && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={sendConfirmation}
                    onChange={(e) => setSendConfirmation(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Enviar mensaje de confirmación por WhatsApp al cliente</span>
                </label>
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>

              {sendConfirmation && (
                <div className="space-y-3 pt-2 border-t border-primary/10">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold">Plantilla Oficial de WhatsApp</Label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Selecciona plantilla aprobada…</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.language}) — {t.category}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Adjunto Multimedia Opcional */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold">
                      Adjuntar Multimedia (Croquis, Foto de Requisitos, Credencial Técnica o Video)
                    </Label>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*,video/*,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleFileUpload(file);
                          }}
                          className="hidden"
                        />
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                          <Upload className="h-3.5 w-3.5" />
                          {uploadingMedia ? "Subiendo a R2…" : "Examinar archivo"}
                        </span>
                      </label>
                      {mediaUrl && (
                        <span className="text-[11px] text-emerald-600 truncate max-w-xs">
                          ✓ Archivo cargado listo para enviar
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || uploadingMedia}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Guardando…
                </>
              ) : isEditing ? (
                "Guardar Cambios"
              ) : (
                "Crear y Agendar"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
