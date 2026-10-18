import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { AlertsView } from "./AlertsView.tsx";
import { clearAlertStorage, saveStoredAlerts } from "../../services/alertStorage.ts";
import type { PriceAlert } from "../../types/crypto";

describe("AlertsView Component", () => {
  let memoryStore: Record<string, string> = {};

  beforeEach(() => {
    memoryStore = {};
    const mockStorage: Storage = {
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
      key: vi.fn((idx: number) => Object.keys(memoryStore)[idx] || null),
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

  it("muestra el estado vacío cuando no existen alertas configuradas", () => {
    const html = renderToString(<AlertsView />);
    expect(html).toContain("Alertas de Precio");
    expect(html).toContain("No tienes alertas configuradas");
    expect(html).toContain("Crear primera alerta");
  });

  it("renderiza tarjetas de alerta cuando existen alertas persistidas", () => {
    const alerts: PriceAlert[] = [
      {
        id: "alert-btc-1",
        coinId: "bitcoin",
        coinSymbol: "btc",
        coinName: "Bitcoin",
        condition: "gte",
        targetPrice: 95000,
        currency: "eur",
        createdAt: 1700000000000,
        status: "active",
      },
      {
        id: "alert-eth-1",
        coinId: "ethereum",
        coinSymbol: "eth",
        coinName: "Ethereum",
        condition: "lte",
        targetPrice: 2200,
        currency: "eur",
        createdAt: 1700000000000,
        status: "triggered",
        triggeredAt: 1700001000000,
        triggeredPrice: 2150,
      },
    ];

    saveStoredAlerts(alerts);

    const html = renderToString(<AlertsView />);
    expect(html).toContain("Bitcoin");
    expect(html).toContain("Ethereum");
    expect(html).toContain("Activa");
    expect(html).toContain("Disparada");
    expect(html).toContain("Todas");
    expect(html).toContain("Activas");
    expect(html).toContain("Disparadas");
  });
});
