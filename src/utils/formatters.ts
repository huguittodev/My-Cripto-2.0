/**
 * Utilidades puras para formateo financiero y de fechas.
 * Centraliza la presentación uniforme de monedas, porcentajes y cifras numéricas.
 */

/**
 * Formatea un valor numérico a divisa (EUR por defecto) con precisión adaptativa.
 */
export function formatCurrency(
  value: number | null | undefined,
  currency = "EUR",
  fixedDecimals?: number,
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }

  const absVal = Math.abs(value);
  let decimals = 2;

  if (fixedDecimals !== undefined) {
    decimals = fixedDecimals;
  } else if (absVal === 0) {
    decimals = 2;
  } else if (absVal < 0.0001) {
    decimals = 6;
  } else if (absVal < 1) {
    decimals = 4;
  } else {
    decimals = 2;
  }

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formatea un número grande a notación compacta legible (ej: 1,23 B € o 45,6 M €).
 */
export function formatCompactNumber(
  value: number | null | undefined,
  suffix = "€",
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }

  const formatted = new Intl.NumberFormat("es-ES", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
  }).format(value);

  return suffix ? `${formatted} ${suffix}`.trim() : formatted;
}

/**
 * Formatea un valor porcentual con signo explícito y 2 decimales.
 */
export function formatPercentage(
  value: number | null | undefined,
  includeSign = true,
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0,00 %";
  }

  const absValue = Math.abs(value).toFixed(2).replace(".", ",");

  if (includeSign) {
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${sign}${absValue} %`;
  }

  return `${absValue} %`;
}

/**
 * Formatea una fecha ISO a hora y fecha legible en español.
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

/**
 * Formatea la posición de ranking de mercado (#1, #2, etc.).
 */
export function formatRank(rank: number | null | undefined): string {
  if (!rank || isNaN(rank)) return "—";
  return `#${rank}`;
}
