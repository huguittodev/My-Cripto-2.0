import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { PortfolioView } from "./PortfolioView.tsx";
import { clearPortfolioStorage, saveStoredTransactions } from "../../services/portfolioStorage.ts";
import type { Transaction } from "../../types/crypto";

describe("PortfolioView Component", () => {
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
    clearPortfolioStorage();
  });

  afterEach(() => {
    clearPortfolioStorage();
  });

  it("debe mostrar el estado vacío cuando no existen transacciones en la cartera", () => {
    const html = renderToString(<PortfolioView />);

    expect(html).toContain("Tu cartera está vacía");
    expect(html).toContain("Registrar primera compra");
    expect(html).toContain("Método FIFO");
    expect(html).toContain("No Custodial");
  });

  it("debe mostrar las métricas y tablas cuando existen transacciones registradas", () => {
    const tx: Transaction = {
      id: "tx-test-1",
      coinId: "bitcoin",
      type: "buy",
      amount: 1,
      pricePerUnit: 50000,
      fee: 10,
      timestamp: 1600000000000,
      createdAt: 1600000000000,
    };

    saveStoredTransactions([tx]);

    const html = renderToString(<PortfolioView />);

    expect(html).not.toContain("Tu cartera está vacía");
    expect(html).toContain("Valor Total de Cartera");
    expect(html).toContain("Posiciones");
    expect(html).toContain("Historial de Transacciones");
  });
});
