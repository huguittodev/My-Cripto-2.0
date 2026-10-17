import type { FC } from "react";
import type {
  MarketFilters,
  MarketPerformanceFilter,
  MarketCapCategory,
} from "../../types/crypto";
import { countActiveFilters } from "../../utils/marketFilters.ts";

export type ViewMode = "table" | "cards";

interface MarketFiltersBarProps {
  filters: MarketFilters;
  onChangeFilters: (filters: MarketFilters) => void;
  onResetFilters: () => void;
  searchTerm: string;
  onClearSearch: () => void;
  perPage: number;
  onChangePerPage: (perPage: number) => void;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  isSearchingRemote?: boolean;
}

export const MarketFiltersBar: FC<MarketFiltersBarProps> = ({
  filters,
  onChangeFilters,
  onResetFilters,
  searchTerm,
  onClearSearch,
  perPage,
  onChangePerPage,
  viewMode,
  onChangeViewMode,
  isSearchingRemote = false,
}) => {
  const activeCount = countActiveFilters(filters) + (searchTerm.trim() ? 1 : 0);

  const handlePerformanceChange = (perf: MarketPerformanceFilter) => {
    onChangeFilters({ ...filters, performance: perf });
  };

  const handleCapCategoryChange = (cat: MarketCapCategory) => {
    onChangeFilters({ ...filters, capCategory: cat });
  };

  const handleMinPriceChange = (val: string) => {
    const num = val === "" ? null : parseFloat(val);
    onChangeFilters({
      ...filters,
      minPrice: num !== null && !isNaN(num) && num >= 0 ? num : null,
    });
  };

  const handleMaxPriceChange = (val: string) => {
    const num = val === "" ? null : parseFloat(val);
    onChangeFilters({
      ...filters,
      maxPrice: num !== null && !isNaN(num) && num >= 0 ? num : null,
    });
  };

  const handleResetAll = () => {
    onResetFilters();
    onClearSearch();
  };

  return (
    <div className="p-3.5 sm:p-4 bg-crypto-surface-raised/40 border-b border-crypto-border space-y-3">
      {/* Fila Superior: Filtros rápidos de rendimiento, capitalización y controles de vista */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Filtro de Rendimiento 24h */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-crypto-text-muted font-mono text-[11px] mr-1">
            24h:
          </span>
          <div className="inline-flex rounded-lg bg-crypto-surface-raised p-0.5 border border-crypto-border">
            <button
              type="button"
              onClick={() => handlePerformanceChange("all")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filters.performance === "all"
                  ? "bg-crypto-primary text-white shadow-sm"
                  : "text-crypto-text-secondary hover:text-crypto-text"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => handlePerformanceChange("gainers")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filters.performance === "gainers"
                  ? "bg-crypto-positive/20 text-crypto-positive border border-crypto-positive/40"
                  : "text-crypto-text-secondary hover:text-crypto-text"
              }`}
            >
              ▲ Ganadoras
            </button>
            <button
              type="button"
              onClick={() => handlePerformanceChange("losers")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filters.performance === "losers"
                  ? "bg-crypto-negative/20 text-crypto-negative border border-crypto-negative/40"
                  : "text-crypto-text-secondary hover:text-crypto-text"
              }`}
            >
              ▼ Perdedoras
            </button>
          </div>
        </div>

        {/* Filtro de Capitalización */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-crypto-text-muted font-mono text-[11px] mr-1">
            Cap:
          </span>
          <select
            value={filters.capCategory}
            onChange={(e) => handleCapCategoryChange(e.target.value as MarketCapCategory)}
            aria-label="Filtro por capitalización de mercado"
            className="bg-crypto-surface-raised text-crypto-text text-[11px] rounded-lg px-2.5 py-1 border border-crypto-border focus:border-crypto-primary focus:outline-none transition-colors"
          >
            <option value="all">Todas las capitalizaciones</option>
            <option value="large">Grandes (≥ 10.000 M €)</option>
            <option value="mid">Medianas (1.000 - 10.000 M €)</option>
            <option value="small">Pequeñas (&lt; 1.000 M €)</option>
          </select>
        </div>

        {/* Selector de Tamaño de Página y Modo de Visualización */}
        <div className="flex items-center gap-2.5 ml-auto">
          {/* Activos por página */}
          <div className="flex items-center gap-1 text-[11px] text-crypto-text-muted font-mono">
            <span>Mostrar:</span>
            <select
              value={perPage}
              onChange={(e) => onChangePerPage(Number(e.target.value))}
              aria-label="Criptomonedas por página"
              className="bg-crypto-surface-raised text-crypto-text rounded px-1.5 py-1 border border-crypto-border focus:border-crypto-primary focus:outline-none text-[11px]"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Selector de Vista: Tabla / Tarjetas */}
          <div className="flex items-center bg-crypto-surface-raised rounded-lg p-0.5 border border-crypto-border">
            <button
              type="button"
              onClick={() => onChangeViewMode("table")}
              aria-label="Vista de tabla financiera"
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-crypto-surface-hover text-crypto-text shadow-sm"
                  : "text-crypto-text-muted hover:text-crypto-text"
              }`}
              title="Vista en tabla financiera"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode("cards")}
              aria-label="Vista en cuadrícula de tarjetas"
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "cards"
                  ? "bg-crypto-surface-hover text-crypto-text shadow-sm"
                  : "text-crypto-text-muted hover:text-crypto-text"
              }`}
              title="Vista en tarjetas"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Fila Inferior: Rango de precio y estado de filtros activos */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-crypto-border/50 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-crypto-text-muted font-mono text-[11px]">
            Rango Precio:
          </span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Mín €"
              value={filters.minPrice ?? ""}
              onChange={(e) => handleMinPriceChange(e.target.value)}
              aria-label="Precio mínimo en euros"
              className="w-20 sm:w-24 bg-crypto-surface-raised text-crypto-text placeholder:text-crypto-text-muted text-[11px] rounded px-2 py-1 border border-crypto-border focus:border-crypto-primary focus:outline-none tabular-nums font-mono"
            />
            <span className="text-crypto-text-muted text-[11px]">—</span>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Máx €"
              value={filters.maxPrice ?? ""}
              onChange={(e) => handleMaxPriceChange(e.target.value)}
              aria-label="Precio máximo en euros"
              className="w-20 sm:w-24 bg-crypto-surface-raised text-crypto-text placeholder:text-crypto-text-muted text-[11px] rounded px-2 py-1 border border-crypto-border focus:border-crypto-primary focus:outline-none tabular-nums font-mono"
            />
          </div>
        </div>

        {/* Indicador de filtros activos y acción de limpieza */}
        <div className="flex items-center gap-2 ml-auto">
          {isSearchingRemote && (
            <span className="text-[11px] text-crypto-accent font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-crypto-accent animate-ping" />
              Buscando en CoinGecko...
            </span>
          )}

          {activeCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-crypto-primary-soft text-crypto-accent border border-crypto-accent/30 text-[10px] font-mono font-semibold">
                {activeCount} {activeCount === 1 ? "filtro activo" : "filtros activos"}
              </span>

              <button
                type="button"
                onClick={handleResetAll}
                className="px-2.5 py-1 rounded bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-text-secondary hover:text-crypto-text border border-crypto-border text-[11px] font-medium transition-colors cursor-pointer"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
