import { useState } from "react";
import type { FC } from "react";
import type { Cryptocurrency, CryptoList } from "../../types/crypto";
import { formatCurrency, formatCompactNumber, formatRank } from "../../utils/formatters.ts";
import { VariationBadge } from "../ui/Badge.tsx";
import { CoinCard } from "../CoinCard.tsx";
import { EmptyState } from "../common/EmptyState.tsx";
import { ErrorMessage } from "../common/ErrorMessage.tsx";
import { MarketSparkline } from "../markets/MarketSparkline.tsx";
import { MarketFiltersBar } from "../markets/MarketFiltersBar.tsx";
import type { ViewMode } from "../markets/MarketFiltersBar.tsx";
import { MarketPagination } from "../markets/MarketPagination.tsx";
import { FavoriteButton } from "../common/FavoriteButton.tsx";
import { useMarketExplorer } from "../../hooks/useMarketExplorer.ts";
import { useWatchlist } from "../../hooks/useWatchlist.ts";

interface MarketTableProps {
  selectedCoin: Cryptocurrency | null;
  onSelectCoin: (coin: Cryptocurrency) => void;
  onCoinsLoaded?: (coins: CryptoList) => void;
  currency?: string;
}

export const MarketTable: FC<MarketTableProps> = ({
  selectedCoin,
  onSelectCoin,
  onCoinsLoaded,
  currency = "EUR",
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const { isFavorite, toggleFavorite } = useWatchlist();

  const {
    filteredAndSortedCoins,
    coins,
    page,
    perPage,
    sortField,
    sortDirection,
    filters,
    searchTerm,
    isLoading,
    isSearchingRemote,
    errorMsg,
    isSearchMode,
    isLocalSort,
    handleSort,
    handlePageChange,
    handlePerPageChange,
    handleFiltersChange,
    handleResetFilters,
    handleSearchChange,
    handleClearSearch,
    handleRetry,
  } = useMarketExplorer({
    initialPerPage: 25,
    onCoinsLoaded,
    vsCurrency: currency.toLowerCase(),
  });

  return (
    <div className="bg-crypto-surface rounded-xl border border-crypto-border overflow-hidden shadow-lg">
      {/* Cabecera Principal del Explorador */}
      <div className="p-4 sm:p-5 border-b border-crypto-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-crypto-text tracking-tight">
              Explorador de Mercados
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-crypto-surface-raised text-crypto-accent border border-crypto-border">
              {isLocalSort ? "Ordenación local" : "Ordenación global"}
            </span>
          </div>
          <p className="text-xs text-crypto-text-muted mt-0.5 font-mono">
            {isSearchMode
              ? `Resultados de búsqueda global para "${searchTerm}" (${filteredAndSortedCoins.length} activos)`
              : `Página ${page} • ${filteredAndSortedCoins.length} de ${coins.length} activos visibles`}
          </p>
        </div>

        {/* Barra de Búsqueda Rápida */}
        <div className="w-full sm:w-72 relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-crypto-text-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por nombre, símbolo o ID..."
            aria-label="Buscar criptomoneda por nombre o símbolo"
            className="w-full bg-crypto-surface-raised text-crypto-text placeholder:text-crypto-text-muted text-xs rounded-lg pl-9 pr-8 py-2 border border-crypto-border focus:border-crypto-primary focus:outline-none transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Limpiar búsqueda"
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs text-crypto-text-muted hover:text-crypto-text cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros, Rangos y Controles de Paginación / Vista */}
      <MarketFiltersBar
        filters={filters}
        onChangeFilters={handleFiltersChange}
        onResetFilters={handleResetFilters}
        searchTerm={searchTerm}
        onClearSearch={handleClearSearch}
        perPage={perPage}
        onChangePerPage={handlePerPageChange}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        isSearchingRemote={isSearchingRemote}
      />

      {/* Estado de Error */}
      {errorMsg && (
        <div className="p-4 sm:p-6">
          <ErrorMessage message={errorMsg} onRetry={handleRetry} />
        </div>
      )}

      {/* Estado de Carga con Esqueleto (Evita saltos bruscos de diseño) */}
      {isLoading && !errorMsg && (
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-crypto-text-muted font-mono pb-2">
            <span>Sincronizando cotizaciones con CoinGecko v3...</span>
          </div>
          {[...Array(6)].map((_, idx) => (
            <div
              key={`table-skeleton-${idx}`}
              className="h-12 w-full rounded-lg bg-crypto-surface-raised/40 animate-pulse border border-crypto-border/50"
            />
          ))}
        </div>
      )}

      {/* Estado Vacío */}
      {!isLoading && !errorMsg && filteredAndSortedCoins.length === 0 && (
        <EmptyState
          title={isSearchMode ? "Sin coincidencias en el mercado" : "Sin resultados para los filtros"}
          description={
            isSearchMode
              ? `No se encontraron criptomonedas coincidentes con "${searchTerm}" en CoinGecko.`
              : "Ningún activo cumple simultáneamente los filtros y rangos de precio configurados."
          }
          action={
            <button
              type="button"
              onClick={() => {
                handleResetFilters();
                handleClearSearch();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-crypto-primary text-white text-xs font-semibold hover:bg-crypto-primary-hover transition-colors cursor-pointer"
            >
              Restablecer filtros y búsqueda
            </button>
          }
        />
      )}

      {/* Vista en Tarjetas */}
      {!isLoading && !errorMsg && viewMode === "cards" && filteredAndSortedCoins.length > 0 && (
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedCoins.map((coin) => (
            <CoinCard
              key={coin.id}
              coin={coin}
              isSelected={selectedCoin?.id === coin.id}
              onSelect={onSelectCoin}
              currency={currency}
            />
          ))}
        </div>
      )}

      {/* Vista en Tabla Financiera */}
      {!isLoading && !errorMsg && viewMode === "table" && filteredAndSortedCoins.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-crypto-surface-raised/80 border-b border-crypto-border text-[11px] font-mono uppercase tracking-wider text-crypto-text-muted select-none">
              <tr>
                {/* 0. Favorito */}
                <th className="py-3 px-2 sm:px-3 text-center w-10 whitespace-nowrap">★</th>

                {/* 1. Ranking */}
                <th
                  onClick={() => handleSort("rank")}
                  className="py-3 px-3 sm:px-4 cursor-pointer hover:text-crypto-text text-center w-12 whitespace-nowrap"
                  aria-sort={sortField === "rank" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className="flex items-center justify-center gap-1">
                    #
                    {sortField === "rank" && (
                      <span className="text-crypto-accent">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>

                {/* 2. Activo */}
                <th
                  onClick={() => handleSort("name")}
                  className="py-3 px-3 sm:px-4 cursor-pointer hover:text-crypto-text whitespace-nowrap"
                  aria-sort={sortField === "name" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className="flex items-center gap-1">
                    Activo
                    {sortField === "name" && (
                      <span className="text-crypto-accent">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>

                {/* 3. Precio */}
                <th
                  onClick={() => handleSort("price")}
                  className="py-3 px-3 sm:px-4 cursor-pointer hover:text-crypto-text text-right whitespace-nowrap"
                  aria-sort={sortField === "price" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className="flex items-center justify-end gap-1">
                    Precio
                    {sortField === "price" && (
                      <span className="text-crypto-accent">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>

                {/* 4. Variación 24h */}
                <th
                  onClick={() => handleSort("change")}
                  className="py-3 px-3 sm:px-4 cursor-pointer hover:text-crypto-text text-right whitespace-nowrap"
                  aria-sort={sortField === "change" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className="flex items-center justify-end gap-1">
                    24 h
                    {sortField === "change" && (
                      <span className="text-crypto-accent">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>

                {/* 5. Capitalización */}
                <th
                  onClick={() => handleSort("market_cap")}
                  className="hidden sm:table-cell py-3 px-3 sm:px-4 cursor-pointer hover:text-crypto-text text-right whitespace-nowrap"
                  aria-sort={sortField === "market_cap" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className="flex items-center justify-end gap-1">
                    Capitalización
                    {sortField === "market_cap" && (
                      <span className="text-crypto-accent">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>

                {/* 6. Volumen 24h */}
                <th
                  onClick={() => handleSort("volume")}
                  className="hidden md:table-cell py-3 px-3 sm:px-4 cursor-pointer hover:text-crypto-text text-right whitespace-nowrap"
                  aria-sort={sortField === "volume" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className="flex items-center justify-end gap-1">
                    Volumen 24 h
                    {sortField === "volume" && (
                      <span className="text-crypto-accent">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>

                {/* 7. Últimos 7 días (Sparkline) */}
                <th className="hidden lg:table-cell py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                  Últimos 7 días
                </th>

                {/* 8. Acción */}
                <th className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">Acción</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-crypto-border/50">
              {filteredAndSortedCoins.map((coin) => {
                const isSelected = selectedCoin?.id === coin.id;
                return (
                  <tr
                    key={coin.id}
                    onClick={() => onSelectCoin(coin)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-crypto-primary-soft/40 font-medium border-l-2 border-crypto-primary"
                        : "hover:bg-crypto-surface-hover/60"
                    }`}
                  >
                    {/* 0. Favorito */}
                    <td className="py-3.5 px-2 sm:px-3 text-center">
                      <FavoriteButton
                        coinId={coin.id}
                        coinName={coin.name}
                        isFavorite={isFavorite(coin.id)}
                        onToggle={toggleFavorite}
                        size="sm"
                      />
                    </td>

                    {/* 1. Ranking */}
                    <td className="py-3.5 px-3 sm:px-4 text-center font-mono text-xs text-crypto-text-muted whitespace-nowrap">
                      {formatRank(coin.market_cap_rank)}
                    </td>

                    {/* 2. Activo */}
                    <td className="py-3.5 px-3 sm:px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={coin.image}
                          alt={coin.name}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-crypto-surface-raised p-0.5 object-contain flex-shrink-0"
                          loading="lazy"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-crypto-text text-xs sm:text-sm truncate">
                            {coin.name}
                          </div>
                          <span className="text-[11px] text-crypto-text-muted uppercase font-mono font-medium whitespace-nowrap">
                            {coin.symbol}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Precio */}
                    <td className="py-3.5 px-3 sm:px-4 text-right font-mono font-bold text-crypto-text tabular-nums whitespace-nowrap">
                      {formatCurrency(coin.current_price, currency)}
                    </td>

                    {/* 4. Variación 24h */}
                    <td className="py-3.5 px-3 sm:px-4 text-right whitespace-nowrap">
                      <VariationBadge value={coin.price_change_percentage_24h} size="sm" />
                    </td>

                    {/* 5. Capitalización */}
                    <td className="hidden sm:table-cell py-3.5 px-3 sm:px-4 text-right font-mono text-crypto-text-secondary tabular-nums whitespace-nowrap">
                      {formatCompactNumber(coin.market_cap, currency)}
                    </td>

                    {/* 6. Volumen 24h */}
                    <td className="hidden md:table-cell py-3.5 px-3 sm:px-4 text-right font-mono text-crypto-text-secondary tabular-nums whitespace-nowrap">
                      {coin.total_volume ? formatCompactNumber(coin.total_volume, currency) : "—"}
                    </td>

                    {/* 7. Minigráfico de 7 días */}
                    <td className="hidden lg:table-cell py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                      <MarketSparkline
                        prices={coin.sparkline_in_7d?.price}
                        coinName={coin.name}
                        width={110}
                        height={32}
                      />
                    </td>

                    {/* 8. Acción */}
                    <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCoin(coin);
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? "bg-crypto-primary text-white shadow-sm shadow-crypto-primary/30"
                            : "bg-crypto-surface-hover text-crypto-text-secondary hover:text-crypto-text hover:bg-crypto-surface-raised border border-crypto-border"
                        }`}
                      >
                        {isSelected ? "Activo" : "Detalle"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación de Resultados */}
      {!isLoading && !errorMsg && (
        <MarketPagination
          page={page}
          onChangePage={handlePageChange}
          hasMore={coins.length >= perPage}
          isLoading={isLoading}
          visibleCount={filteredAndSortedCoins.length}
          totalLoadedCount={coins.length}
          isSearchMode={isSearchMode}
        />
      )}
    </div>
  );
};
