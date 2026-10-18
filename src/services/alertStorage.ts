import type { PriceAlert, AlertStoragePayload, AlertStatus } from "../types/crypto";

// Clave única versionada para aislamiento en localStorage y soporte de migraciones de esquema
export const ALERT_STORAGE_KEY = "my-crypto-alerts-v1";
export const CURRENT_ALERT_VERSION = 1;

// Evento custom del DOM para sincronización reactiva entre componentes y pestañas
export const ALERTS_UPDATED_EVENT = "mycrypto:alerts_updated";

// Almacenamiento en memoria de respaldo si localStorage está bloqueado o supera cuota
let memoryFallback: PriceAlert[] = [];
let isMemoryFallbackActive = false;

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
 * Comprueba de forma segura si localStorage está disponible y admite escritura.
 */
export const isAlertStorageAvailable = (): boolean => {
  const storage = getStorage();
  if (!storage) return false;

  const testKey = "__crypto_alerts_storage_test__";
  try {
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Emite el evento del DOM para notificar a los hooks y vistas suscritas.
 */
const notifyAlertsChanged = (): void => {
  try {
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent(ALERTS_UPDATED_EVENT));
    } else if (
      typeof globalThis !== "undefined" &&
      typeof (globalThis as unknown as { dispatchEvent?: (e: Event) => boolean }).dispatchEvent ===
        "function"
    ) {
      (globalThis as unknown as { dispatchEvent: (e: Event) => boolean }).dispatchEvent(
        new CustomEvent(ALERTS_UPDATED_EVENT),
      );
    }
  } catch (err) {
    console.warn("No se pudo emitir el evento de alertas:", err);
  }
};

/**
 * Validador en tiempo de ejecución para asegurar la integridad de las alertas cargadas.
 */
export const isValidStoredAlert = (item: unknown): item is PriceAlert => {
  if (typeof item !== "object" || item === null) return false;
  const a = item as Partial<PriceAlert>;

  return (
    typeof a.id === "string" &&
    a.id.trim().length > 0 &&
    typeof a.coinId === "string" &&
    a.coinId.trim().length > 0 &&
    typeof a.coinSymbol === "string" &&
    typeof a.coinName === "string" &&
    (a.condition === "gte" || a.condition === "lte") &&
    typeof a.targetPrice === "number" &&
    !isNaN(a.targetPrice) &&
    isFinite(a.targetPrice) &&
    a.targetPrice > 0 &&
    typeof a.currency === "string" &&
    typeof a.createdAt === "number" &&
    !isNaN(a.createdAt) &&
    (a.status === "active" || a.status === "inactive" || a.status === "triggered")
  );
};

/**
 * Recupera la lista de alertas desde localStorage o desde el respaldo en memoria.
 * Protege frente a JSON corrupto, claves inexistentes o esquemas desactualizados.
 */
export const getStoredAlerts = (): PriceAlert[] => {
  const storage = getStorage();
  if (!storage || !isAlertStorageAvailable() || isMemoryFallbackActive) {
    return [...memoryFallback];
  }

  try {
    const raw = storage.getItem(ALERT_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      !("alerts" in parsed) ||
      !Array.isArray((parsed as AlertStoragePayload).alerts)
    ) {
      console.warn("Estructura de alertas corrupta o inválida en localStorage. Reiniciando...");
      return [];
    }

    const payload = parsed as AlertStoragePayload;
    // Filtra exclusivamente las alertas que cumplen la validación estricta
    return payload.alerts.filter(isValidStoredAlert);
  } catch (err) {
    console.warn("Error al parsear alertas de localStorage, activando respaldo en memoria:", err);
    isMemoryFallbackActive = true;
    return [...memoryFallback];
  }
};

/**
 * Guarda el array de alertas en localStorage usando el esquema versionado.
 */
export const saveStoredAlerts = (alerts: PriceAlert[]): boolean => {
  const valid = alerts.filter(isValidStoredAlert);

  const payload: AlertStoragePayload = {
    version: CURRENT_ALERT_VERSION,
    alerts: valid,
    updatedAt: Date.now(),
  };

  const storage = getStorage();
  if (!storage || !isAlertStorageAvailable() || isMemoryFallbackActive) {
    memoryFallback = [...valid];
    notifyAlertsChanged();
    return true;
  }

  try {
    storage.setItem(ALERT_STORAGE_KEY, JSON.stringify(payload));
    notifyAlertsChanged();
    return true;
  } catch (err) {
    console.warn("No se pudo guardar alertas en localStorage (cuota o bloqueo):", err);
    isMemoryFallbackActive = true;
    memoryFallback = [...valid];
    notifyAlertsChanged();
    return false;
  }
};

/**
 * Añade una nueva alerta generando un identificador único seguro.
 */
export const addStoredAlert = (
  newAlertData: Omit<PriceAlert, "id" | "createdAt" | "status"> & {
    status?: AlertStatus;
    createdAt?: number;
  },
): PriceAlert => {
  const current = getStoredAlerts();
  const id = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const fullAlert: PriceAlert = {
    ...newAlertData,
    id,
    coinId: newAlertData.coinId.toLowerCase().trim(),
    status: newAlertData.status || "active",
    createdAt: newAlertData.createdAt || Date.now(),
    currency: newAlertData.currency || "eur",
  };

  const updated = [fullAlert, ...current];
  saveStoredAlerts(updated);
  return fullAlert;
};

/**
 * Actualiza una alerta existente por su ID.
 */
export const updateStoredAlert = (updatedAlert: PriceAlert): boolean => {
  const current = getStoredAlerts();
  const index = current.findIndex((a) => a.id === updatedAlert.id);
  if (index === -1) {
    return false;
  }

  const updated = [...current];
  updated[index] = {
    ...updatedAlert,
    coinId: updatedAlert.coinId.toLowerCase().trim(),
  };

  return saveStoredAlerts(updated);
};

/**
 * Elimina una alerta por su identificador único.
 */
export const deleteStoredAlert = (id: string): boolean => {
  const current = getStoredAlerts();
  const filtered = current.filter((a) => a.id !== id);
  if (filtered.length === current.length) {
    return false;
  }
  return saveStoredAlerts(filtered);
};

/**
 * Alterna el estado activo/inactivo de una alerta o la rearma si estaba disparada.
 */
export const toggleStoredAlertActive = (id: string): PriceAlert | null => {
  const current = getStoredAlerts();
  const alert = current.find((a) => a.id === id);
  if (!alert) return null;

  const nextStatus: AlertStatus = alert.status === "active" ? "inactive" : "active";
  const updatedAlert: PriceAlert = {
    ...alert,
    status: nextStatus,
    // Si se reactiva una alerta que ya estaba disparada, se limpian los datos de disparo
    triggeredAt: nextStatus === "active" ? undefined : alert.triggeredAt,
    triggeredPrice: nextStatus === "active" ? undefined : alert.triggeredPrice,
  };

  updateStoredAlert(updatedAlert);
  return updatedAlert;
};

/**
 * Vacía el almacenamiento de alertas (útil para pruebas y reseteo).
 */
export const clearAlertStorage = (): void => {
  memoryFallback = [];
  isMemoryFallbackActive = false;
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(ALERT_STORAGE_KEY);
    } catch {
      // Ignora errores al limpiar
    }
  }
  notifyAlertsChanged();
};
