import type { ChartPoint, PeriodPerformance } from "../types/crypto";

// Normaliza y valida una colección cruda de pares [timestamp, price] procedentes de la API
export function normalizeChartPoints(rawPrices: unknown): ChartPoint[] {
  if (!Array.isArray(rawPrices)) {
    return [];
  }

  const validPoints: ChartPoint[] = [];

  for (const item of rawPrices) {
    if (!Array.isArray(item) || item.length < 2) {
      continue;
    }

    const [rawTs, rawPrice] = item;
    const timestamp = typeof rawTs === "number" ? rawTs : Number(rawTs);
    const price = typeof rawPrice === "number" ? rawPrice : Number(rawPrice);

    // Valida que el timestamp y el precio sean numéricos, finitos y lógicos
    if (
      Number.isFinite(timestamp) &&
      timestamp > 0 &&
      Number.isFinite(price) &&
      price >= 0
    ) {
      validPoints.push({
        timestamp: Math.floor(timestamp),
        price,
      });
    }
  }

  if (validPoints.length === 0) {
    return [];
  }

  // Ordena cronológicamente en orden ascendente
  validPoints.sort((a, b) => a.timestamp - b.timestamp);

  // Elimina timestamps duplicados conservando la última lectura registrada
  const deduplicated: ChartPoint[] = [];
  for (const point of validPoints) {
    const last = deduplicated[deduplicated.length - 1];
    if (last && last.timestamp === point.timestamp) {
      deduplicated[deduplicated.length - 1] = point;
    } else {
      deduplicated.push(point);
    }
  }

  return deduplicated;
}

// Calcula el rendimiento porcentual y absoluto de un periodo histórico dado
export function calculatePeriodPerformance(points: ChartPoint[]): PeriodPerformance {
  const invalidResult: PeriodPerformance = {
    startPrice: 0,
    endPrice: 0,
    absoluteChange: 0,
    percentageChange: 0,
    isPositive: false,
    isValid: false,
  };

  if (!points || points.length === 0) {
    return invalidResult;
  }

  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  const startPrice = startPoint.price;
  const endPrice = endPoint.price;

  // Validación estricta: los precios deben ser finitos y el precio inicial mayor a cero
  if (
    !Number.isFinite(startPrice) ||
    !Number.isFinite(endPrice) ||
    startPrice <= 0 ||
    endPrice < 0
  ) {
    return {
      ...invalidResult,
      startPrice: Number.isFinite(startPrice) ? startPrice : 0,
      endPrice: Number.isFinite(endPrice) ? endPrice : 0,
    };
  }

  // Si solo hay un punto válido en la serie temporal
  if (points.length === 1) {
    return {
      startPrice,
      endPrice,
      absoluteChange: 0,
      percentageChange: 0,
      isPositive: false,
      isValid: true,
    };
  }

  const absoluteChange = endPrice - startPrice;
  // Fórmula requerida: ((precio_final / precio_inicial) - 1) * 100
  const rawPercentage = ((endPrice / startPrice) - 1) * 100;
  // Limpia artefactos de coma flotante de IEEE-754 conservando precisión financiera
  const percentageChange = Math.round(rawPercentage * 1000000) / 1000000;

  return {
    startPrice,
    endPrice,
    absoluteChange,
    percentageChange,
    isPositive: percentageChange > 0,
    isValid: true,
  };
}

// Obtiene los valores mínimo y máximo de una serie de puntos
export function calculateMinMax(points: ChartPoint[]): { min: number; max: number } {
  if (!points || points.length === 0) {
    return { min: 0, max: 0 };
  }

  let min = points[0].price;
  let max = points[0].price;

  for (let i = 1; i < points.length; i++) {
    const p = points[i].price;
    if (p < min) min = p;
    if (p > max) max = p;
  }

  return { min, max };
}
