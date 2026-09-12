"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  CheckSquare,
  FlaskConical,
  Inbox,
  Kanban,
  LogOut,
  MapPin,
  Settings,
  Sparkles,
  Users,
  Volume2,
} from "lucide-react";
import type { Branding } from "@/lib/branding";
import { cn, initials } from "@/lib/utils";
import { signOut } from "@/lib/auth/client";
import { useEvents } from "@/components/use-events";
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
  { href: "/contacts", label: "Contactos", icon: Users },
  { href: "/todos", label: "Tareas", icon: CheckSquare },
  { href: "/coverage", label: "Cobertura NAP", icon: MapPin },
  { href: "/agent", label: "Agente", icon: Sparkles },
  { href: "/lab", label: "Laboratorio", icon: FlaskConical },
] as const;

export function AppNav({
  branding,
  userName,
  role,
}: {
  branding: Branding;
  userName: string;
  role: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [soundEnabled, setSoundState] = useState(true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionState>("default");

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

      <div className="mt-1 flex items-center gap-2.5 rounded-sm px-2.5 py-2 hover:bg-accent">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-text">
          {initials(userName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold">{userName}</span>
          <span className="block text-[11px] text-text-3">
            {role === "owner" ? "Propietario" : "Equipo"} · En línea
          </span>
        </span>
        <button
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="rounded p-1 text-text-3 hover:text-foreground"
          onClick={async () => {
            await signOut();
            router.push("/login");
            router.refresh();
          }}
        >
          <LogOut className="h-4 w-4" strokeWidth={1.7} />
        </button>
      </div>
    </aside>
  );
}
