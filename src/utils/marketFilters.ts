import type {
  CryptoList,
  MarketFilters,
  TableSortField,
  SortDirection,
} from "../types/crypto";

// Umbrales documentados de capitalización para segmentar el mercado
export const LARGE_CAP_THRESHOLD = 10_000_000_000; // 10.000 M € (10B €)
export const MID_CAP_THRESHOLD = 1_000_000_000; // 1.000 M € (1B €)

// Filtros iniciales por defecto (sin restricciones aplicadas)
export const INITIAL_MARKET_FILTERS: MarketFilters = {
  performance: "all",
  capCategory: "all",
  minPrice: null,
  maxPrice: null,
};

/**
 * Cuenta cuántos filtros personalizados están activados simultáneamente.
 */
export const countActiveFilters = (filters: MarketFilters): number => {
  let count = 0;
  if (filters.performance !== "all") count += 1;
  if (filters.capCategory !== "all") count += 1;
  if (filters.minPrice !== null && filters.minPrice > 0) count += 1;
  if (filters.maxPrice !== null && filters.maxPrice > 0) count += 1;
  return count;
};

/**
 * Filtra la colección de criptomonedas según búsqueda y criterios financieros.
 * Función pura y determinista sin efectos secundarios.
 */
export const filterCoins = (
  coins: CryptoList,
  filters: MarketFilters,
  searchTerm: string,
): CryptoList => {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return coins.filter((coin) => {
    // 1. Filtro por término de búsqueda (nombre, símbolo o id)
    if (normalizedSearch) {
      const matchName = coin.name.toLowerCase().includes(normalizedSearch);
      const matchSymbol = coin.symbol.toLowerCase().includes(normalizedSearch);
      const matchId = coin.id.toLowerCase().includes(normalizedSearch);
      if (!matchName && !matchSymbol && !matchId) {
        return false;
      }
    }

    // 2. Filtro por rendimiento de las últimas 24 horas
    if (filters.performance === "gainers") {
      if ((coin.price_change_percentage_24h ?? 0) <= 0) {
        return false;
      }
    } else if (filters.performance === "losers") {
      if ((coin.price_change_percentage_24h ?? 0) >= 0) {
        return false;
      }
    }

    // 3. Filtro por categoría de capitalización de mercado
    if (filters.capCategory !== "all") {
      const cap = coin.market_cap;
      if (cap === null || cap === undefined || cap <= 0) {
        return false;
      }

      if (filters.capCategory === "large" && cap < LARGE_CAP_THRESHOLD) {
        return false;
      }
      if (
        filters.capCategory === "mid" &&
        (cap < MID_CAP_THRESHOLD || cap >= LARGE_CAP_THRESHOLD)
      ) {
        return false;
      }
      if (filters.capCategory === "small" && cap >= MID_CAP_THRESHOLD) {
        return false;
      }
    }

    // 4. Filtro por rango de cotización mínima
    if (filters.minPrice !== null && filters.minPrice > 0) {
      if ((coin.current_price ?? 0) < filters.minPrice) {
        return false;
      }
    }

    // 5. Filtro por rango de cotización máxima
    if (filters.maxPrice !== null && filters.maxPrice > 0) {
      if ((coin.current_price ?? 0) > filters.maxPrice) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Ordena inmutablemente la lista de activos según la columna y dirección seleccionadas.
 */
export const sortCoins = (
  coins: CryptoList,
  field: TableSortField,
  direction: SortDirection,
): CryptoList => {
  return [...coins].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case "rank":
        comparison = (a.market_cap_rank ?? 999999) - (b.market_cap_rank ?? 999999);
        break;
      case "name":
        comparison = a.name.localeCompare(b.name, "es", { sensitivity: "base" });
        break;
      case "price":
        comparison = (a.current_price ?? 0) - (b.current_price ?? 0);
        break;
      case "change":
        comparison =
          (a.price_change_percentage_24h ?? 0) -
          (b.price_change_percentage_24h ?? 0);
        break;
      case "market_cap":
        comparison = (a.market_cap ?? 0) - (b.market_cap ?? 0);
        break;
      case "volume":
        comparison = (a.total_volume ?? 0) - (b.total_volume ?? 0);
        break;
    }

    return direction === "asc" ? comparison : -comparison;
  });
};
