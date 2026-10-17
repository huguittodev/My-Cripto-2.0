import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getStoredWatchlist,
  saveStoredWatchlist,
  addIdToWatchlist,
  removeIdFromWatchlist,
  clearWatchlistStorage,
  isWatchlistStorageAvailable,
  WATCHLIST_STORAGE_KEY,
} from "./watchlistStorage";

describe("watchlistStorage - Persistencia Local", () => {
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
    clearWatchlistStorage();
  });

  afterEach(() => {
    clearWatchlistStorage();
  });

  it("debe inicializar con lista vacía cuando no existen datos guardados", () => {
    const list = getStoredWatchlist();
    expect(list).toEqual([]);
  });

  it("debe guardar y recuperar la lista de identificadores", () => {
    const success = saveStoredWatchlist(["bitcoin", "ethereum"]);
    expect(success).toBe(true);

    const retrieved = getStoredWatchlist();
    expect(retrieved).toEqual(["bitcoin", "ethereum"]);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      WATCHLIST_STORAGE_KEY,
      expect.stringContaining('"coinIds":["bitcoin","ethereum"]'),
    );
  });

  it("debe evitar identificadores duplicados y normalizar a minúsculas", () => {
    saveStoredWatchlist(["Bitcoin", "bitcoin", "  SOLANA  "]);
    const retrieved = getStoredWatchlist();
    expect(retrieved).toEqual(["bitcoin", "solana"]);
  });

  it("debe añadir un nuevo identificador de forma idempotente", () => {
    addIdToWatchlist("bitcoin");
    expect(getStoredWatchlist()).toEqual(["bitcoin"]);

    // Segunda inserción idéntica
    addIdToWatchlist("bitcoin");
    expect(getStoredWatchlist()).toEqual(["bitcoin"]);

    addIdToWatchlist("cardano");
    expect(getStoredWatchlist()).toEqual(["bitcoin", "cardano"]);
  });

  it("debe eliminar un identificador existente y conservar el resto", () => {
    saveStoredWatchlist(["bitcoin", "ethereum", "solana"]);
    const updated = removeIdFromWatchlist("ethereum");

    expect(updated).toEqual(["bitcoin", "solana"]);
    expect(getStoredWatchlist()).toEqual(["bitcoin", "solana"]);
  });

  it("debe manejar JSON corrupto en localStorage sin provocar excepciones", () => {
    memoryStore[WATCHLIST_STORAGE_KEY] = "{json_invalido:::";

    const retrieved = getStoredWatchlist();
    expect(retrieved).toEqual([]);
  });

  it("debe manejar estructuras antiguas o con propiedades no esperadas", () => {
    // Almacenamiento antiguo de array simple
    memoryStore[WATCHLIST_STORAGE_KEY] = JSON.stringify(["pepe", "near"]);
    expect(getStoredWatchlist()).toEqual(["pepe", "near"]);

    // Objeto sin array coinIds
    memoryStore[WATCHLIST_STORAGE_KEY] = JSON.stringify({ version: 1, invalidKey: 123 });
    expect(getStoredWatchlist()).toEqual([]);
  });

  it("debe funcionar con respaldo en memoria cuando localStorage no está disponible", () => {
    // Simula entorno restrictivo sin acceso a localStorage
    Object.defineProperty(globalThis, "localStorage", {
      value: null,
      writable: true,
      configurable: true,
    });

    expect(isWatchlistStorageAvailable()).toBe(false);

    // Operaciones en memoria
    addIdToWatchlist("bitcoin");
    expect(getStoredWatchlist()).toEqual(["bitcoin"]);

    removeIdFromWatchlist("bitcoin");
    expect(getStoredWatchlist()).toEqual([]);
  });

  it("debe tolerar errores de cuota o excepciones en setItem sin fallar", () => {
    mockStorage.setItem = vi.fn().mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });

    const success = saveStoredWatchlist(["bitcoin"]);
    expect(success).toBe(false);
    // El respaldo en memoria conserva el dato para la sesión actual
    expect(getStoredWatchlist()).toEqual(["bitcoin"]);
  });

  it("debe verificar la disponibilidad operativa de localStorage", () => {
    expect(isWatchlistStorageAvailable()).toBe(true);
  });
});
