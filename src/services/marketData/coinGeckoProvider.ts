// Adaptador de CoinGecko v3: implementa MarketDataProvider y normaliza las respuestas

import type {
  CryptoList,
  GlobalMarketData,
  HistoricalPriceData,
  SearchCoinResult,
  GetMarketsParams,
} from "../../types/crypto";
import {
  normalizeChartPoints,
  calculatePeriodPerformance,
  calculateMinMax,
} from "../../utils/calculations.ts";
import { requestManager } from "./requestManager.ts";
import type { MarketDataProvider, GetMarketChartParams } from "./types.ts";

export class CoinGeckoProvider implements MarketDataProvider {
  readonly name = "CoinGecko v3";
  private baseUrl: string;

  constructor(customBaseUrl?: string) {
    if (customBaseUrl) {
      this.baseUrl = customBaseUrl;
    } else if (typeof window !== "undefined") {
      // En navegador, usamos la ruta del proxy local para evitar bloqueos CORS
      this.baseUrl = "/api/coingecko";
    } else {
      // En entorno Node (SSR / Vitest), usamos la URL canónica
      this.baseUrl = "https://api.coingecko.com/api/v3";
    }
  }

  // Permite actualizar la URL base dinámicamente (útil para pruebas o proxies personalizados)
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Construye una URL con parámetros de búsqueda compatibles tanto con rutas relativas como absolutas.
   */
  private buildUrl(endpoint: string, params: Record<string, string | number | boolean | undefined>): string {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }
    const query = searchParams.toString();
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${cleanEndpoint}${query ? `?${query}` : ""}`;
  }

  /**
   * Consulta de mercados paginada con sparkline y filtros por IDs.
   * Endpoint: /coins/markets
   */
  async getMarkets({
    vsCurrency = "eur",
    order = "market_cap_desc",
    perPage = 25,
    page = 1,
    sparkline = false,
    ids,
    signal,
    ignoreCache = false,
  }: GetMarketsParams = {}): Promise<CryptoList> {
    const cleanIds = ids ? ids.map((id) => id.trim()).filter((id) => id.length > 0) : undefined;
    const hasValidIds = Boolean(cleanIds && cleanIds.length > 0);
    const idsKey = hasValidIds ? [...cleanIds!].sort().join(",") : "all";
    const effectivePerPage = hasValidIds
      ? Math.min(Math.max(perPage, cleanIds!.length), 250)
      : perPage;
    const cacheKey = `markets-${vsCurrency.toLowerCase()}-${order}-${effectivePerPage}-${page}-${sparkline}-${idsKey}`;

    const url = this.buildUrl("/coins/markets", {
      vs_currency: vsCurrency.toLowerCase(),
      order,
      per_page: effectivePerPage,
      page,
      sparkline: sparkline ? "true" : "false",
      ids: hasValidIds ? cleanIds!.join(",") : undefined,
    });

    return requestManager.request<CryptoList>({
      url,
      cacheKey,
      ttlMs: 60 * 1000, // 60 segundos de caché
      signal,
      ignoreCache,
      validator: (data): data is CryptoList => Array.isArray(data),
      errorMessagePrefix: "Error al consultar mercados en CoinGecko",
    });
  }

  /**
   * Obtiene la lista de principales criptomonedas ordenadas por capitalización.
   */
  async getTopCoins({
    numCryptos,
    signal,
  }: {
    numCryptos: number;
    signal?: AbortSignal;
  }): Promise<CryptoList> {
    return this.getMarkets({
      perPage: numCryptos,
      page: 1,
      sparkline: false,
      signal,
    });
  }

  /**
   * Busca activos en el catálogo de CoinGecko a partir de texto.
   * Endpoint: /search?query={query}
   */
  async searchCoins(
    query: string,
    signal?: AbortSignal,
    ignoreCache = false,
  ): Promise<SearchCoinResult[]> {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return [];
    }

    const cacheKey = `search-${trimmed}`;
    const url = this.buildUrl("/search", { query: trimmed });

    interface CoinGeckoSearchRaw {
      coins: Array<Record<string, unknown>>;
    }

    const rawResult = await requestManager.request<CoinGeckoSearchRaw>({
      url,
      cacheKey,
      ttlMs: 120 * 1000, // 2 minutos de caché para búsquedas
      signal,
      ignoreCache,
      validator: (data): data is CoinGeckoSearchRaw =>
        typeof data === "object" &&
        data !== null &&
        "coins" in data &&
        Array.isArray((data as { coins: unknown }).coins),
      errorMessagePrefix: "Error al realizar la búsqueda en CoinGecko",
    });

    return rawResult.coins
      .map((coin) => ({
        id: typeof coin.id === "string" ? coin.id.trim() : "",
        name: typeof coin.name === "string" ? coin.name : "",
        symbol: typeof coin.symbol === "string" ? coin.symbol : "",
        market_cap_rank:
          typeof coin.market_cap_rank === "number" ? coin.market_cap_rank : null,
        thumb: typeof coin.thumb === "string" ? coin.thumb : "",
        large: typeof coin.large === "string" ? coin.large : "",
      }))
      .filter((coin) => coin.id.length > 0);
  }

  /**
   * Obtiene los datos macro y resumen global del mercado desde /global.
   */
  async getGlobalMarketData(signal?: AbortSignal): Promise<GlobalMarketData> {
    const cacheKey = "global-market-data";
    const url = this.buildUrl("/global", {});

    interface CoinGeckoGlobalRaw {
      data: {
        total_market_cap?: Record<string, number>;
        total_volume?: Record<string, number>;
        market_cap_percentage?: Record<string, number>;
        market_cap_change_percentage_24h_usd?: number;
        updated_at?: number;
      };
    }

    const isTestEnv =
      (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env?.NODE_ENV === "test";

    const raw = await requestManager.request<CoinGeckoGlobalRaw>({
      url,
      cacheKey,
      ttlMs: isTestEnv ? 0 : 120 * 1000, // 2 minutos de caché para datos macro en producción
      signal,
      ignoreCache: isTestEnv,
      validator: (data): data is CoinGeckoGlobalRaw =>
        typeof data === "object" &&
        data !== null &&
        "data" in data &&
        typeof (data as { data: unknown }).data === "object" &&
        (data as { data: unknown }).data !== null,
      errorMessagePrefix: "Error al consultar datos macroeconómicos en CoinGecko",
    });

    const data = raw.data;
    const totalMarketCap = data.total_market_cap || {};
    const totalVolume = data.total_volume || {};
    const marketCapPercentage = data.market_cap_percentage || {};

    return {
      total_market_cap_eur: totalMarketCap.eur ?? 0,
      total_volume_eur: totalVolume.eur ?? 0,
      btc_dominance: marketCapPercentage.btc ?? 0,
      market_cap_change_percentage_24h:
        typeof data.market_cap_change_percentage_24h_usd === "number"
          ? data.market_cap_change_percentage_24h_usd
          : 0,
      updated_at: typeof data.updated_at === "number" ? data.updated_at : Date.now(),
    };
  }

  /**
   * Obtiene la serie temporal de precios históricos para un activo y periodo especificados.
   * Endpoint: /coins/{id}/market_chart?vs_currency=eur&days={days}
   */
  async getCoinMarketChart({
    coinId,
    days,
    vsCurrency = "eur",
    signal,
    ignoreCache = false,
  }: GetMarketChartParams): Promise<HistoricalPriceData> {
    if (!coinId || typeof coinId !== "string" || coinId.trim() === "") {
      throw new Error("El identificador del activo es obligatorio.");
    }

    const cleanCoinId = coinId.toLowerCase().trim();
    const cacheKey = `chart-${cleanCoinId}-${days}-${vsCurrency.toLowerCase()}`;

    const url = this.buildUrl(`/coins/${encodeURIComponent(cleanCoinId)}/market_chart`, {
      vs_currency: vsCurrency.toLowerCase(),
      days,
    });

    interface CoinGeckoChartRaw {
      prices: unknown[];
    }

    // TTL de caché: 60s para 24h (alta volatilidad), 300s para rangos mayores (7d, 30d, etc.)
    const ttlMs = days === 1 ? 60 * 1000 : 300 * 1000;

    const raw = await requestManager.request<CoinGeckoChartRaw>({
      url,
      cacheKey,
      ttlMs,
      signal,
      passSignalObject: true,
      ignoreCache,
      validator: (data): data is CoinGeckoChartRaw =>
        typeof data === "object" &&
        data !== null &&
        "prices" in data &&
        Array.isArray((data as { prices: unknown }).prices),
      errorMessagePrefix: "Error al consultar serie histórica",
    });

    const points = normalizeChartPoints(raw.prices);
    const performance = calculatePeriodPerformance(points);
    const { min: minPrice, max: maxPrice } = calculateMinMax(points);

    return {
      coinId: cleanCoinId,
      days,
      points,
      performance,
      minPrice,
      maxPrice,
    };
  }
}

// Instancia por defecto del proveedor CoinGecko
export const coinGeckoProvider = new CoinGeckoProvider();
