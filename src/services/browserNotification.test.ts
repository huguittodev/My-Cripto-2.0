import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
} from "./browserNotification.ts";
import type { PriceAlert } from "../types/crypto";

describe("Browser Notification Service", () => {
  const originalNotification = (globalThis as unknown as { Notification?: unknown }).Notification;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "Notification", {
      value: originalNotification,
      writable: true,
      configurable: true,
    });
  });

  const testAlert: PriceAlert = {
    id: "alert-test-1",
    coinId: "bitcoin",
    coinSymbol: "btc",
    coinName: "Bitcoin",
    condition: "gte",
    targetPrice: 80000,
    currency: "eur",
    createdAt: Date.now(),
    status: "triggered",
    triggeredAt: Date.now(),
    triggeredPrice: 80500,
  };

  it("detecta soporte de la API de Notification del navegador", () => {
    expect(typeof isBrowserNotificationSupported()).toBe("boolean");
  });

  it("devuelve el estado de permisos o denied si no está soportado", () => {
    const perm = getBrowserNotificationPermission();
    expect(["granted", "denied", "default"]).toContain(perm);
  });

  it("requestBrowserNotificationPermission solicita permisos de forma segura", async () => {
    const mockRequest = vi.fn().mockResolvedValue("granted");
    class MockNotificationClass {
      static permission: NotificationPermission = "default";
      static requestPermission = mockRequest;
    }

    Object.defineProperty(globalThis, "Notification", {
      value: MockNotificationClass,
      writable: true,
      configurable: true,
    });

    const result = await requestBrowserNotificationPermission();
    expect(mockRequest).toHaveBeenCalled();
    expect(result).toBe("granted");
  });

  it("15. Los errores al mostrar notificaciones de escritorio no lanzan excepciones ni corrompen la aplicación", () => {
    class FailingNotification {
      static permission: NotificationPermission = "granted";
      static requestPermission = vi.fn();
      constructor() {
        throw new Error("Permiso de sistema revocado inesperadamente");
      }
    }

    Object.defineProperty(globalThis, "Notification", {
      value: FailingNotification,
      writable: true,
      configurable: true,
    });

    let result = false;
    expect(() => {
      result = sendBrowserNotification(testAlert);
    }).not.toThrow();

    expect(result).toBe(false);
  });

  it("emite la notificación correctamente cuando los permisos están concedidos", () => {
    const instanceTracker: Array<{ title: string; options: unknown }> = [];

    class SuccessfulNotification {
      static permission: NotificationPermission = "granted";
      static requestPermission = vi.fn();
      title: string;
      options: unknown;
      onclick: (() => void) | null = null;
      close = vi.fn();

      constructor(title: string, options: unknown) {
        this.title = title;
        this.options = options;
        instanceTracker.push({ title, options });
      }
    }

    Object.defineProperty(globalThis, "Notification", {
      value: SuccessfulNotification,
      writable: true,
      configurable: true,
    });

    const success = sendBrowserNotification(testAlert);
    expect(success).toBe(true);
    expect(instanceTracker.length).toBe(1);
    expect(instanceTracker[0].title).toContain("Bitcoin");
  });
});
