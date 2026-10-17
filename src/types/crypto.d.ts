export interface Cryptocurrency {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  last_updated: string;
  total_volume?: number;
  high_24h?: number;
  low_24h?: number;
  circulating_supply?: number;
  // Serie histórica compacta de 7 días devuelta por CoinGecko con sparkline=true
  sparkline_in_7d?: {
    price: number[];
  };
}

// Lista tipada de criptomonedas
export type CryptoList = Cryptocurrency[];

// Resumen del mercado global devuelto por CoinGecko /global
export interface GlobalMarketData {
  total_market_cap_eur: number;
  total_volume_eur: number;
  btc_dominance: number;
  market_cap_change_percentage_24h: number;
  updated_at: number;
}

// Rango temporal admitido para los gráficos históricos
export type TimeRangeDays = 1 | 7 | 30 | 90 | 365;

// Punto individual de una serie temporal
export interface ChartPoint {
  timestamp: number;
  price: number;
}

// Resultado del cálculo financiero del periodo
export interface PeriodPerformance {
  startPrice: number;
  endPrice: number;
  absoluteChange: number;
  percentageChange: number;
  isPositive: boolean;
  isValid: boolean;
}

// Datos históricos normalizados devueltos por el servicio
export interface HistoricalPriceData {
  coinId: string;
  days: TimeRangeDays;
  points: ChartPoint[];
  performance: PeriodPerformance;
  minPrice: number;
  maxPrice: number;
}

// Parámetros de ordenación soportados a nivel de servidor por CoinGecko
export type MarketOrder =
  | "market_cap_desc"
  | "market_cap_asc"
  | "volume_desc"
  | "volume_asc"
  | "id_asc"
  | "id_desc";

// Columnas ordenables de la tabla del explorador
export type TableSortField = "rank" | "name" | "price" | "change" | "market_cap" | "volume";

// Dirección de ordenación
export type SortDirection = "asc" | "desc";

// Filtro de rendimiento 24h
export type MarketPerformanceFilter = "all" | "gainers" | "losers";

// Filtro por tramos de capitalización de mercado
export type MarketCapCategory = "all" | "large" | "mid" | "small";

// Estructura de filtros aplicables al explorador
export interface MarketFilters {
  performance: MarketPerformanceFilter;
  capCategory: MarketCapCategory;
  minPrice: number | null;
  maxPrice: number | null;
}

// Parámetros para la consulta paginada de mercados en CoinGecko
export interface GetMarketsParams {
  vsCurrency?: string;
  order?: MarketOrder;
  perPage?: number;
  page?: number;
  sparkline?: boolean;
  ids?: string[];
  signal?: AbortSignal;
  ignoreCache?: boolean;
}

// Resultado elemental de la búsqueda de activos en CoinGecko /search
export interface SearchCoinResult {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
  thumb: string;
  large: string;
}

