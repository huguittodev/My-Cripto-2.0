import type {
  CryptoList,
  GlobalMarketData,
  TimeRangeDays,
  HistoricalPriceData,
} from "../types/crypto";
import {
  normalizeChartPoints,
  calculatePeriodPerformance,
  calculateMinMax,
} from "../utils/calculations.ts";

const BASE_URL = "https://api.coingecko.com/api/v3";

export class RateLimitError extends Error {
  constructor(
    message = "Límite de peticiones alcanzado (HTTP 429). Espera un minuto antes de reintentar.",
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Error en la solicitud a CoinGecko (HTTP ${status}).`);
    this.name = "HttpError";
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor(
    message = "Error de red: No se pudo conectar con el servidor. Revisa tu conexión a internet.",
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export class UnexpectedDataError extends Error {
  constructor(
    message = "La respuesta del proveedor de mercado no tiene el formato esperado.",
  ) {
    super(message);
    this.name = "UnexpectedDataError";
  }
}

/**
 * Obtiene la lista de principales criptomonedas ordenadas por capitalización de mercado.
 */
export const getTopCoins = async ({
  numCryptos,
}: {
  numCryptos: number;
}): Promise<CryptoList> => {
  let response: Response;

  try {
    response = await fetch(
      `${BASE_URL}/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=${numCryptos}&page=1&sparkline=false`,
    );
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      throw new NetworkError();
    }
    if (error instanceof Error) {
      throw new NetworkError(`Error al realizar la petición: ${error.message}`);
    }
    throw new NetworkError();
  }

  if (response.status === 429) {
    throw new RateLimitError();
  }

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  try {
    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
      throw new UnexpectedDataError();
    }
    return data as CryptoList;
  } catch (error: unknown) {
    if (error instanceof UnexpectedDataError) {
      throw error;
    }
    throw new UnexpectedDataError(
      "Error al procesar los datos de la respuesta.",
    );
  }
};

/**
 * Obtiene los datos macro y resumen global del mercado de criptomonedas desde CoinGecko v3 /global.
 * Proporciona: capitalización total (EUR), volumen 24h (EUR), dominancia de BTC (%) y variación 24h (%).
 */
export const getGlobalMarketData = async (): Promise<GlobalMarketData> => {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}/global`);
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      throw new NetworkError();
    }
    if (error instanceof Error) {
      throw new NetworkError(`Error al realizar la petición: ${error.message}`);
    }
    throw new NetworkError();
  }

  if (response.status === 429) {
    throw new RateLimitError();
  }

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  try {
    const json: unknown = await response.json();
    if (
      typeof json !== "object" ||
      json === null ||
      !("data" in json) ||
      typeof (json as { data: unknown }).data !== "object" ||
      (json as { data: unknown }).data === null
    ) {
      throw new UnexpectedDataError(
        "La respuesta de datos globales no tiene el formato esperado.",
      );
    }

    const data = (json as { data: Record<string, unknown> }).data;

    const totalMarketCap = (data.total_market_cap as Record<string, number>) || {};
    const totalVolume = (data.total_volume as Record<string, number>) || {};
    const marketCapPercentage = (data.market_cap_percentage as Record<string, number>) || {};

    return {
      total_market_cap_eur: totalMarketCap.eur ?? 0,
      total_volume_eur: totalVolume.eur ?? 0,
      btc_dominance: marketCapPercentage.btc ?? 0,
      market_cap_change_percentage_24h:
        typeof data.market_cap_change_percentage_24h_usd === "number"
          ? data.market_cap_change_percentage_24h_usd
          : 0,
      updated_at:
        typeof data.updated_at === "number" ? data.updated_at : Date.now(),
    };
  } catch (error: unknown) {
    if (error instanceof UnexpectedDataError) {
      throw error;
    }
    throw new UnexpectedDataError(
      "Error al procesar los datos del mercado global.",
    );
  }
};

// Caché en memoria para evitar peticiones redundantes y respetar los límites de CoinGecko
const chartCache = new Map<string, { data: HistoricalPriceData; expiresAt: number }>();

// Limpia la caché de gráficos históricos (útil para pruebas y recarga forzada)
export const clearChartCache = (): void => {
  chartCache.clear();
};

export interface GetMarketChartParams {
  coinId: string;
  days: TimeRangeDays;
  vsCurrency?: string;
  signal?: AbortSignal;
  ignoreCache?: boolean;
}

/**
 * Obtiene la serie temporal de precios históricos para un activo y periodo especificados.
 * Endpoint: /coins/{id}/market_chart?vs_currency=eur&days={days}
 */
export const getCoinMarketChart = async ({
  coinId,
  days,
  vsCurrency = "eur",
  signal,
  ignoreCache = false,
}: GetMarketChartParams): Promise<HistoricalPriceData> => {
  if (!coinId || typeof coinId !== "string" || coinId.trim() === "") {
    throw new Error("El identificador del activo es obligatorio.");
  }

  const cacheKey = `${coinId.toLowerCase()}-${days}-${vsCurrency.toLowerCase()}`;

  // Comprueba si existe una entrada válida en caché
  if (!ignoreCache) {
    const cached = chartCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
  }

  let response: Response;

  try {
    response = await fetch(
      `${BASE_URL}/coins/${encodeURIComponent(coinId.toLowerCase())}/market_chart?vs_currency=${encodeURIComponent(vsCurrency.toLowerCase())}&days=${days}`,
      { signal },
    );
  } catch (error: unknown) {
    // Si la petición fue abortada intencionalmente, relanza el error original
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    if (error instanceof TypeError) {
      throw new NetworkError();
    }
    if (error instanceof Error) {
      throw new NetworkError(`Error al consultar serie histórica: ${error.message}`);
    }
    throw new NetworkError();
  }

  if (response.status === 429) {
    throw new RateLimitError();
  }

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  try {
    const json: unknown = await response.json();

    if (
      typeof json !== "object" ||
      json === null ||
      !("prices" in json) ||
      !Array.isArray((json as { prices: unknown }).prices)
    ) {
      throw new UnexpectedDataError(
        "La respuesta de la API no contiene la serie de precios esperada.",
      );
    }

    const rawPrices = (json as { prices: unknown[] }).prices;
    const points = normalizeChartPoints(rawPrices);
    const performance = calculatePeriodPerformance(points);
    const { min: minPrice, max: maxPrice } = calculateMinMax(points);

    const result: HistoricalPriceData = {
      coinId: coinId.toLowerCase(),
      days,
      points,
      performance,
      minPrice,
      maxPrice,
    };

    // TTL de caché: 60s para 24h (alta volatilidad), 300s para rangos mayores (7d, 30d, etc.)
    const ttlMs = days === 1 ? 60 * 1000 : 300 * 1000;
    chartCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + ttlMs,
    });

    return result;
  } catch (error: unknown) {
    if (error instanceof UnexpectedDataError) {
      throw error;
    }
    throw new UnexpectedDataError(
      "Error al procesar la serie temporal de precios.",
    );
  }
};

