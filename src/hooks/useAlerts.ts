import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type {
  PriceAlert,
  NotificationToast,
  CryptoList,
  AlertStatus,
} from "../types/crypto";
import {
  getStoredAlerts,
  addStoredAlert,
  updateStoredAlert,
  deleteStoredAlert,
  toggleStoredAlertActive,
  clearAlertStorage,
  saveStoredAlerts,
  ALERTS_UPDATED_EVENT,
} from "../services/alertStorage.ts";
import {
  evaluateAlerts,
  type PriceDataPoint,
} from "../utils/alertEngine.ts";
import { getMarkets } from "../services/api.ts";
import {
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
} from "../services/browserNotification.ts";

export interface UseAlertsOptions {
  externalCoins?: CryptoList;
  autoPollIntervalMs?: number;
  vsCurrency?: string;
}

export interface UseAlertsReturn {
  alerts: PriceAlert[];
  activeAlerts: PriceAlert[];
  triggeredAlerts: PriceAlert[];
  inactiveAlerts: PriceAlert[];
  activeAlertsCount: number;
  triggeredAlertsCount: number;
  currentPrices: Record<string, number | null>;
  isLoadingPrices: boolean;
  priceError: string | null;
  toasts: NotificationToast[];
  browserPermission: NotificationPermission;
  isNotificationSupported: boolean;
  addAlert: (
    alertData: Omit<PriceAlert, "id" | "createdAt" | "status"> & {
      status?: AlertStatus;
      createdAt?: number;
    },
  ) => PriceAlert;
  updateAlert: (alert: PriceAlert) => boolean;
  deleteAlert: (id: string) => boolean;
  toggleAlert: (id: string) => PriceAlert | null;
  clearAlerts: () => void;
  refreshPrices: () => Promise<void>;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  requestNotificationPermission: () => Promise<NotificationPermission>;
}

// Intervalo por defecto para la evaluación periódica centralizada (30 segundos)
const DEFAULT_POLL_INTERVAL_MS = 30000;

/**
 * Hook orquestador del sistema de alertas de precio.
 * Centraliza la persistencia local, la evaluación continua de cotizaciones,
 * el sistema de notificaciones in-app (toasts) y de escritorio.
 */
export const useAlerts = ({
  externalCoins = [],
  autoPollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  vsCurrency = "eur",
}: UseAlertsOptions = {}): UseAlertsReturn => {
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => getStoredAlerts());
  const [currentPrices, setCurrentPrices] = useState<Record<string, number | null>>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState<boolean>(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(() =>
    getBrowserNotificationPermission(),
  );

  // Referencias para evitar fugas de memoria, peticiones en vuelo duplicadas y disparos repetidos
  const abortControllerRef = useRef<AbortController | null>(null);
  const isEvaluatingRef = useRef<boolean>(false);

  // Recarga las alertas desde el almacenamiento cuando se emite el evento del sistema
  const reloadAlerts = useCallback(() => {
    setAlerts(getStoredAlerts());
  }, []);

  // Escucha cambios de almacenamiento entre pestañas y eventos en el mismo árbol React
  useEffect(() => {
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === null || e.key.includes("my-crypto-alerts")) {
        reloadAlerts();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(ALERTS_UPDATED_EVENT, reloadAlerts);
      window.addEventListener("storage", handleStorageEvent);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(ALERTS_UPDATED_EVENT, reloadAlerts);
        window.removeEventListener("storage", handleStorageEvent);
      }
    };
  }, [reloadAlerts]);

  // Filtros derivados según el estado de las alertas
  const activeAlerts = useMemo(() => alerts.filter((a) => a.status === "active"), [alerts]);
  const triggeredAlerts = useMemo(() => alerts.filter((a) => a.status === "triggered"), [alerts]);
  const inactiveAlerts = useMemo(() => alerts.filter((a) => a.status === "inactive"), [alerts]);

  // Identificadores únicos de activos necesarios para evaluar alertas activas
  const neededCoinIds = useMemo(() => {
    const ids = new Set<string>();
    for (const alert of activeAlerts) {
      if (alert.coinId) {
        ids.add(alert.coinId.toLowerCase().trim());
      }
    }
    return Array.from(ids);
  }, [activeAlerts]);

  // Mapeo inicial a partir de las criptomonedas ya cargadas en memoria (externalCoins)
  useEffect(() => {
    if (externalCoins.length === 0) return;

    setCurrentPrices((prev) => {
      const updated = { ...prev };
      let changed = false;
      for (const coin of externalCoins) {
        const id = coin.id.toLowerCase().trim();
        if (updated[id] !== coin.current_price) {
          updated[id] = coin.current_price;
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
  }, [externalCoins]);

  // Manejador central para procesar disparos de alertas y crear notificaciones
  const handleTriggeredAlerts = useCallback((triggeredList: PriceAlert[]) => {
    if (triggeredList.length === 0) return;

    const newToasts: NotificationToast[] = [];

    for (const alert of triggeredList) {
      // 1. Notificación de escritorio si está permitida (protegida de errores)
      try {
        sendBrowserNotification(alert);
      } catch (err) {
        console.warn("Fallo al enviar notificación de escritorio:", err);
      }

      // 2. Notificación visual in-app
      const toastItem: NotificationToast = {
        id: `toast_${alert.id}_${Date.now()}`,
        alertId: alert.id,
        coinId: alert.coinId,
        coinName: alert.coinName,
        coinSymbol: alert.coinSymbol,
        coinImage: alert.coinImage,
        condition: alert.condition,
        targetPrice: alert.targetPrice,
        observedPrice: alert.triggeredPrice || alert.targetPrice,
        currency: alert.currency,
        timestamp: alert.triggeredAt || Date.now(),
      };
      newToasts.push(toastItem);
    }

    if (newToasts.length > 0) {
      setToasts((prev) => [...newToasts, ...prev]);
    }
  }, []);

  // Función de evaluación de alertas contra los precios vigentes
  const runEvaluation = useCallback(
    (priceMap: Record<string, PriceDataPoint | number | null | undefined>) => {
      if (isEvaluatingRef.current || activeAlerts.length === 0) return;

      isEvaluatingRef.current = true;
      try {
        const currentAlerts = getStoredAlerts();
        const { updatedAlerts, triggeredAlerts: newlyTriggered } = evaluateAlerts(
          currentAlerts,
          priceMap,
        );

        if (newlyTriggered.length > 0) {
          // Guarda inmediatamente las alertas actualizadas a estado "triggered"
          saveStoredAlerts(updatedAlerts);
          setAlerts(updatedAlerts);
          handleTriggeredAlerts(newlyTriggered);
        }
      } finally {
        isEvaluatingRef.current = false;
      }
    },
    [activeAlerts.length, handleTriggeredAlerts],
  );

  // Consulta de cotizaciones para todos los activos requeridos por alertas activas
  const fetchPricesAndEvaluate = useCallback(
    async (ignoreCache = false) => {
      if (neededCoinIds.length === 0) {
        setIsLoadingPrices(false);
        setPriceError(null);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoadingPrices(true);
      setPriceError(null);

      try {
        const marketItems = await getMarkets({
          ids: neededCoinIds,
          vsCurrency: vsCurrency.toLowerCase(),
          sparkline: false,
          signal: controller.signal,
          ignoreCache,
        });

        if (controller.signal.aborted) return;

        const priceMap: Record<string, PriceDataPoint> = {};
        const newPrices: Record<string, number | null> = {};

        for (const item of marketItems) {
          const id = item.id.toLowerCase().trim();
          newPrices[id] = item.current_price;
          priceMap[id] = {
            price: item.current_price,
            timestamp: new Date(item.last_updated).getTime() || Date.now(),
          };
        }

        setCurrentPrices((prev) => ({ ...prev, ...newPrices }));

        // Ejecuta la evaluación contra los precios recién actualizados
        runEvaluation(priceMap);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (controller.signal.aborted) return;

        const message =
          err instanceof Error ? err.message : "Error al actualizar cotizaciones para alertas.";
        setPriceError(message);
      } finally {
        if (abortControllerRef.current === controller) {
          setIsLoadingPrices(false);
        }
      }
    },
    [neededCoinIds, runEvaluation, vsCurrency],
  );

  // Evaluación inicial cuando cambian los precios en currentPrices
  useEffect(() => {
    if (Object.keys(currentPrices).length > 0) {
      runEvaluation(currentPrices);
    }
  }, [currentPrices, runEvaluation]);

  // Sondeo periódico centralizado (un único temporizador para todas las alertas activas)
  useEffect(() => {
    if (neededCoinIds.length === 0) return;

    // Ejecuta comprobación inicial
    fetchPricesAndEvaluate(false);

    const intervalId = setInterval(() => {
      // Solo consulta si el documento está visible para economizar peticiones
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      fetchPricesAndEvaluate(true);
    }, autoPollIntervalMs);

    return () => {
      clearInterval(intervalId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoPollIntervalMs, fetchPricesAndEvaluate, neededCoinIds.length]);

  // Métodos CRUD
  const addAlert = useCallback(
    (
      alertData: Omit<PriceAlert, "id" | "createdAt" | "status"> & {
        status?: AlertStatus;
        createdAt?: number;
      },
    ): PriceAlert => {
      const created = addStoredAlert(alertData);
      setAlerts(getStoredAlerts());

      // Si disponemos del precio actual para este activo, lo evaluamos inmediatamente
      const currentPrice = currentPrices[created.coinId.toLowerCase().trim()];
      if (currentPrice !== undefined && currentPrice !== null) {
        runEvaluation({ [created.coinId]: currentPrice });
      } else {
        // Si no tenemos la cotización, forzamos su búsqueda inmediata
        fetchPricesAndEvaluate(true);
      }

      return created;
    },
    [currentPrices, fetchPricesAndEvaluate, runEvaluation],
  );

  const updateAlert = useCallback(
    (alert: PriceAlert): boolean => {
      const success = updateStoredAlert(alert);
      if (success) {
        setAlerts(getStoredAlerts());
        if (alert.status === "active") {
          fetchPricesAndEvaluate(true);
        }
      }
      return success;
    },
    [fetchPricesAndEvaluate],
  );

  const deleteAlert = useCallback((id: string): boolean => {
    const success = deleteStoredAlert(id);
    if (success) {
      setAlerts(getStoredAlerts());
    }
    return success;
  }, []);

  const toggleAlert = useCallback((id: string): PriceAlert | null => {
    const updated = toggleStoredAlertActive(id);
    if (updated) {
      setAlerts(getStoredAlerts());
    }
    return updated;
  }, []);

  const clearAlerts = useCallback(() => {
    clearAlertStorage();
    setAlerts([]);
  }, []);

  const refreshPrices = useCallback(async () => {
    await fetchPricesAndEvaluate(true);
  }, [fetchPricesAndEvaluate]);

  // Manejo de Toasts
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Solicitud explícita de permisos de notificación de escritorio
  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    const perm = await requestBrowserNotificationPermission();
    setBrowserPermission(perm);
    return perm;
  }, []);

  return {
    alerts,
    activeAlerts,
    triggeredAlerts,
    inactiveAlerts,
    activeAlertsCount: activeAlerts.length,
    triggeredAlertsCount: triggeredAlerts.length,
    currentPrices,
    isLoadingPrices,
    priceError,
    toasts,
    browserPermission,
    isNotificationSupported: isBrowserNotificationSupported(),
    addAlert,
    updateAlert,
    deleteAlert,
    toggleAlert,
    clearAlerts,
    refreshPrices,
    dismissToast,
    clearToasts,
    requestNotificationPermission,
  };
};
