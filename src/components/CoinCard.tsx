import type { FC } from "react";
import type { Cryptocurrency } from "../types/crypto";
import { formatCurrency, formatCompactNumber, formatRank } from "../utils/formatters.ts";
import { VariationBadge } from "./ui/Badge.tsx";

interface CoinCardProps {
  coin: Cryptocurrency;
  isSelected?: boolean;
  onSelect?: (coin: Cryptocurrency) => void;
}

/**
 * Tarjeta de activo criptográfico actualizada con el sistema de diseño SaaS azul.
 * Proporciona legibilidad financiera, ranking y estado de selección.
 */
export const CoinCard: FC<CoinCardProps> = ({
  coin,
  isSelected = false,
  onSelect,
}) => {
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
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <img
            src={coin.image}
            alt={coin.name}
            className="w-9 h-9 rounded-full bg-crypto-surface-raised p-0.5 object-contain group-hover:scale-105 transition-transform"
            loading="lazy"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-crypto-text text-sm sm:text-base leading-tight group-hover:text-crypto-accent transition-colors">
                {coin.name}
              </h3>
            </div>
            <span className="text-crypto-text-muted uppercase text-xs font-mono font-medium tracking-wider">
              {coin.symbol}
            </span>
          </div>
        </div>

        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-crypto-surface-raised text-crypto-text-muted border border-crypto-border/60">
          {formatRank(coin.market_cap_rank)}
        </span>
      </div>

      <div className="flex items-baseline justify-between mt-3">
        <div>
          <span className="text-xs text-crypto-text-muted block mb-0.5">Precio</span>
          <p className="text-xl font-mono font-bold text-crypto-text tabular-nums">
            {formatCurrency(coin.current_price)}
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs text-crypto-text-muted block mb-0.5">24h</span>
          <VariationBadge value={coin.price_change_percentage_24h} size="sm" />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-crypto-border/60 flex items-center justify-between text-xs text-crypto-text-muted font-mono">
        <span>Cap: {formatCompactNumber(coin.market_cap)}</span>
        <span className="text-[11px] text-crypto-accent group-hover:underline">
          {isSelected ? "Seleccionado" : "Ver detalle →"}
        </span>
      </div>
    </div>
  );
};
