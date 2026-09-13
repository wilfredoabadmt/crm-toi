"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BellOff,
  CalendarDays,
  CheckSquare,
  FlaskConical,
  Inbox,
  Kanban,
  LogOut,
  MapPin,
  Megaphone,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Volume2,
  X,
} from "lucide-react";
import type { Branding } from "@/lib/branding";
import { cn, initials } from "@/lib/utils";
import { signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { useEvents } from "@/components/use-events";
import {
  type DepartmentConfig,
  isUserInDepartment,
} from "@/lib/departments";
import {
  alertSound,
  getDesktopNotificationPermission,
  isSoundAlertEnabled,
  requestDesktopNotificationPermission,
  setSoundAlertEnabled,
  showDesktopNotification,
  type NotificationPermissionState,
} from "@/lib/sound-notifications";

const NAV = [
  { href: "/inbox", label: "Bandeja", icon: Inbox, badge: true },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/appointments", label: "Agenda", icon: CalendarDays },
  { href: "/reports", label: "Métricas", icon: BarChart3 },
  { href: "/campaigns", label: "Campañas", icon: Megaphone },
  { href: "/contacts", label: "Contactos", icon: Users },
  { href: "/todos", label: "Tareas", icon: CheckSquare },
  { href: "/coverage", label: "Cobertura NAP", icon: MapPin },
  { href: "/agent", label: "Agente", icon: Sparkles },
  { href: "/lab", label: "Laboratorio", icon: FlaskConical },
] as const;

export function AppNav({
  branding,
  userName,
  userEmail = "",
  role,
  initialDepartments = [],
}: {
  branding: Branding;
  userName: string;
  userEmail?: string;
  role: string;
  initialDepartments?: DepartmentConfig[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [soundEnabled, setSoundState] = useState(true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionState>("default");
  const [departments, setDepartments] = useState<DepartmentConfig[]>(initialDepartments);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setDepartments(initialDepartments);
  }, [initialDepartments]);

  // Escuchar reasignaciones o cambios de departamento en vivo
  useEffect(() => {
    const handleUpdate = () => {
      fetch("/api/settings/departments")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.departments && Array.isArray(data.departments)) {
            setDepartments(data.departments);
          }
        })
        .catch(() => null);
    };

    window.addEventListener("departments-updated", handleUpdate);
    window.addEventListener("focus", handleUpdate);
    return () => {
      window.removeEventListener("departments-updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, []);

  const userDepartments = departments.filter((d) =>
    isUserInDepartment(userEmail, d)
  );

  useEffect(() => {
    setSoundState(isSoundAlertEnabled());
    setNotifPermission(getDesktopNotificationPermission());
  }, []);

  const toggleSound = useCallback(() => {
    const next = !soundEnabled;
    setSoundState(next);
    setSoundAlertEnabled(next);
    if (next) {
      alertSound.playChime(true);
    }
  }, [soundEnabled]);

  const enableDesktopAlerts = useCallback(async () => {
    const perm = await requestDesktopNotificationPermission();
    setNotifPermission(perm);
    setSoundState(true);
    setSoundAlertEnabled(true);
    alertSound.playChime(true);
    if (perm === "granted") {
      showDesktopNotification({
        title: "🔔 Alertas TOI CRM activadas",
        body: "Recibirás avisos sonoros y notificaciones cada vez que un cliente requiera atención inmediata.",
        onClickUrl: "/inbox",
      });
    }
  }, []);

  async function refetchUnread() {
    const res = await fetch("/api/conversations").catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as {
      conversations: { id: string; unreadCount: number; contact: { name: string }; preview?: string }[];
    };
    setUnread(data.conversations.reduce((a, c) => a + c.unreadCount, 0));
  }

  useEffect(() => {
    void refetchUnread();
  }, []);

  useEvents({
    onMessageNew: (d) => {
      void refetchUnread();
      const msg = d.message as { direction?: string; text?: string } | undefined;
      if (msg?.direction === "in") {
        if (soundEnabled) {
          alertSound.playChime();
        }
        showDesktopNotification({
          title: "🚨 Cliente en línea (Atención requerida)",
          body: msg.text ? msg.text.slice(0, 100) : "Nuevo mensaje recibido de un cliente",
          onClickUrl: "/inbox",
        });
      }
    },
    onConversationUpdated: (d) => {
      void refetchUnread();
      const conv = (d as { conversation?: { handoffReason?: string } })?.conversation;
      if (conv?.handoffReason) {
        if (soundEnabled) {
          alertSound.playChime(true);
        }
        showDesktopNotification({
          title: "🚨 Cliente transferido a Atención Humana",
          body: "Un cliente ha sido derivado a tu departamento para atención inmediata.",
          onClickUrl: "/inbox",
        });
      }
    },
  });

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-subtle px-3 pb-3.5 pt-4">
      {/* Brand white-label */}
      <div className="mb-4 flex items-center gap-2.5 px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logotoi.webp"
          alt={branding.name}
          className="h-8 w-auto max-w-[36px] object-contain shrink-0 rounded-sm"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/logo.png";
          }}
        />
        <span className="min-w-0">
          <span className="block truncate text-[16px] font-[650] leading-tight tracking-tight">
            {branding.name}
          </span>
          <span className="block text-[11px] text-text-3">CRM · WhatsApp</span>
        </span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-[11px] rounded-sm px-2.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-tint font-semibold text-brand-text"
                  : "text-text-2 hover:bg-accent"
              )}
            >
              <item.icon
                className={cn("h-[18px] w-[18px]", active ? "text-brand" : "text-text-3")}
                strokeWidth={1.7}
              />
              <span className="flex-1">{item.label}</span>
              {"badge" in item && item.badge && unread > 0 && (
                <span
                  className={cn(
                    "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-semibold",
                    active ? "bg-brand text-white" : "bg-border-strong text-text-2"
                  )}
                >
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Control de alertas sonoras y notificaciones */}
      <div className="mb-2 rounded-md border border-border/70 bg-card/50 p-2 text-xs shadow-2xs">
        <div className="flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={toggleSound}
            title={soundEnabled ? "Silenciar sonido" : "Activar sonido de timbre"}
            className="flex items-center gap-1.5 text-text-2 hover:text-foreground transition-colors"
          >
            {soundEnabled ? (
              <Bell className="h-3.5 w-3.5 text-brand" />
            ) : (
              <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="font-medium text-[11px]">
              {soundEnabled ? "Timbre activo" : "Silenciado"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => alertSound.playChime(true)}
            title="Probar timbre"
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-text-3 hover:bg-accent hover:text-foreground transition-colors"
          >
            Probar
          </button>
        </div>

        {notifPermission !== "granted" && (
          <button
            type="button"
            onClick={() => void enableDesktopAlerts()}
            className="mt-1.5 flex w-full items-center justify-center gap-1 rounded bg-brand/10 px-2 py-1 text-[10.5px] font-semibold text-brand hover:bg-brand/20 transition-colors"
          >
            <Volume2 className="h-3 w-3" />
            <span>Activar avisos de PC</span>
          </button>
        )}
      </div>

      {role === "owner" && (
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-[11px] rounded-sm px-2.5 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-brand-tint font-semibold text-brand-text"
              : "text-text-2 hover:bg-accent"
          )}
        >
          <Settings
            className={cn(
              "h-[18px] w-[18px]",
              pathname.startsWith("/settings") ? "text-brand" : "text-text-3"
            )}
            strokeWidth={1.7}
          />
          Ajustes
        </Link>
      )}

      {/* Tarjeta de Cuenta Personal en la barra lateral */}
      <div
        onClick={() => setProfileOpen(true)}
        className="mt-1 flex items-center gap-2.5 rounded-sm px-2.5 py-2 hover:bg-accent cursor-pointer group transition-colors"
        title="Clic para ver mi cuenta y departamentos asignados"
        role="button"
        tabIndex={0}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-text shadow-2xs">
          {initials(userName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold group-hover:text-brand transition-colors">
            {userName}
          </span>
          {role === "owner" ? (
            <span className="block text-[11px] text-text-3">
              Propietario · En línea
            </span>
          ) : userDepartments.length > 0 ? (
            <span className="flex items-center gap-1.5 truncate text-[11px] font-medium text-foreground">
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: userDepartments[0]?.badgeColor ?? "#10b981" }}
              />
              <span className="truncate">
                {userDepartments.map((d) => d.shortName).join(", ")}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">· En línea</span>
            </span>
          ) : (
            <span className="block text-[11px] text-text-3">
              Equipo · En línea
            </span>
          )}
        </span>
        <button
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="rounded p-1 text-text-3 hover:text-foreground hover:bg-muted"
          onClick={async (e) => {
            e.stopPropagation();
            await signOut();
            router.push("/login");
            router.refresh();
          }}
        >
          <LogOut className="h-4 w-4" strokeWidth={1.7} />
        </button>
      </div>

      {/* Modal: Mi Cuenta Personal y Departamentos Asignados */}
      {profileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setProfileOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-base font-bold text-brand-text shadow-xs">
                  {initials(userName)}
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">{userName}</h3>
                  <p className="text-xs text-muted-foreground">{userEmail || "Sesión activa"}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded bg-brand/10 px-2 py-0.5 text-[10.5px] font-semibold text-brand">
                      {role === "owner" ? "Propietario de la Empresa" : "Miembro del Equipo"}
                    </span>
                    <span className="text-[11px] text-emerald-600 font-medium">● Conectado</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Departamentos Asignados a esta cuenta */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Tus Departamentos Asignados
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {role === "owner" ? "Supervisión total" : `${userDepartments.length} área(s)`}
                </span>
              </div>

              {role === "owner" ? (
                <div className="rounded-lg border border-brand/30 bg-brand/5 p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-brand" />
                    <p className="font-semibold text-foreground">Cuenta de Propietario (Control Total)</p>
                  </div>
                  <p className="text-muted-foreground text-[11.5px]">
                    Como Propietario tienes acceso irrestricto para supervisar y responder en todos los departamentos ({departments.map((d) => d.shortName).join(", ")}), gestionar el equipo y configurar los pipelines.
                  </p>
                </div>
              ) : userDepartments.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {userDepartments.map((dept) => {
                    const isTitular =
                      dept.assignedEmail.toLowerCase() === userEmail.toLowerCase();

                    return (
                      <div
                        key={dept.id}
                        className="rounded-lg border p-3 text-xs transition-all space-y-1.5"
                        style={{
                          borderColor: `${dept.badgeColor}40`,
                          backgroundColor: `${dept.badgeColor}0c`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: dept.badgeColor }}
                            />
                            <span className="font-bold text-foreground text-sm">
                              {dept.name}
                            </span>
                          </div>
                          <span
                            className="rounded px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: `${dept.badgeColor}25`,
                              color: dept.badgeColor,
                            }}
                          >
                            {isTitular ? "★ Responsable Titular" : "Miembro de Apoyo"}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-muted-foreground">
                          {dept.description}
                        </p>
                        <div className="pt-1 text-[11px] text-muted-foreground flex items-center justify-between border-t border-border/30">
                          <span>
                            Titular: <strong>{dept.assignedName}</strong>
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            ✓ Alertas y Bandeja activas
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center text-xs space-y-1">
                  <p className="font-medium text-foreground">Sin departamento asignado</p>
                  <p className="text-muted-foreground text-[11px]">
                    Actualmente no estás asignado a ningún departamento. Tu administrador puede asignarte en Ajustes &gt; Equipo.
                  </p>
                </div>
              )}
            </div>

            {/* Configuración de Avisos en esta PC */}
            <div className="rounded-lg border bg-muted/25 p-3 text-xs space-y-2">
              <p className="font-semibold text-foreground text-[11.5px]">
                Avisos para esta cuenta en esta computadora
              </p>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Timbre sonoro:</span>
                <button
                  type="button"
                  onClick={toggleSound}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  {soundEnabled ? "Activo (hacer prueba 🔔)" : "Silenciado 🔕"}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Notificaciones de PC:</span>
                {notifPermission === "granted" ? (
                  <span className="text-[11.5px] font-medium text-emerald-600 dark:text-emerald-400">
                    Concedido ✓
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void enableDesktopAlerts()}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Activar avisos de escritorio
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  await signOut();
                  router.push("/login");
                  router.refresh();
                }}
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Cerrar sesión
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setProfileOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
