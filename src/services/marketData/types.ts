// Tipos e interfaces de la capa de datos de mercado desacoplada del proveedor

import type {
  CryptoList,
  GlobalMarketData,
  HistoricalPriceData,
  SearchCoinResult,
  GetMarketsParams,
  TimeRangeDays,
} from "../../types/crypto";

// Error cuando el proveedor devuelve HTTP 429 (límite de peticiones)
export class RateLimitError extends Error {
  readonly retryAfterSeconds: number | null;

  constructor(
    message = "Límite de peticiones alcanzado (HTTP 429). Espera unos segundos antes de reintentar.",
    retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// Error de protocolo HTTP (ej. 404, 500, 503)
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Error en la solicitud al proveedor de mercado (HTTP ${status}).`);
    this.name = "HttpError";
    this.status = status;
  }
}

// Error de red cuando no es posible establecer conexión con el servidor
export class NetworkError extends Error {
  constructor(
    message = "Error de red: No se pudo conectar con el servidor. Revisa tu conexión a internet o el proxy local.",
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

// Error cuando el JSON devuelto no coincide con el esquema requerido
export class UnexpectedDataError extends Error {
  constructor(
    message = "La respuesta del proveedor de mercado no tiene el formato esperado.",
  ) {
    super(message);
    this.name = "UnexpectedDataError";
  }
}

export interface GetMarketChartParams {
  coinId: string;
  days: TimeRangeDays;
  vsCurrency?: string;
  signal?: AbortSignal;
  ignoreCache?: boolean;
}

// Contrato formal que cualquier proveedor de datos (CoinGecko, etc.) debe implementar
export interface MarketDataProvider {
  readonly name: string;
  getMarkets(params?: GetMarketsParams): Promise<CryptoList>;
  getTopCoins(params: { numCryptos: number; signal?: AbortSignal }): Promise<CryptoList>;
  searchCoins(query: string, signal?: AbortSignal, ignoreCache?: boolean): Promise<SearchCoinResult[]>;
  getGlobalMarketData(signal?: AbortSignal): Promise<GlobalMarketData>;
  getCoinMarketChart(params: GetMarketChartParams): Promise<HistoricalPriceData>;
}

// Registro en memoria de la caché
export interface CacheRecord<T> {
  data: T;
  expiresAt: number;
}
