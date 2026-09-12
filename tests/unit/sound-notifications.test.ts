import { describe, expect, it, beforeEach, afterAll } from "vitest";
import {
  alertSound,
  getDesktopNotificationPermission,
  isSoundAlertEnabled,
  setSoundAlertEnabled,
} from "@/lib/sound-notifications";

describe("Sistema de Alertas y Notificaciones", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
    const storageMock: Storage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => {
        store[key] = String(val);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const key of Object.keys(store)) {
          delete store[key];
        }
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() {
        return Object.keys(store).length;
      },
    };
    (globalThis as unknown as { window: { localStorage: Storage } }).window = {
      localStorage: storageMock,
    };
    (globalThis as unknown as { localStorage: Storage }).localStorage = storageMock;
  });

  afterAll(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
    delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
  });

  it("isSoundAlertEnabled debe ser true por defecto", () => {
    expect(isSoundAlertEnabled()).toBe(true);
  });

  it("setSoundAlertEnabled debe persistir en localStorage", () => {
    setSoundAlertEnabled(false);
    expect(isSoundAlertEnabled()).toBe(false);
    expect(globalThis.localStorage.getItem("toi.alerts.sound")).toBe("false");

    setSoundAlertEnabled(true);
    expect(isSoundAlertEnabled()).toBe(true);
    expect(globalThis.localStorage.getItem("toi.alerts.sound")).toBe("true");
  });

  it("getDesktopNotificationPermission no debe fallar si Notification no está disponible o mocked", () => {
    const perm = getDesktopNotificationPermission();
    expect(["default", "granted", "denied", "unsupported"]).toContain(perm);
  });

  it("playChime no debe lanzar excepciones en entornos sin soporte de audio nativo", () => {
    expect(() => alertSound.playChime(true)).not.toThrow();
  });
});
