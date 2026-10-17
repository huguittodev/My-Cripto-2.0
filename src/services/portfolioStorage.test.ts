import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  PORTFOLIO_STORAGE_KEY,
  PORTFOLIO_UPDATED_EVENT,
  getStoredTransactions,
  saveStoredTransactions,
  addStoredTransaction,
  updateStoredTransaction,
  deleteStoredTransaction,
  clearPortfolioStorage,
  isPortfolioStorageAvailable,
} from "./portfolioStorage.ts";
import type { Transaction } from "../types/crypto";

describe("portfolioStorage — Persistencia Local de la Cartera", () => {
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
    clearPortfolioStorage();
  });

  afterEach(() => {
    clearPortfolioStorage();
  });

  it("debe verificar que el almacenamiento está disponible", () => {
    expect(isPortfolioStorageAvailable()).toBe(true);
  });

  it("debe retornar una lista vacía cuando no hay datos guardados", () => {
    const list = getStoredTransactions();
    expect(list).toEqual([]);
  });

  it("debe guardar y recuperar transacciones correctamente", () => {
    const tx: Transaction = {
      id: "tx-1",
      coinId: "bitcoin",
      type: "buy",
      amount: 1.5,
      pricePerUnit: 45000,
      fee: 10,
      timestamp: 1600000000000,
      notes: "Compra inicial",
      createdAt: 1600000000000,
    };

    saveStoredTransactions([tx]);
    const stored = getStoredTransactions();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toEqual(tx);
  });

  it("debe añadir una nueva transacción asignando un ID y createdAt válidos", () => {
    const added = addStoredTransaction({
      coinId: "ETHEREUM",
      type: "buy",
      amount: 2,
      pricePerUnit: 2500,
      fee: 5,
      timestamp: Date.now(),
    });

    expect(added.id).toBeDefined();
    expect(added.id.startsWith("tx_")).toBe(true);
    expect(added.coinId).toBe("ethereum"); // Normalizado a minúsculas
    expect(added.createdAt).toBeGreaterThan(0);

    const stored = getStoredTransactions();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(added.id);
  });

  it("debe actualizar una transacción existente", () => {
    const added = addStoredTransaction({
      coinId: "solana",
      type: "buy",
      amount: 10,
      pricePerUnit: 100,
      fee: 2,
      timestamp: 1000,
    });

    const success = updateStoredTransaction({
      ...added,
      amount: 15,
      notes: "Actualizado con más cantidad",
    });

    expect(success).toBe(true);
    const stored = getStoredTransactions();
    expect(stored[0].amount).toBe(15);
    expect(stored[0].notes).toBe("Actualizado con más cantidad");
  });

  it("debe eliminar una transacción existente por su ID", () => {
    const tx1 = addStoredTransaction({
      coinId: "solana",
      type: "buy",
      amount: 10,
      pricePerUnit: 100,
      fee: 2,
      timestamp: 1000,
    });
    const tx2 = addStoredTransaction({
      coinId: "bitcoin",
      type: "buy",
      amount: 1,
      pricePerUnit: 50000,
      fee: 10,
      timestamp: 2000,
    });

    expect(getStoredTransactions()).toHaveLength(2);

    const deleted = deleteStoredTransaction(tx1.id);
    expect(deleted).toBe(true);

    const remaining = getStoredTransactions();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(tx2.id);
  });

  it("debe manejar JSON corrupto en localStorage sin provocar excepciones", () => {
    memoryStore[PORTFOLIO_STORAGE_KEY] = "{ invalid json corrupt";
    const transactions = getStoredTransactions();
    expect(transactions).toEqual([]);
  });

  it("debe despachar el evento custom PORTFOLIO_UPDATED_EVENT al mutar datos", () => {
    const listener = vi.fn();
    globalThis.addEventListener?.(PORTFOLIO_UPDATED_EVENT, listener);

    addStoredTransaction({
      coinId: "bitcoin",
      type: "buy",
      amount: 1,
      pricePerUnit: 60000,
      fee: 0,
      timestamp: 1000,
    });

    // En Node / JSDom si existe addEventListener
    if (typeof globalThis.addEventListener === "function") {
      expect(listener).toHaveBeenCalled();
      globalThis.removeEventListener(PORTFOLIO_UPDATED_EVENT, listener);
    }
  });

  it("debe tolerar errores de cuota en localStorage usando respaldo en memoria", () => {
    mockStorage.setItem = vi.fn(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });

    const tx: Transaction = {
      id: "tx-fallback",
      coinId: "bitcoin",
      type: "buy",
      amount: 1,
      pricePerUnit: 50000,
      fee: 0,
      timestamp: 1000,
      createdAt: 1000,
    };

    const saved = saveStoredTransactions([tx]);
    expect(saved).toBe(true);

    // Debe recuperar la transacción desde el respaldo en memoria
    const recovered = getStoredTransactions();
    expect(recovered).toHaveLength(1);
    expect(recovered[0].id).toBe("tx-fallback");
  });
});
