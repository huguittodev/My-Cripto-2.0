import type { WatchlistStoragePayload } from "../types/crypto";

// Clave versionada para almacenamiento en localStorage
export const WATCHLIST_STORAGE_KEY = "my-crypto-watchlist-v1";

// Versión actual del esquema de persistencia
const STORAGE_VERSION = 1;

// Almacén en memoria como respaldo ante entornos restringidos (modo incógnito estricto o fallos de cuota)
let inMemoryWatchlist = new Set<string>();

/**
 * Obtiene de forma segura el objeto de almacenamiento local del navegador.
 * Evita excepciones si el acceso está bloqueado por directivas de seguridad o SSR.
 */
function getStorage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // Entornos con cookies o almacenamiento bloqueados
    return null;
  }
  return null;
}

/**
 * Comprueba si localStorage está disponible y operativo para lectura y escritura.
 */
export function isWatchlistStorageAvailable(): boolean {
  const storage = getStorage();
  if (!storage) return false;

  const testKey = "__my_crypto_storage_test__";
  try {
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida y desinfecta una lista de identificadores para garantizar unicidad y formato válido.
 */
function sanitizeCoinIds(rawIds: unknown[]): string[] {
  const validIds = new Set<string>();

  for (const item of rawIds) {
    if (typeof item === "string") {
      const trimmed = item.trim().toLowerCase();
      if (trimmed.length > 0) {
        validIds.add(trimmed);
      }
    }
  }

  return Array.from(validIds);
}

/**
 * Recupera la lista de identificadores de criptomonedas guardadas en la watchlist.
 * Maneja JSON corrupto, versiones antiguas y fallos de almacenamiento de manera tolerante.
 */
export function getStoredWatchlist(): string[] {
  const storage = getStorage();

  if (!storage) {
    return Array.from(inMemoryWatchlist);
  }

  try {
    const rawData = storage.getItem(WATCHLIST_STORAGE_KEY);
    if (!rawData) {
      return Array.from(inMemoryWatchlist);
    }

    const parsed: unknown = JSON.parse(rawData);

    // Compatibilidad si el formato almacenado fuera directamente un array de strings
    if (Array.isArray(parsed)) {
      const sanitized = sanitizeCoinIds(parsed);
      inMemoryWatchlist = new Set(sanitized);
      return sanitized;
    }

    // Formato estructurado versionado
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "coinIds" in parsed &&
      Array.isArray((parsed as { coinIds: unknown }).coinIds)
    ) {
      const sanitized = sanitizeCoinIds((parsed as { coinIds: unknown[] }).coinIds);
      inMemoryWatchlist = new Set(sanitized);
      return sanitized;
    }

    // Estructura irreconocible o corrupta
    console.warn("Estructura de watchlist inválida en almacenamiento local. Se inicializa vacía.");
    inMemoryWatchlist.clear();
    return [];
  } catch (error: unknown) {
    console.warn("Error al leer watchlist desde localStorage, usando respaldo en memoria:", error);
    return Array.from(inMemoryWatchlist);
  }
}

/**
 * Persiste la lista de identificadores en localStorage.
 * Retorna true si la escritura tuvo éxito, o false si se recurrió únicamente al respaldo en memoria.
 */
export function saveStoredWatchlist(coinIds: string[]): boolean {
  const sanitized = sanitizeCoinIds(coinIds);
  inMemoryWatchlist = new Set(sanitized);

  const storage = getStorage();
  if (!storage) {
    return false;
  }

  const payload: WatchlistStoragePayload = {
    version: STORAGE_VERSION,
    coinIds: sanitized,
    updatedAt: Date.now(),
  };

  try {
    storage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error: unknown) {
    console.warn("No se pudo escribir la watchlist en localStorage (posible cuota excedida):", error);
    return false;
  }
}

/**
 * Añade un identificador a la lista de favoritos de forma idempotente.
 */
export function addIdToWatchlist(coinId: string): string[] {
  const trimmed = coinId.trim().toLowerCase();
  if (!trimmed) {
    return getStoredWatchlist();
  }

  const current = getStoredWatchlist();
  if (current.includes(trimmed)) {
    return current;
  }

  const updated = [...current, trimmed];
  saveStoredWatchlist(updated);
  return updated;
}

/**
 * Elimina un identificador de la lista de favoritos.
 */
export function removeIdFromWatchlist(coinId: string): string[] {
  const trimmed = coinId.trim().toLowerCase();
  const current = getStoredWatchlist();
  const updated = current.filter((id) => id !== trimmed);

  if (updated.length !== current.length) {
    saveStoredWatchlist(updated);
  }

  return updated;
}

/**
 * Restablece el almacén local y en memoria (útil para pruebas unitarias).
 */
export function clearWatchlistStorage(): void {
  inMemoryWatchlist.clear();
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(WATCHLIST_STORAGE_KEY);
    } catch {
      // Ignorar fallos de limpieza en entornos restrictivos
    }
  }
}
