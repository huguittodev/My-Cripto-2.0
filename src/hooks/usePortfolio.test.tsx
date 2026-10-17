import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { usePortfolio } from "./usePortfolio.ts";
import { clearPortfolioStorage, saveStoredTransactions } from "../services/portfolioStorage.ts";
import type { Transaction } from "../types/crypto";

function PortfolioConsumer() {
  const { transactions, summary } = usePortfolio();

  return (
    <div>
      <span id="tx-count">{transactions.length}</span>
      <span id="pos-count">{summary.positionCount}</span>
      <span id="total-val">{summary.totalCurrentValue}</span>
      <span id="total-cost">{summary.totalCostBasis}</span>
      <span id="realized-pnl">{summary.totalRealizedPnl}</span>
    </div>
  );
}

describe("usePortfolio Hook", () => {
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

  it("debe inicializarse con transacciones vacías y resumen a cero", () => {
    const html = renderToString(<PortfolioConsumer />);
    expect(html).toContain('id="tx-count">0</span>');
    expect(html).toContain('id="pos-count">0</span>');
    expect(html).toContain('id="total-val">0</span>');
    expect(html).toContain('id="realized-pnl">0</span>');
  });

  it("debe cargar transacciones almacenadas y calcular métricas", () => {
    const txs: Transaction[] = [
      {
        id: "tx-1",
        coinId: "bitcoin",
        type: "buy",
        amount: 2,
        pricePerUnit: 40000,
        fee: 20,
        timestamp: 1000,
        createdAt: 1000,
      },
    ];

    saveStoredTransactions(txs);

    const html = renderToString(<PortfolioConsumer />);
    expect(html).toContain('id="tx-count">1</span>');
    expect(html).toContain('id="pos-count">1</span>');
    expect(html).toContain('id="total-cost">80020</span>');
  });
});
