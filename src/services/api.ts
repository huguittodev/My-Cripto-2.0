// Servicio central de datos de mercado para My Crypto 2.0
// Desacoplado de componentes React, con soporte de proveedores intercambiables,
// deduplicación en vuelo, caché en memoria y reintentos automáticos con backoff.

import type {
  CryptoList,
  GlobalMarketData,
  HistoricalPriceData,
  GetMarketsParams,
  SearchCoinResult,
} from "../types/crypto";
import {
  RateLimitError,
  HttpError,
  NetworkError,
  UnexpectedDataError,
} from "./marketData/types.ts";
import type {
  GetMarketChartParams,
  MarketDataProvider,
} from "./marketData/types.ts";
import { requestManager } from "./marketData/requestManager.ts";
import { coinGeckoProvider, CoinGeckoProvider } from "./marketData/coinGeckoProvider.ts";

// Reexporta los errores tipados para consumo uniforme por hooks y componentes
export {
  RateLimitError,
  HttpError,
  NetworkError,
  UnexpectedDataError,
};
export type { GetMarketChartParams, MarketDataProvider };

// Proveedor de datos activo en la aplicación (por defecto CoinGecko v3)
let activeProvider: MarketDataProvider = coinGeckoProvider;

/**
 * Permite cambiar el proveedor de mercado en tiempo de ejecución
 * (ej. para pruebas automatizadas o migración futura sin alterar la interfaz).
 */
export const setMarketProvider = (provider: MarketDataProvider): void => {
  activeProvider = provider;
};

/**
 * Devuelve el proveedor de mercado actualmente activo.
 */
export const getMarketProvider = (): MarketDataProvider => {
  return activeProvider;
};

/**
 * Limpia la caché en memoria de mercados.
 */
export const clearMarketsCache = (): void => {
  requestManager.clearCache("markets-");
};

/**
 * Limpia la caché en memoria de búsquedas.
 */
export const clearSearchCache = (): void => {
  requestManager.clearCache("search-");
};

/**
 * Limpia la caché en memoria de series históricas de gráficos.
 */
export const clearChartCache = (): void => {
  requestManager.clearCache("chart-");
};

/**
 * Consulta de mercados paginada, con sparklines y filtros por IDs.
 */
export const getMarkets = async (params: GetMarketsParams = {}): Promise<CryptoList> => {
  return activeProvider.getMarkets(params);
};

/**
 * Obtiene la lista de principales criptomonedas ordenadas por capitalización.
 */
export const getTopCoins = async (params: {
  numCryptos: number;
  signal?: AbortSignal;
}): Promise<CryptoList> => {
  return activeProvider.getTopCoins(params);
};

/**
 * Busca activos en el catálogo del proveedor a partir de una consulta de texto.
 */
export const searchCoins = async (
  query: string,
  signal?: AbortSignal,
  ignoreCache = false,
): Promise<SearchCoinResult[]> => {
  return activeProvider.searchCoins(query, signal, ignoreCache);
};

/**
 * Obtiene los datos macro y resumen global del mercado de criptomonedas.
 */
export const getGlobalMarketData = async (signal?: AbortSignal): Promise<GlobalMarketData> => {
  return activeProvider.getGlobalMarketData(signal);
};

/**
 * Obtiene la serie temporal de precios históricos para un activo y periodo especificados.
 */
export const getCoinMarketChart = async (
  params: GetMarketChartParams,
): Promise<HistoricalPriceData> => {
  return activeProvider.getCoinMarketChart(params);
};

/**
 * Recupera datos históricos desactualizados (stale data) de la caché en memoria
 * para mantener la visualización en caso de fallo temporal de red o rate limit.
 */
export const getStaleChartData = (
  coinId: string,
  days: number,
  vsCurrency = "eur",
): HistoricalPriceData | null => {
  const cleanId = coinId.toLowerCase().trim();
  const cacheKey = `chart-${cleanId}-${days}-${vsCurrency.toLowerCase()}`;
  return requestManager.getStaleData<HistoricalPriceData>(cacheKey);
};

// Exporta la clase CoinGeckoProvider para pruebas avanzadas
export { CoinGeckoProvider };
