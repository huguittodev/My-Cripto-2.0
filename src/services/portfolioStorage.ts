import type { Transaction, PortfolioStoragePayload } from "../types/crypto";

// Clave única versionada para evitar colisiones y permitir futuras migraciones de esquema
export const PORTFOLIO_STORAGE_KEY = "my-crypto-portfolio-v1";
export const CURRENT_PORTFOLIO_VERSION = 1;

// Evento custom para sincronización reactiva inmediata dentro de la misma pestaña/árbol React
export const PORTFOLIO_UPDATED_EVENT = "mycrypto:portfolio_updated";

// Almacenamiento volátil de respaldo en memoria si localStorage está deshabilitado o arroja cuota excedida
let memoryFallback: Transaction[] = [];
let isMemoryFallbackActive = false;

/**
 * Obtiene de forma segura el objeto de almacenamiento local.
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
 * Comprueba de forma segura si localStorage está disponible en el entorno de ejecución actual.
 */
export const isPortfolioStorageAvailable = (): boolean => {
  const storage = getStorage();
  if (!storage) return false;

  const testKey = "__crypto_storage_test__";
  try {
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Emite el evento del DOM para notificar a los suscriptores que la cartera ha cambiado.
 */
const notifyPortfolioChanged = (): void => {
  try {
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent(PORTFOLIO_UPDATED_EVENT));
    } else if (
      typeof globalThis !== "undefined" &&
      typeof (globalThis as unknown as { dispatchEvent?: (e: Event) => boolean }).dispatchEvent ===
        "function"
    ) {
      (globalThis as unknown as { dispatchEvent: (e: Event) => boolean }).dispatchEvent(
        new CustomEvent(PORTFOLIO_UPDATED_EVENT),
      );
    }
  } catch (err) {
    console.warn("No se pudo despachar el evento de cartera:", err);
  }
};

/**
 * Valida la forma estructural básica de un objeto de transacción cargado desde almacenamiento.
 */
const isValidStoredTransaction = (item: unknown): item is Transaction => {
  if (typeof item !== "object" || item === null) return false;
  const tx = item as Partial<Transaction>;
  return (
    typeof tx.id === "string" &&
    tx.id.trim().length > 0 &&
    typeof tx.coinId === "string" &&
    tx.coinId.trim().length > 0 &&
    (tx.type === "buy" || tx.type === "sell") &&
    typeof tx.amount === "number" &&
    !isNaN(tx.amount) &&
    tx.amount > 0 &&
    typeof tx.pricePerUnit === "number" &&
    !isNaN(tx.pricePerUnit) &&
    tx.pricePerUnit >= 0 &&
    typeof tx.fee === "number" &&
    !isNaN(tx.fee) &&
    tx.fee >= 0 &&
    typeof tx.timestamp === "number" &&
    !isNaN(tx.timestamp)
  );
};

/**
 * Recupera la lista de transacciones desde el almacenamiento local o respaldo en memoria.
 */
export const getStoredTransactions = (): Transaction[] => {
  const storage = getStorage();
  if (!storage || !isPortfolioStorageAvailable() || isMemoryFallbackActive) {
    return [...memoryFallback];
  }

  try {
    const raw = storage.getItem(PORTFOLIO_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      !("transactions" in parsed) ||
      !Array.isArray((parsed as PortfolioStoragePayload).transactions)
    ) {
      console.warn("Estructura de cartera corrupta o inválida en localStorage. Reiniciando...");
      return [];
    }

    const payload = parsed as PortfolioStoragePayload;
    // Filtra únicamente transacciones válidas para proteger la integridad contable
    const validTransactions = payload.transactions.filter(isValidStoredTransaction);
    return validTransactions;
  } catch (err) {
    console.warn("Error al parsear transacciones de localStorage, activando respaldo en memoria:", err);
    isMemoryFallbackActive = true;
    return [...memoryFallback];
  }
};

/**
 * Guarda la lista de transacciones en localStorage con el esquema versionado.
 */
export const saveStoredTransactions = (transactions: Transaction[]): boolean => {
  const valid = transactions.filter(isValidStoredTransaction);

  const payload: PortfolioStoragePayload = {
    version: CURRENT_PORTFOLIO_VERSION,
    transactions: valid,
    updatedAt: Date.now(),
  };

  const storage = getStorage();
  if (!storage || !isPortfolioStorageAvailable() || isMemoryFallbackActive) {
    memoryFallback = [...valid];
    notifyPortfolioChanged();
    return true;
  }

  try {
    storage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(payload));
    notifyPortfolioChanged();
    return true;
  } catch (err) {
    console.warn("No se pudo guardar la cartera en localStorage (posible cuota excedida):", err);
    isMemoryFallbackActive = true;
    memoryFallback = [...valid];
    notifyPortfolioChanged();
    return false;
  }
};

/**
 * Añade una nueva transacción generando un identificador único seguro.
 */
export const addStoredTransaction = (
  newTx: Omit<Transaction, "id" | "createdAt">,
): Transaction => {
  const current = getStoredTransactions();
  const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const fullTx: Transaction = {
    ...newTx,
    id,
    coinId: newTx.coinId.toLowerCase().trim(),
    createdAt: Date.now(),
  };

  const updated = [fullTx, ...current];
  saveStoredTransactions(updated);
  return fullTx;
};

/**
 * Actualiza una transacción existente por su ID.
 */
export const updateStoredTransaction = (updatedTx: Transaction): boolean => {
  const current = getStoredTransactions();
  const index = current.findIndex((t) => t.id === updatedTx.id);
  if (index === -1) {
    return false;
  }

  const updated = [...current];
  updated[index] = {
    ...updatedTx,
    coinId: updatedTx.coinId.toLowerCase().trim(),
  };

  return saveStoredTransactions(updated);
};

/**
 * Elimina una transacción por su identificador único.
 */
export const deleteStoredTransaction = (id: string): boolean => {
  const current = getStoredTransactions();
  const filtered = current.filter((t) => t.id !== id);
  if (filtered.length === current.length) {
    return false;
  }
  return saveStoredTransactions(filtered);
};

/**
 * Vacía completamente el almacenamiento de la cartera (para pruebas y reseteo explícito).
 */
export const clearPortfolioStorage = (): void => {
  memoryFallback = [];
  isMemoryFallbackActive = false;
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(PORTFOLIO_STORAGE_KEY);
    } catch {
      // Ignora errores al limpiar
    }
  }
  notifyPortfolioChanged();
};
