import type { FC } from "react";

interface MarketPaginationProps {
  page: number;
  onChangePage: (newPage: number) => void;
  hasMore: boolean;
  isLoading: boolean;
  visibleCount: number;
  totalLoadedCount: number;
  isSearchMode?: boolean;
}

export const MarketPagination: FC<MarketPaginationProps> = ({
  page,
  onChangePage,
  hasMore,
  isLoading,
  visibleCount,
  totalLoadedCount,
  isSearchMode = false,
}) => {
  return (
    <div className="p-4 border-t border-crypto-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-crypto-surface-raised/30">
      {/* Información de visibilidad y alcance */}
      <div className="text-crypto-text-secondary font-mono text-[11px] text-center sm:text-left">
        <span>
          Mostrando <strong className="text-crypto-text font-bold">{visibleCount}</strong>{" "}
          {visibleCount === 1 ? "activo" : "activos"}
        </span>
        {visibleCount !== totalLoadedCount && (
          <span> (filtrados de {totalLoadedCount} cargados)</span>
        )}
        {!isSearchMode && (
          <span className="text-crypto-text-muted ml-2 hidden md:inline">
            • Paginación en servidor CoinGecko
          </span>
        )}
      </div>

      {/* Controles de avance / retroceso de página */}
      {!isSearchMode && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangePage(Math.max(1, page - 1))}
            disabled={page <= 1 || isLoading}
            aria-label="Página anterior"
            className="px-3 py-1.5 rounded-lg bg-crypto-surface-raised text-crypto-text border border-crypto-border hover:bg-crypto-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <span>←</span>
            <span>Anterior</span>
          </button>

          <span className="px-3 py-1 rounded-md bg-crypto-surface-hover text-crypto-text font-mono font-bold text-xs border border-crypto-border">
            Pág. {page}
          </span>

          <button
            type="button"
            onClick={() => onChangePage(page + 1)}
            disabled={!hasMore || isLoading}
            aria-label="Página siguiente"
            className="px-3 py-1.5 rounded-lg bg-crypto-surface-raised text-crypto-text border border-crypto-border hover:bg-crypto-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <span>Siguiente</span>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
};
