import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { useAlerts } from "./useAlerts.ts";
import { clearAlertStorage, saveStoredAlerts } from "../services/alertStorage.ts";
import type { PriceAlert, CryptoList } from "../types/crypto";

function AlertsConsumer({ externalCoins }: { externalCoins?: CryptoList }) {
  const {
    alerts,
    activeAlertsCount,
    triggeredAlertsCount,
    inactiveAlerts,
    toasts,
  } = useAlerts({ externalCoins });

  return (
    <div>
      <span id="alerts-count">{alerts.length}</span>
      <span id="active-count">{activeAlertsCount}</span>
      <span id="triggered-count">{triggeredAlertsCount}</span>
      <span id="inactive-count">{inactiveAlerts.length}</span>
      <span id="toasts-count">{toasts.length}</span>
    </div>
  );
}

describe("useAlerts Hook", () => {
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

  it("inicializa con lista de alertas vacía y contadores a cero", () => {
    const html = renderToString(<AlertsConsumer />);
    expect(html).toContain('id="alerts-count">0</span>');
    expect(html).toContain('id="active-count">0</span>');
    expect(html).toContain('id="triggered-count">0</span>');
    expect(html).toContain('id="inactive-count">0</span>');
    expect(html).toContain('id="toasts-count">0</span>');
  });

  it("recupera alertas persistidas y computa métricas activas vs disparadas", () => {
    const saved: PriceAlert[] = [
      {
        id: "a-1",
        coinId: "bitcoin",
        coinSymbol: "btc",
        coinName: "Bitcoin",
        condition: "gte",
        targetPrice: 80000,
        currency: "eur",
        createdAt: 1000,
        status: "active",
      },
      {
        id: "a-2",
        coinId: "ethereum",
        coinSymbol: "eth",
        coinName: "Ethereum",
        condition: "lte",
        targetPrice: 2000,
        currency: "eur",
        createdAt: 1000,
        status: "triggered",
        triggeredAt: 2000,
        triggeredPrice: 1980,
      },
      {
        id: "a-3",
        coinId: "solana",
        coinSymbol: "sol",
        coinName: "Solana",
        condition: "gte",
        targetPrice: 200,
        currency: "eur",
        createdAt: 1000,
        status: "inactive",
      },
    ];

    saveStoredAlerts(saved);

    const html = renderToString(<AlertsConsumer />);
    expect(html).toContain('id="alerts-count">3</span>');
    expect(html).toContain('id="active-count">1</span>');
    expect(html).toContain('id="triggered-count">1</span>');
    expect(html).toContain('id="inactive-count">1</span>');
  });
});
