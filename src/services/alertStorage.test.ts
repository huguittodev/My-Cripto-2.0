import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ALERT_STORAGE_KEY,
  CURRENT_ALERT_VERSION,
  getStoredAlerts,
  addStoredAlert,
  updateStoredAlert,
  deleteStoredAlert,
  toggleStoredAlertActive,
  clearAlertStorage,
  isValidStoredAlert,
  isAlertStorageAvailable,
} from "./alertStorage.ts";
import type { PriceAlert } from "../types/crypto";

describe("Alert Storage Service", () => {
  let memoryStore: Record<string, string> = {};
  let mockStorage: Storage;

  beforeEach(() => {
    memoryStore = {};
    mockStorage = {
      getItem: vi.fn((key: string) => memoryStore[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        memoryStore[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete memoryStore[key];
      }),
      clear: vi.fn(() => {
        memoryStore = {};
      }),
      key: vi.fn((index: number) => Object.keys(memoryStore)[index] || null),
      get length() {
        return Object.keys(memoryStore).length;
      },
    };

    vi.restoreAllMocks();
    Object.defineProperty(globalThis, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
    clearAlertStorage();
  });

  afterEach(() => {
    clearAlertStorage();
  });

  const sampleAlert: Omit<PriceAlert, "id" | "createdAt" | "status"> = {
    coinId: "bitcoin",
    coinSymbol: "btc",
    coinName: "Bitcoin",
    condition: "gte",
    targetPrice: 85000,
    currency: "eur",
  };

  it("verifica disponibilidad del almacenamiento", () => {
    expect(isAlertStorageAvailable()).toBe(true);
  });

  it("9. La creación, edición y eliminación de alertas funcionan correctamente", () => {
    // 1. Creación
    const created = addStoredAlert(sampleAlert);
    expect(created.id).toBeDefined();
    expect(created.status).toBe("active");
    expect(created.coinId).toBe("bitcoin");

    let alerts = getStoredAlerts();
    expect(alerts.length).toBe(1);
    expect(alerts[0].targetPrice).toBe(85000);

    // 2. Edición
    const updated = updateStoredAlert({
      ...created,
      targetPrice: 90000,
      notes: "Alerta actualizada",
    });
    expect(updated).toBe(true);

    alerts = getStoredAlerts();
    expect(alerts[0].targetPrice).toBe(90000);
    expect(alerts[0].notes).toBe("Alerta actualizada");

    // 3. Eliminación
    const deleted = deleteStoredAlert(created.id);
    expect(deleted).toBe(true);
    expect(getStoredAlerts().length).toBe(0);
  });

  it("10. Las alertas persisten tras recargar (almacenamiento en localStorage)", () => {
    const created = addStoredAlert(sampleAlert);

    // Verificamos directamente en el storage subyacente
    const rawData = mockStorage.getItem(ALERT_STORAGE_KEY);
    expect(rawData).not.toBeNull();

    const parsed = JSON.parse(rawData!);
    expect(parsed.version).toBe(CURRENT_ALERT_VERSION);
    expect(parsed.alerts.length).toBe(1);
    expect(parsed.alerts[0].id).toBe(created.id);
  });

  it("11. La aplicación recupera correctamente las alertas guardadas", () => {
    const alert1 = addStoredAlert({ ...sampleAlert, coinId: "bitcoin", targetPrice: 70000 });
    const alert2 = addStoredAlert({ ...sampleAlert, coinId: "ethereum", targetPrice: 3000 });

    const retrieved = getStoredAlerts();
    expect(retrieved.length).toBe(2);
    expect(retrieved.map((a) => a.id)).toEqual([alert2.id, alert1.id]);
  });

  it("12. Los datos corruptos del almacenamiento se gestionan sin bloquear la aplicación", () => {
    // 1. JSON no parseable (sintaxis rota)
    mockStorage.setItem(ALERT_STORAGE_KEY, "{ invalid json corrupt content... ");
    expect(() => getStoredAlerts()).not.toThrow();
    const fallbackList = getStoredAlerts();
    expect(Array.isArray(fallbackList)).toBe(true);
    expect(fallbackList.length).toBe(0);

    // 2. JSON válido pero con estructura corrupta (sin array alerts o campos incorrectos)
    mockStorage.setItem(
      ALERT_STORAGE_KEY,
      JSON.stringify({ version: 1, alerts: [{ badField: true }] }),
    );
    const sanitized = getStoredAlerts();
    expect(sanitized.length).toBe(0); // El item corrupto se filtra
  });

  it("toggleStoredAlertActive alterna el estado y rearma alertas disparadas", () => {
    const alert = addStoredAlert(sampleAlert);
    expect(alert.status).toBe("active");

    // Desactivar
    const toggled1 = toggleStoredAlertActive(alert.id);
    expect(toggled1?.status).toBe("inactive");

    // Marcar como disparada
    updateStoredAlert({
      ...toggled1!,
      status: "triggered",
      triggeredAt: Date.now(),
      triggeredPrice: 86000,
    });

    // Reactivar / rearmar
    const rearmed = toggleStoredAlertActive(alert.id);
    expect(rearmed?.status).toBe("active");
    expect(rearmed?.triggeredAt).toBeUndefined();
    expect(rearmed?.triggeredPrice).toBeUndefined();
  });

  it("isValidStoredAlert valida estrictamente la integridad de los datos", () => {
    expect(isValidStoredAlert(null)).toBe(false);
    expect(isValidStoredAlert("string")).toBe(false);
    expect(isValidStoredAlert({})).toBe(false);
    expect(
      isValidStoredAlert({
        id: "1",
        coinId: "btc",
        coinSymbol: "btc",
        coinName: "Bitcoin",
        condition: "gte",
        targetPrice: -10, // Inválido: negativo
        currency: "eur",
        createdAt: Date.now(),
        status: "active",
      }),
    ).toBe(false);

    expect(
      isValidStoredAlert({
        id: "1",
        coinId: "btc",
        coinSymbol: "btc",
        coinName: "Bitcoin",
        condition: "gte",
        targetPrice: 100,
        currency: "eur",
        createdAt: Date.now(),
        status: "active",
      }),
    ).toBe(true);
  });
});
