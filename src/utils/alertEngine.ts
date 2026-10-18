import type {
  PriceAlert,
  AlertCondition,
} from "../types/crypto";

/**
 * Tiempo máximo en milisegundos tras el cual una cotización se considera obsoleta (5 minutos).
 * Se evita disparar alertas basadas en precios desfasados.
 */
export const MAX_PRICE_STALENESS_MS = 5 * 60 * 1000;

export interface PriceDataPoint {
  price: number;
  timestamp?: number;
  isStale?: boolean;
}

export interface AlertEvaluationResult {
  triggered: boolean;
  alert: PriceAlert;
  reason?: string;
}

export interface BatchEvaluationResult {
  updatedAlerts: PriceAlert[];
  triggeredAlerts: PriceAlert[];
}

export interface AlertValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Evalúa una única alerta frente al precio actual de mercado de forma pura.
 * No genera efectos secundarios ni muta el objeto original.
 */
export function evaluateAlert(
  alert: PriceAlert,
  currentPrice: number | null | undefined,
  timestamp: number = Date.now(),
): AlertEvaluationResult {
  // Las alertas inactivas o ya disparadas no se evalúan ni generan avisos
  if (alert.status !== "active") {
    return {
      triggered: false,
      alert,
      reason: `Alert status is ${alert.status}`,
    };
  }

  // Comprueba que el precio de mercado sea un número finito y estrictamente positivo
  if (
    currentPrice === null ||
    currentPrice === undefined ||
    typeof currentPrice !== "number" ||
    isNaN(currentPrice) ||
    !isFinite(currentPrice) ||
    currentPrice <= 0
  ) {
    return {
      triggered: false,
      alert,
      reason: "invalid_price",
    };
  }

  // Evaluación de la condición matemática
  let conditionMet = false;
  if (alert.condition === "gte") {
    conditionMet = currentPrice >= alert.targetPrice;
  } else if (alert.condition === "lte") {
    conditionMet = currentPrice <= alert.targetPrice;
  }

  if (conditionMet) {
    const updatedAlert: PriceAlert = {
      ...alert,
      status: "triggered",
      triggeredAt: timestamp,
      triggeredPrice: currentPrice,
      lastNotifiedAt: timestamp,
    };
    return {
      triggered: true,
      alert: updatedAlert,
    };
  }

  return {
    triggered: false,
    alert,
  };
}

/**
 * Evalúa un lote de alertas contra un mapa de precios vigentes.
 * Filtra automáticamente precios obsoletos o erróneos para evitar falsos positivos.
 */
export function evaluateAlerts(
  alerts: PriceAlert[],
  priceMap: Record<string, PriceDataPoint | number | null | undefined>,
  now: number = Date.now(),
): BatchEvaluationResult {
  const updatedAlerts: PriceAlert[] = [];
  const triggeredAlerts: PriceAlert[] = [];

  for (const alert of alerts) {
    // Si la alerta no está activa, se preserva sin cambios
    if (alert.status !== "active") {
      updatedAlerts.push(alert);
      continue;
    }

    const priceEntry = priceMap[alert.coinId.toLowerCase().trim()];
    if (!priceEntry) {
      updatedAlerts.push(alert);
      continue;
    }

    let priceValue: number;
    let isStale = false;

    if (typeof priceEntry === "number") {
      priceValue = priceEntry;
    } else {
      priceValue = priceEntry.price;
      if (priceEntry.isStale) {
        isStale = true;
      } else if (
        typeof priceEntry.timestamp === "number" &&
        now - priceEntry.timestamp > MAX_PRICE_STALENESS_MS
      ) {
        isStale = true;
      }
    }

    // Si el dato está obsoleto o no es válido, se mantiene la alerta sin disparar
    if (isStale) {
      updatedAlerts.push(alert);
      continue;
    }

    const result = evaluateAlert(alert, priceValue, now);
    updatedAlerts.push(result.alert);

    if (result.triggered) {
      triggeredAlerts.push(result.alert);
    }
  }

  return {
    updatedAlerts,
    triggeredAlerts,
  };
}

/**
 * Valida los datos de entrada para la creación o edición de una alerta.
 * Comprueba positividad del precio objetivo, consistencia del identificador y duplicados.
 */
export function validateAlertInput(input: {
  coinId?: string;
  condition?: AlertCondition;
  targetPrice?: unknown;
  currentPrice?: number | null;
  existingAlerts?: PriceAlert[];
  editingAlertId?: string;
}): AlertValidationResult {
  const { coinId, condition, targetPrice, currentPrice, existingAlerts = [], editingAlertId } = input;

  if (!coinId || typeof coinId !== "string" || coinId.trim().length === 0) {
    return {
      isValid: false,
      error: "Debes seleccionar o indicar una criptomoneda válida.",
    };
  }

  if (condition !== "gte" && condition !== "lte") {
    return {
      isValid: false,
      error: "La condición de precio debe ser 'gte' (mayor o igual) o 'lte' (menor o igual).",
    };
  }

  const numericTarget = typeof targetPrice === "string" ? parseFloat(targetPrice) : Number(targetPrice);

  if (
    typeof numericTarget !== "number" ||
    isNaN(numericTarget) ||
    !isFinite(numericTarget) ||
    numericTarget <= 0
  ) {
    return {
      isValid: false,
      error: "El precio objetivo debe ser un número finito estrictamente mayor que cero.",
    };
  }

  const normalizedCoinId = coinId.trim().toLowerCase();

  // Detección de alertas duplicadas equivalentes ya existentes
  const isDuplicate = existingAlerts.some((existing) => {
    if (editingAlertId && existing.id === editingAlertId) {
      return false;
    }
    return (
      existing.status === "active" &&
      existing.coinId.toLowerCase() === normalizedCoinId &&
      existing.condition === condition &&
      Math.abs(existing.targetPrice - numericTarget) < 0.00000001
    );
  });

  if (isDuplicate) {
    return {
      isValid: false,
      error: "Ya existe una alerta activa para este activo con la misma condición y precio objetivo.",
    };
  }

  // Advertencia informativa si el precio actual ya satisface la condición solicitada
  let warning: string | undefined;
  if (typeof currentPrice === "number" && isFinite(currentPrice) && currentPrice > 0) {
    if (condition === "gte" && currentPrice >= numericTarget) {
      warning =
        "Aviso: El precio actual ya es igual o superior al objetivo. La alerta se activará al evaluar las cotizaciones.";
    } else if (condition === "lte" && currentPrice <= numericTarget) {
      warning =
        "Aviso: El precio actual ya es igual o inferior al objetivo. La alerta se activará al evaluar las cotizaciones.";
    }
  }

  return {
    isValid: true,
    warning,
  };
}
