import type { FC } from "react";
import type { Cryptocurrency } from "../types/crypto";
import { formatCurrency, formatCompactNumber, formatRank } from "../utils/formatters.ts";
import { VariationBadge } from "./ui/Badge.tsx";
import { MarketSparkline } from "./markets/MarketSparkline.tsx";
import { FavoriteButton } from "./common/FavoriteButton.tsx";
import { useWatchlist } from "../hooks/useWatchlist.ts";

interface CoinCardProps {
  coin: Cryptocurrency;
  isSelected?: boolean;
  onSelect?: (coin: Cryptocurrency) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (coinId: string) => void;
  currency?: string;
}

/**
 * Tarjeta de activo criptográfico actualizada con el sistema de diseño SaaS azul.
 * Proporciona legibilidad financiera, ranking y estado de selección.
 */
export const CoinCard: FC<CoinCardProps> = ({
  coin,
  isSelected = false,
  onSelect,
  isFavorite: propIsFavorite,
  onToggleFavorite: propOnToggleFavorite,
  currency = "EUR",
}) => {
  const { isFavorite: hookIsFavorite, toggleFavorite: hookToggleFavorite } = useWatchlist();
  const isFav = propIsFavorite !== undefined ? propIsFavorite : hookIsFavorite(coin.id);
  const handleToggle = propOnToggleFavorite || hookToggleFavorite;

  const handleClick = () => {
    if (onSelect) {
      onSelect(coin);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-crypto-surface p-5 rounded-xl border transition-all duration-200 cursor-pointer group ${
        isSelected
          ? "border-crypto-primary ring-1 ring-crypto-primary/40 bg-crypto-primary-soft/40 shadow-md shadow-crypto-primary/10"
          : "border-crypto-border hover:border-crypto-border-hover hover:bg-crypto-surface-hover"
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          {coin.image ? (
            <img
              src={coin.image}
              alt={coin.name}
              className="w-9 h-9 rounded-full bg-crypto-surface-raised p-0.5 object-contain group-hover:scale-105 transition-transform flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-crypto-surface-raised border border-crypto-border flex items-center justify-center font-mono font-bold text-xs text-crypto-text-muted flex-shrink-0">
              {coin.symbol.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-crypto-text text-sm sm:text-base leading-tight group-hover:text-crypto-accent transition-colors truncate">
                {coin.name}
              </h3>
            </div>
            <span className="text-crypto-text-muted uppercase text-xs font-mono font-medium tracking-wider whitespace-nowrap">
              {coin.symbol}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-crypto-surface-raised text-crypto-text-muted border border-crypto-border/60 whitespace-nowrap">
            {coin.market_cap_rank ? formatRank(coin.market_cap_rank) : "—"}
          </span>
          <FavoriteButton
            coinId={coin.id}
            coinName={coin.name}
            isFavorite={isFav}
            onToggle={handleToggle}
            size="sm"
          />
        </div>
      </div>

      <div className="flex items-baseline justify-between mt-3 gap-2">
        <div className="min-w-0">
          <span className="text-xs text-crypto-text-muted block mb-0.5">Precio</span>
          <p className="text-xl font-mono font-bold text-crypto-text tabular-nums whitespace-nowrap">
            {coin.last_updated ? formatCurrency(coin.current_price, currency) : "—"}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <span className="text-xs text-crypto-text-muted block mb-0.5">24h</span>
          {coin.last_updated ? (
            <VariationBadge value={coin.price_change_percentage_24h} size="sm" />
          ) : (
            <span className="text-xs text-crypto-text-muted font-mono whitespace-nowrap">No disponible</span>
          )}
        </div>
      </div>

      {/* Minigráfico de 7 días cuando existan datos históricos disponibles */}
      {coin.sparkline_in_7d?.price && coin.sparkline_in_7d.price.length >= 2 && (
        <div className="mt-3 pt-2.5 border-t border-crypto-border/50 flex items-center justify-between">
          <span className="text-[10px] text-crypto-text-muted font-mono uppercase tracking-wider whitespace-nowrap">
            7 días
          </span>
          <MarketSparkline
            prices={coin.sparkline_in_7d.price}
            coinName={coin.name}
            width={100}
            height={26}
          />
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-crypto-border/60 flex items-center justify-between text-xs text-crypto-text-muted font-mono">
        <span className="whitespace-nowrap">Cap: {coin.last_updated && coin.market_cap ? formatCompactNumber(coin.market_cap, currency) : "—"}</span>
        <span className="text-[11px] text-crypto-accent group-hover:underline whitespace-nowrap">
          {isSelected ? "Seleccionado" : "Ver detalle →"}
        </span>
      </div>
    </div>
  );
};
