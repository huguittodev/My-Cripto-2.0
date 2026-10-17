import { useState, useMemo } from "react";
import type { FC } from "react";
import type { Cryptocurrency, CryptoList } from "../../types/crypto";
import { formatCurrency, formatCompactNumber, formatRank } from "../../utils/formatters.ts";
import { VariationBadge } from "../ui/Badge.tsx";
import { CoinCard } from "../CoinCard.tsx";
import { EmptyState } from "../common/EmptyState.tsx";

type SortField = "rank" | "name" | "price" | "change" | "market_cap";
type SortOrder = "asc" | "desc";
type ViewMode = "table" | "cards";

interface MarketTableProps {
  coins: CryptoList;
  selectedCoin: Cryptocurrency | null;
  onSelectCoin: (coin: Cryptocurrency) => void;
}

export const MarketTable: FC<MarketTableProps> = ({
  coins,
  selectedCoin,
  onSelectCoin,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      // Por defecto, precio y capitalización ordenan descendente primero
      setSortOrder(field === "rank" || field === "name" ? "asc" : "desc");
    }
  };

  const filteredAndSortedCoins = useMemo(() => {
    let result = coins.filter((coin) => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      return (
        coin.name.toLowerCase().includes(term) ||
        coin.symbol.toLowerCase().includes(term)
      );
    });

    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "rank":
          comparison = (a.market_cap_rank || 9999) - (b.market_cap_rank || 9999);
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "price":
          comparison = a.current_price - b.current_price;
          break;
        case "change":
          comparison =
            (a.price_change_percentage_24h || 0) -
            (b.price_change_percentage_24h || 0);
          break;
        case "market_cap":
          comparison = (a.market_cap || 0) - (b.market_cap || 0);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [coins, searchTerm, sortField, sortOrder]);

  return (
    <div className="bg-crypto-surface rounded-xl border border-crypto-border overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-crypto-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-crypto-text tracking-tight">
            Mercado en Tiempo Real
          </h2>
          <p className="text-xs text-crypto-text-muted mt-0.5">
            {filteredAndSortedCoins.length} de {coins.length} criptomonedas listadas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Real-time search filter */}
          <div className="relative flex-1 sm:w-64">
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
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o símbolo..."
              className="w-full bg-crypto-surface-raised text-crypto-text placeholder:text-crypto-text-muted text-xs rounded-lg pl-9 pr-3 py-2 border border-crypto-border focus:border-crypto-primary focus:outline-none transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs text-crypto-text-muted hover:text-crypto-text"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode Toggle: Table / Cards */}
          <div className="flex items-center bg-crypto-surface-raised rounded-lg p-0.5 border border-crypto-border">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-crypto-surface-hover text-crypto-text shadow-sm"
                  : "text-crypto-text-muted hover:text-crypto-text"
              }`}
              title="Vista en tabla financiera"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
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
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "cards"
                  ? "bg-crypto-surface-hover text-crypto-text shadow-sm"
                  : "text-crypto-text-muted hover:text-crypto-text"
              }`}
              title="Vista en tarjetas"
            >
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
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* No matching results */}
      {filteredAndSortedCoins.length === 0 && (
        <EmptyState
          title="Sin resultados para la búsqueda"
          description={`No encontramos ningún activo que coincida con "${searchTerm}".`}
          action={
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="px-3 py-1.5 rounded-lg bg-crypto-surface-raised text-xs text-crypto-text border border-crypto-border hover:bg-crypto-surface-hover"
            >
              Limpiar filtro
            </button>
          }
        />
      )}

      {/* Content: Cards View */}
      {viewMode === "cards" && filteredAndSortedCoins.length > 0 && (
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedCoins.map((coin) => (
            <CoinCard
              key={coin.id}
              coin={coin}
              isSelected={selectedCoin?.id === coin.id}
              onSelect={onSelectCoin}
            />
          ))}
        </div>
      )}

      {/* Content: Table View */}
      {viewMode === "table" && filteredAndSortedCoins.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-crypto-surface-raised/70 border-b border-crypto-border text-[11px] font-mono uppercase tracking-wider text-crypto-text-muted select-none">
              <tr>
                <th
                  onClick={() => handleSort("rank")}
                  className="py-3 px-3 sm:px-4 cursor-pointer hover:text-crypto-text text-center w-12"
                >
                  <span className="flex items-center justify-center gap-1">
                    #
                    {sortField === "rank" && (
                      <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>

                <th
                  onClick={() => handleSort("name")}
                  className="py-3 px-3 sm:px-4 cursor-pointer hover:text-crypto-text"
                >
                  <span className="flex items-center gap-1">
                    Activo
                    {sortField === "name" && (
                      <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>

                <th
                  onClick={() => handleSort("price")}
                  className="py-3 px-3 sm:px-4 cursor-pointer hover:text-crypto-text text-right"
                >
                  <span className="flex items-center justify-end gap-1">
                    Precio
                    {sortField === "price" && (
                      <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>

                <th
                  onClick={() => handleSort("change")}
                  className="py-3 px-3 sm:px-4 cursor-pointer hover:text-crypto-text text-right"
                >
                  <span className="flex items-center justify-end gap-1">
                    24h %
                    {sortField === "change" && (
                      <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>

                <th
                  onClick={() => handleSort("market_cap")}
                  className="hidden md:table-cell py-3 px-3 sm:px-4 cursor-pointer hover:text-crypto-text text-right"
                >
                  <span className="flex items-center justify-end gap-1">
                    Cap. de Mercado
                    {sortField === "market_cap" && (
                      <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>

                <th className="py-3 px-3 sm:px-4 text-center">Acción</th>
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
                        ? "bg-crypto-primary-soft/30 font-medium"
                        : "hover:bg-crypto-surface-hover/50"
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-3 sm:px-4 text-center font-mono text-xs text-crypto-text-muted">
                      {formatRank(coin.market_cap_rank)}
                    </td>

                    {/* Asset: Icon + Name + Symbol */}
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
                          <span className="text-[11px] text-crypto-text-muted uppercase font-mono font-medium">
                            {coin.symbol}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-3 sm:px-4 text-right font-mono font-bold text-crypto-text tabular-nums">
                      {formatCurrency(coin.current_price)}
                    </td>

                    {/* 24h Variation */}
                    <td className="py-3.5 px-3 sm:px-4 text-right">
                      <VariationBadge value={coin.price_change_percentage_24h} size="sm" />
                    </td>

                    {/* Market Cap */}
                    <td className="hidden md:table-cell py-3.5 px-3 sm:px-4 text-right font-mono text-crypto-text-secondary tabular-nums">
                      {formatCompactNumber(coin.market_cap)}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-3 sm:px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCoin(coin);
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
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
    </div>
  );
};
