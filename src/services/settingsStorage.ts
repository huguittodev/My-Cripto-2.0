/**
 * Servicio centralizado de persistencia para las preferencias del sistema.
 * Gestiona el almacenamiento en localStorage con validación de esquema,
 * fallback en memoria y emisión de eventos del DOM para sincronización reactiva.
 */

import type {
  AppSettings,
  BaseCurrency,
  ThemeMode,
  SettingsStoragePayload,
  LocalStorageStats,
} from "../types/settings.ts";
import { DEFAULT_SETTINGS } from "../types/settings.ts";
import { PORTFOLIO_STORAGE_KEY } from "./portfolioStorage.ts";
import { ALERT_STORAGE_KEY } from "./alertStorage.ts";
import { WATCHLIST_STORAGE_KEY } from "./watchlistStorage.ts";

// Clave única versionada para preferencias en localStorage
export const SETTINGS_STORAGE_KEY = "my-crypto-settings-v1";
export const CURRENT_SETTINGS_VERSION = 1;

// Evento custom del DOM para sincronización reactiva inmediata
export const SETTINGS_UPDATED_EVENT = "mycrypto:settings_updated";

// Almacenamiento en memoria volátil de respaldo si localStorage está bloqueado
let memoryFallback: AppSettings = { ...DEFAULT_SETTINGS };

/**
 * Obtiene de forma segura el objeto de almacenamiento local del entorno.
 */
const getStorage = (): Storage | null => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    return null;
  }
  return null;
};

/**
 * Comprueba de forma segura si localStorage está disponible y admite lectura/escritura.
 */
export const isSettingsStorageAvailable = (): boolean => {
  const storage = getStorage();
  if (!storage) return false;

  const testKey = "__crypto_settings_storage_test__";
  try {
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Emite el evento del DOM para notificar a los suscriptores que los ajustes han cambiado.
 */
const notifySettingsChanged = (): void => {
  try {
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
    } else if (
      typeof globalThis !== "undefined" &&
      typeof (globalThis as unknown as { dispatchEvent?: (e: Event) => boolean }).dispatchEvent ===
        "function"
    ) {
      (globalThis as unknown as { dispatchEvent: (e: Event) => boolean }).dispatchEvent(
        new CustomEvent(SETTINGS_UPDATED_EVENT),
      );
    }
  } catch (err) {
    console.warn("No se pudo emitir el evento de actualización de ajustes:", err);
  }
};

/**
 * Validador estricto en tiempo de ejecución para asegurar la integridad de las preferencias.
 * Si algún campo es inválido o desconocido, lo sustituye por su valor por defecto seguro.
 */
export const sanitizeSettings = (raw: unknown): AppSettings => {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SETTINGS };
  }

  const candidate = raw as Record<string, unknown>;

  // Valida la divisa base
  const validCurrencies: BaseCurrency[] = ["EUR", "USD", "GBP"];
  const currency: BaseCurrency =
    typeof candidate.currency === "string" &&
    validCurrencies.includes(candidate.currency as BaseCurrency)
      ? (candidate.currency as BaseCurrency)
      : DEFAULT_SETTINGS.currency;

  // Valida el modo de tema
  const validThemes: ThemeMode[] = ["dark", "light", "system"];
  const theme: ThemeMode =
    typeof candidate.theme === "string" && validThemes.includes(candidate.theme as ThemeMode)
      ? (candidate.theme as ThemeMode)
      : DEFAULT_SETTINGS.theme;

  // Valida el intervalo de actualización automática
  let autoRefreshInterval = DEFAULT_SETTINGS.autoRefreshInterval;
  if (
    typeof candidate.autoRefreshInterval === "number" &&
    !isNaN(candidate.autoRefreshInterval) &&
    candidate.autoRefreshInterval >= 0
  ) {
    autoRefreshInterval = candidate.autoRefreshInterval;
  }

  return {
    currency,
    theme,
    autoRefreshInterval,
  };
};

/**
 * Lee las preferencias del sistema desde localStorage con recuperación automática ante errores.
 */
export const getStoredSettings = (): AppSettings => {
  const storage = getStorage();
  if (!storage) {
    return { ...memoryFallback };
  }

  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }

    const parsed = JSON.parse(raw) as unknown;

    // Si viene encapsulado en payload versionado
    if (parsed && typeof parsed === "object" && "settings" in parsed) {
      const payload = parsed as SettingsStoragePayload;
      return sanitizeSettings(payload.settings);
    }

    // Compatibilidad directa con formato plano anterior si existiera
    return sanitizeSettings(parsed);
  } catch (err) {
    console.warn("Error al leer ajustes desde localStorage, usando valores por defecto:", err);
    return { ...DEFAULT_SETTINGS };
  }
};

/**
 * Guarda las preferencias del sistema en localStorage de forma atómica y versionada.
 */
export const saveStoredSettings = (settings: AppSettings): boolean => {
  const sanitized = sanitizeSettings(settings);
  memoryFallback = { ...sanitized };

  const storage = getStorage();
  if (!storage) {
    notifySettingsChanged();
    return true;
  }

  try {
    const payload: SettingsStoragePayload = {
      version: CURRENT_SETTINGS_VERSION,
      settings: sanitized,
      updatedAt: Date.now(),
    };
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
    notifySettingsChanged();
    return true;
  } catch (err) {
    console.warn("Error al guardar ajustes en localStorage, usando fallback en memoria:", err);
    notifySettingsChanged();
    return false;
  }
};

/**
 * Actualiza campos específicos de las preferencias conservando el resto intacto.
 */
export const updateStoredSettings = (partial: Partial<AppSettings>): AppSettings => {
  const current = getStoredSettings();
  const updated: AppSettings = sanitizeSettings({
    ...current,
    ...partial,
  });

  saveStoredSettings(updated);
  return updated;
};

/**
 * Restablece exclusivamente los ajustes a sus valores predeterminados de fábrica.
 * IMPORTANTE: No elimina ni modifica la cartera, la watchlist ni las alertas del usuario.
 */
export const resetStoredSettings = (): AppSettings => {
  const defaults = { ...DEFAULT_SETTINGS };
  saveStoredSettings(defaults);
  return defaults;
};

/**
 * Acción explícita para eliminar TODOS los datos locales de My Crypto 2.0.
 * Afecta exclusivamente a las claves del proyecto y preserva otras aplicaciones.
 */
export const clearAllStoredData = (): void => {
  const storage = getStorage();

  // 1. Limpia claves de localStorage si está disponible
  if (storage) {
    try {
      storage.removeItem(SETTINGS_STORAGE_KEY);
      storage.removeItem(PORTFOLIO_STORAGE_KEY);
      storage.removeItem(WATCHLIST_STORAGE_KEY);
      storage.removeItem(ALERT_STORAGE_KEY);
    } catch (err) {
      console.warn("Error al limpiar claves en localStorage:", err);
    }
  }

  // 2. Restablece variables de respaldo en memoria
  memoryFallback = { ...DEFAULT_SETTINGS };

  // 3. Emite eventos para que todas las vistas reactivas se actualicen
  notifySettingsChanged();

  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mycrypto:portfolio_updated"));
      window.dispatchEvent(new CustomEvent("mycrypto:watchlist_updated"));
      window.dispatchEvent(new CustomEvent("mycrypto:alerts_updated"));
    }
  } catch {
    // Ignorado en entornos no-DOM
  }
};

/**
 * Calcula métricas reales de ocupación en bytes y conteo de registros en localStorage.
 */
export const getLocalStorageStats = (): LocalStorageStats => {
  const storage = getStorage();
  const isAvailable = isSettingsStorageAvailable();

  if (!storage || !isAvailable) {
    return {
      totalBytes: 0,
      formattedSize: "0 B",
      itemCounts: {
        settings: 1,
        watchlist: 0,
        portfolioTransactions: 0,
        alerts: 0,
      },
      isAvailable: false,
    };
  }

  const projectKeys = [
    SETTINGS_STORAGE_KEY,
    PORTFOLIO_STORAGE_KEY,
    WATCHLIST_STORAGE_KEY,
    ALERT_STORAGE_KEY,
  ];

  let totalBytes = 0;
  let watchlistCount = 0;
  let portfolioCount = 0;
  let alertsCount = 0;
  let settingsCount = 0;

  try {
    for (const key of projectKeys) {
      const item = storage.getItem(key);
      if (item) {
        // En UTF-16, cada carácter en JavaScript equivale a ~2 bytes en memoria interna
        totalBytes += (key.length + item.length) * 2;

        try {
          const parsed = JSON.parse(item) as Record<string, unknown>;
          if (key === SETTINGS_STORAGE_KEY) {
            settingsCount = 1;
          } else if (key === WATCHLIST_STORAGE_KEY && Array.isArray(parsed.coinIds)) {
            watchlistCount = parsed.coinIds.length;
          } else if (key === PORTFOLIO_STORAGE_KEY && Array.isArray(parsed.transactions)) {
            portfolioCount = parsed.transactions.length;
          } else if (key === ALERT_STORAGE_KEY && Array.isArray(parsed.alerts)) {
            alertsCount = parsed.alerts.length;
          }
        } catch {
          // Ignorado si la entrada está corrupta
        }
      }
    }
  } catch {
    // Ignorado si ocurre error al acceder a storage
  }

  // Formatea el tamaño en B, KB o MB
  let formattedSize = `${totalBytes} B`;
  if (totalBytes >= 1024 * 1024) {
    formattedSize = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (totalBytes >= 1024) {
    formattedSize = `${(totalBytes / 1024).toFixed(1)} KB`;
  }

  return {
    totalBytes,
    formattedSize,
    itemCounts: {
      settings: settingsCount,
      watchlist: watchlistCount,
      portfolioTransactions: portfolioCount,
      alerts: alertsCount,
    },
    isAvailable: true,
  };
};
