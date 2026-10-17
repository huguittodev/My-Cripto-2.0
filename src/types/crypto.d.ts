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
