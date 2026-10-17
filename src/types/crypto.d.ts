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
