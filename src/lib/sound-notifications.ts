/**
 * Utilidades de alertas sonoras y notificaciones de escritorio para el CRM.
 * Usa Web Audio API (cero dependencias externas y sin latencia de red)
 * y Web Notification API para popups en segundo plano.
 */

class AlertSoundManager {
  private ctx: AudioContext | null = null;
  private lastPlayedAt = 0;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => null);
    }
    return this.ctx;
  }

  /**
   * Reproduce un chime armónico de dos tonos suaves y profesionales (E5 -> A5).
   */
  public playChime(force = false): void {
    const now = Date.now();
    // Prevenir saturación auditiva: mínimo 2.5 segundos entre alertas
    if (!force && now - this.lastPlayedAt < 2500) return;
    this.lastPlayedAt = now;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const currentTime = ctx.currentTime;

      // Oscilador 1: Tono de entrada (659.25 Hz - Mi / E5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, currentTime);

      gain1.gain.setValueAtTime(0.01, currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.25, currentTime + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(currentTime);
      osc1.stop(currentTime + 0.35);

      // Oscilador 2: Tono armónico agudo de campana (880 Hz - La / A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, currentTime + 0.12);

      gain2.gain.setValueAtTime(0.001, currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.28, currentTime + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.0001, currentTime + 0.65);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(currentTime + 0.12);
      osc2.stop(currentTime + 0.65);
    } catch {
      // AudioContext bloqueado o no disponible
    }
  }
}

export const alertSound = new AlertSoundManager();

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

export function getDesktopNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function requestDesktopNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    const res = await Notification.requestPermission();
    return res;
  } catch {
    return "denied";
  }
}

export function isSoundAlertEnabled(): boolean {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return true;
  return localStorage.getItem("toi.alerts.sound") !== "false";
}

export function setSoundAlertEnabled(enabled: boolean): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  localStorage.setItem("toi.alerts.sound", enabled ? "true" : "false");
}

export function showDesktopNotification({
  title,
  body,
  tag,
  onClickUrl,
}: {
  title: string;
  body: string;
  tag?: string;
  onClickUrl?: string;
}): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const notif = new Notification(title, {
      body,
      icon: "/logotoi.webp",
      tag: tag ?? "toi-customer-alert",
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
      if (onClickUrl && window.location.pathname !== onClickUrl) {
        window.location.href = onClickUrl;
      }
    };
  } catch {
    // Error en constructor de notificación (modo restringido)
  }
}
