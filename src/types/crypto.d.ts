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

// Estructura mínima versionada para persistencia de la watchlist en localStorage
export interface WatchlistStoragePayload {
  version: number;
  coinIds: string[];
  updatedAt: number;
}

// ==========================================
// TIPOS DEL MOTOR DE CARTERA (PORTFOLIO ENGINE)
// ==========================================

// Tipo de operación: compra o venta
export type TransactionType = "buy" | "sell";

// Registro individual de una transacción en la cartera
export interface Transaction {
  id: string;
  coinId: string;
  type: TransactionType;
  amount: number;
  pricePerUnit: number;
  fee: number;
  timestamp: number;
  notes?: string;
  createdAt: number;
}

// Lote contable para el cálculo de coste por método FIFO
export interface PortfolioLot {
  id: string;
  amount: number;
  pricePerUnit: number;
  fee: number;
  timestamp: number;
}

// Posición agregada de un activo en la cartera
export interface PortfolioPosition {
  coinId: string;
  coinSymbol?: string;
  coinName?: string;
  coinImage?: string;
  amount: number;
  totalCostBasis: number;
  averageBuyPrice: number;
  currentPrice: number | null;
  currentValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPercentage: number | null;
  realizedPnl: number;
  totalFees: number;
  allocationPercentage: number;
}

// Resumen macro de la cartera completa
export interface PortfolioSummary {
  totalCurrentValue: number;
  totalCostBasis: number;
  totalUnrealizedPnl: number;
  totalUnrealizedPnlPercentage: number;
  totalRealizedPnl: number;
  totalFees: number;
  hasUnavailablePrices: boolean;
  positionCount: number;
  transactionCount: number;
}

// Estructura versionada para persistencia de transacciones en localStorage
export interface PortfolioStoragePayload {
  version: number;
  transactions: Transaction[];
  updatedAt: number;
}

// ==========================================
// TIPOS DEL MOTOR DE ALERTAS (PRICE ALERTS)
// ==========================================

// Tipo de condición: el precio alcanza o supera (gte) o cae por debajo o iguala (lte)
export type AlertCondition = "gte" | "lte";

// Estado de la alerta
export type AlertStatus = "active" | "inactive" | "triggered";

// Entidad principal de alerta de precio
export interface PriceAlert {
  id: string;
  coinId: string;
  coinSymbol: string;
  coinName: string;
  coinImage?: string;
  condition: AlertCondition;
  targetPrice: number;
  currency: string;
  createdAt: number;
  status: AlertStatus;
  triggeredAt?: number;
  triggeredPrice?: number;
  lastNotifiedAt?: number;
  notes?: string;
}

// Estructura versionada para persistencia de alertas en localStorage
export interface AlertStoragePayload {
  version: number;
  alerts: PriceAlert[];
  updatedAt: number;
}

// Notificación in-app derivada del disparo de una alerta
export interface NotificationToast {
  id: string;
  alertId: string;
  coinId: string;
  coinName: string;
  coinSymbol: string;
  coinImage?: string;
  condition: AlertCondition;
  targetPrice: number;
  observedPrice: number;
  currency: string;
  timestamp: number;
}

// ==========================================
// TIPOS DEL AI CRYPTO ANALYST (GEMINI API)
// ==========================================

export type AiMessageRole = "user" | "model";

export interface AiChatMessage {
  id: string;
  role: AiMessageRole;
  text: string;
  timestamp: number;
  isError?: boolean;
  contextTag?: string;
  model?: string;
  isCached?: boolean;
}

export interface AiAssetContext {
  id: string;
  name: string;
  symbol: string;
  current_price?: number;
  price_change_percentage_24h?: number;
  market_cap?: number;
  market_cap_rank?: number | null;
  total_volume?: number;
  low_24h?: number;
  high_24h?: number;
  last_updated?: string;
  source?: string;
  currency?: string;
  historical_summary?: {
    days: number;
    startPrice: number;
    endPrice: number;
    absoluteChange: number;
    percentageChange: number;
  };
}

export interface AiCompareAsset {
  id: string;
  name: string;
  symbol: string;
  current_price?: number;
  price_change_percentage_24h?: number;
  market_cap?: number;
  total_volume?: number;
}

export interface AiPortfolioSummaryContext {
  totalCurrentValue: number;
  totalCostBasis: number;
  totalUnrealizedPnl: number;
  totalUnrealizedPnlPercentage: number;
  totalRealizedPnl: number;
  positionCount: number;
  distribution?: Array<{
    name: string;
    symbol: string;
    percentage: number;
  }>;
}

export interface AiMarketContext {
  asset?: AiAssetContext;
  compareAssets?: AiCompareAsset[];
  global?: GlobalMarketData;
  portfolio?: AiPortfolioSummaryContext;
}

export interface AiAnalystStatus {
  isConfigured: boolean;
  model: string;
  maxPromptLength: number;
  maxHistoryTurns: number;
}

export interface AiAnalystResponse {
  text: string;
  model: string;
  timestamp: number;
  isCached: boolean;
  contextSummary?: {
    hasAssetData: boolean;
    hasGlobalData: boolean;
    hasPortfolioData: boolean;
    comparedCount: number;
  };
}




