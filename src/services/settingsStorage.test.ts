import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getStoredSettings,
  saveStoredSettings,
  updateStoredSettings,
  resetStoredSettings,
  clearAllStoredData,
  sanitizeSettings,
  getLocalStorageStats,
  SETTINGS_STORAGE_KEY,
} from "./settingsStorage.ts";
import { DEFAULT_SETTINGS } from "../types/settings.ts";
import { PORTFOLIO_STORAGE_KEY } from "./portfolioStorage.ts";
import { WATCHLIST_STORAGE_KEY } from "./watchlistStorage.ts";
import { ALERT_STORAGE_KEY } from "./alertStorage.ts";

describe("settingsStorage service", () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sanitizeSettings", () => {
    it("debe devolver DEFAULT_SETTINGS ante entradas nulas o no objetos", () => {
      expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
      expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
      expect(sanitizeSettings("string")).toEqual(DEFAULT_SETTINGS);
      expect(sanitizeSettings(123)).toEqual(DEFAULT_SETTINGS);
    });

    it("debe corregir divisas desconocidas a la divisa por defecto (EUR)", () => {
      const sanitized = sanitizeSettings({ currency: "JPY", theme: "dark" });
      expect(sanitized.currency).toBe("EUR");
    });

    it("debe admitir EUR, USD y GBP", () => {
      expect(sanitizeSettings({ currency: "EUR" }).currency).toBe("EUR");
      expect(sanitizeSettings({ currency: "USD" }).currency).toBe("USD");
      expect(sanitizeSettings({ currency: "GBP" }).currency).toBe("GBP");
    });

    it("debe corregir temas no válidos al tema por defecto (dark)", () => {
      const sanitized = sanitizeSettings({ theme: "neon" });
      expect(sanitized.theme).toBe("dark");
    });

    it("debe admitir dark, light y system", () => {
      expect(sanitizeSettings({ theme: "dark" }).theme).toBe("dark");
      expect(sanitizeSettings({ theme: "light" }).theme).toBe("light");
      expect(sanitizeSettings({ theme: "system" }).theme).toBe("system");
    });

    it("debe validar el intervalo de auto-refresco", () => {
      expect(sanitizeSettings({ autoRefreshInterval: -10 }).autoRefreshInterval).toBe(
        DEFAULT_SETTINGS.autoRefreshInterval,
      );
      expect(sanitizeSettings({ autoRefreshInterval: 120 }).autoRefreshInterval).toBe(120);
      expect(sanitizeSettings({ autoRefreshInterval: 0 }).autoRefreshInterval).toBe(0);
    });
  });

  describe("getStoredSettings y saveStoredSettings", () => {
    it("debe devolver valores por defecto si no hay nada guardado", () => {
      const settings = getStoredSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it("debe guardar y recuperar preferencias válidas", () => {
      const custom = {
        currency: "USD" as const,
        theme: "light" as const,
        autoRefreshInterval: 120,
      };

      const success = saveStoredSettings(custom);
      expect(success).toBe(true);

      const retrieved = getStoredSettings();
      expect(retrieved).toEqual(custom);
    });

    it("debe recuperarse de JSON corrupto en localStorage", () => {
      memoryStore[SETTINGS_STORAGE_KEY] = "{ json corrupto sin cerrar...";

      const settings = getStoredSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe("updateStoredSettings", () => {
    it("debe actualizar sólo los campos indicados conservando los demás", () => {
      saveStoredSettings({
        currency: "EUR",
        theme: "dark",
        autoRefreshInterval: 60,
      });

      const updated = updateStoredSettings({ currency: "GBP" });
      expect(updated.currency).toBe("GBP");
      expect(updated.theme).toBe("dark");
      expect(updated.autoRefreshInterval).toBe(60);

      const retrieved = getStoredSettings();
      expect(retrieved.currency).toBe("GBP");
    });
  });

  describe("resetStoredSettings", () => {
    it("debe restablecer los ajustes a los valores por defecto", () => {
      saveStoredSettings({
        currency: "USD",
        theme: "light",
        autoRefreshInterval: 120,
      });

      const reset = resetStoredSettings();
      expect(reset).toEqual(DEFAULT_SETTINGS);
      expect(getStoredSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it("NO debe eliminar ni modificar la cartera, alertas ni watchlist", () => {
      // Simula datos existentes de cartera, watchlist y alertas
      memoryStore[PORTFOLIO_STORAGE_KEY] = JSON.stringify({ version: 1, transactions: [{ id: "tx-1" }] });
      memoryStore[WATCHLIST_STORAGE_KEY] = JSON.stringify({ version: 1, coinIds: ["bitcoin"] });
      memoryStore[ALERT_STORAGE_KEY] = JSON.stringify({ version: 1, alerts: [{ id: "alt-1" }] });

      resetStoredSettings();

      // Comprueba que los otros almacenes no se han tocado
      expect(memoryStore[PORTFOLIO_STORAGE_KEY]).toContain("tx-1");
      expect(memoryStore[WATCHLIST_STORAGE_KEY]).toContain("bitcoin");
      expect(memoryStore[ALERT_STORAGE_KEY]).toContain("alt-1");
    });
  });

  describe("clearAllStoredData", () => {
    it("debe eliminar todas las claves locales de My Crypto", () => {
      memoryStore[SETTINGS_STORAGE_KEY] = "test-settings";
      memoryStore[PORTFOLIO_STORAGE_KEY] = "test-portfolio";
      memoryStore[WATCHLIST_STORAGE_KEY] = "test-watchlist";
      memoryStore[ALERT_STORAGE_KEY] = "test-alerts";
      memoryStore["other-app-key"] = "preserved";

      clearAllStoredData();

      expect(memoryStore[SETTINGS_STORAGE_KEY]).toBeUndefined();
      expect(memoryStore[PORTFOLIO_STORAGE_KEY]).toBeUndefined();
      expect(memoryStore[WATCHLIST_STORAGE_KEY]).toBeUndefined();
      expect(memoryStore[ALERT_STORAGE_KEY]).toBeUndefined();
      expect(memoryStore["other-app-key"]).toBe("preserved");
    });
  });

  describe("getLocalStorageStats", () => {
    it("debe calcular estadísticas correctas de uso de almacenamiento", () => {
      saveStoredSettings(DEFAULT_SETTINGS);
      memoryStore[WATCHLIST_STORAGE_KEY] = JSON.stringify({ version: 1, coinIds: ["btc", "eth"] });
      memoryStore[PORTFOLIO_STORAGE_KEY] = JSON.stringify({ version: 1, transactions: [{ id: "1" }] });
      memoryStore[ALERT_STORAGE_KEY] = JSON.stringify({ version: 1, alerts: [{ id: "a" }, { id: "b" }] });

      const stats = getLocalStorageStats();
      expect(stats.isAvailable).toBe(true);
      expect(stats.totalBytes).toBeGreaterThan(0);
      expect(stats.itemCounts.settings).toBe(1);
      expect(stats.itemCounts.watchlist).toBe(2);
      expect(stats.itemCounts.portfolioTransactions).toBe(1);
      expect(stats.itemCounts.alerts).toBe(2);
    });
  });
});
