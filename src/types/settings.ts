/**
 * Tipos y constantes para el sistema de ajustes globales de My Crypto 2.0.
 */

// Divisas base admitidas con soporte nativo directo en CoinGecko v3
export type BaseCurrency = "EUR" | "USD" | "GBP";

// Modos de apariencia visual admitidos
export type ThemeMode = "dark" | "light" | "system";

// Tema visual resuelto en tiempo de ejecución (tras evaluar preferencia del sistema)
export type ResolvedTheme = "dark" | "light";

// Configuración detallada de cada divisa soportada
export interface CurrencyConfig {
  code: BaseCurrency;
  label: string;
  symbol: string;
  name: string;
  locale: string;
}

// Catálogo inmutable de divisas soportadas
export const SUPPORTED_CURRENCIES: Record<BaseCurrency, CurrencyConfig> = {
  EUR: {
    code: "EUR",
    label: "EUR (€)",
    symbol: "€",
    name: "Euro",
    locale: "es-ES",
  },
  USD: {
    code: "USD",
    label: "USD ($)",
    symbol: "$",
    name: "Dólar estadounidense",
    locale: "en-US",
  },
  GBP: {
    code: "GBP",
    label: "GBP (£)",
    symbol: "£",
    name: "Libra esterlina",
    locale: "en-GB",
  },
};

// Objeto de preferencias globales del usuario
export interface AppSettings {
  currency: BaseCurrency;
  theme: ThemeMode;
  autoRefreshInterval: number; // Segundos entre consultas automáticas (0 = manual)
}

// Valores por defecto seguros para My Crypto 2.0
export const DEFAULT_SETTINGS: AppSettings = {
  currency: "EUR",
  theme: "dark",
  autoRefreshInterval: 60,
};

// Payload estructurado y versionado para almacenamiento en localStorage
export interface SettingsStoragePayload {
  version: number;
  settings: AppSettings;
  updatedAt: number;
}

// Estadísticas de diagnóstico de almacenamiento local
export interface LocalStorageStats {
  totalBytes: number;
  formattedSize: string;
  itemCounts: {
    settings: number;
    watchlist: number;
    portfolioTransactions: number;
    alerts: number;
  };
  isAvailable: boolean;
}
