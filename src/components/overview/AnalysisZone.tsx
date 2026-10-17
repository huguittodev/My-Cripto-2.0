import type { FC } from "react";
import type { Cryptocurrency, CryptoList } from "../../types/crypto";
import { formatCurrency, formatCompactNumber, formatDateTime, formatRank } from "../../utils/formatters.ts";
import { VariationBadge, StatusBadge } from "../ui/Badge.tsx";

interface AnalysisZoneProps {
  selectedCoin: Cryptocurrency | null;
  coins: CryptoList;
  onSelectCoin: (coin: Cryptocurrency) => void;
}

export const AnalysisZone: FC<AnalysisZoneProps> = ({
  selectedCoin,
  coins,
  onSelectCoin,
}) => {
  if (!selectedCoin && coins.length === 0) {
    return null;
  }

  const activeCoin = selectedCoin || coins[0];

  // Calculamos los top movers dentro del conjunto real de datos
  const sortedByChange = [...coins].sort(
    (a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0),
  );
  const gainers = sortedByChange.slice(0, 3);
  const losers = [...sortedByChange].reverse().slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Panel Principal: Detalle de Activo y Contenedor de Gráfico (Fase 5) */}
      <div className="lg:col-span-8 bg-crypto-surface rounded-xl border border-crypto-border p-5 sm:p-6 flex flex-col justify-between">
        {/* Encabezado del Activo Seleccionado */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-crypto-border">
          <div className="flex items-center gap-3.5">
            <img
              src={activeCoin.image}
              alt={activeCoin.name}
              className="w-11 h-11 rounded-full bg-crypto-surface-raised p-1 object-contain"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-crypto-text tracking-tight">
                  {activeCoin.name}
                </h2>
                <span className="text-xs uppercase font-mono font-bold text-crypto-text-muted px-2 py-0.5 rounded bg-crypto-surface-raised border border-crypto-border/80">
                  {activeCoin.symbol}
                </span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-crypto-primary-soft text-crypto-accent border border-crypto-accent/25">
                  {formatRank(activeCoin.market_cap_rank)}
                </span>
              </div>
              <span className="text-xs text-crypto-text-muted mt-0.5 block">
                Última cotización: {formatDateTime(activeCoin.last_updated)}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-mono font-bold text-crypto-text tabular-nums">
              {formatCurrency(activeCoin.current_price)}
            </div>
            <div className="flex items-center justify-end gap-2 mt-1">
              <span className="text-xs text-crypto-text-muted font-mono">24h:</span>
              <VariationBadge value={activeCoin.price_change_percentage_24h} size="md" />
            </div>
          </div>
        </div>

        {/* Estadísticas Clave del Activo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 my-2 border-b border-crypto-border/70 text-xs font-mono">
          <div className="bg-crypto-surface-hover/70 p-2.5 rounded-lg border border-crypto-border/60">
            <span className="text-crypto-text-muted block text-[11px] mb-1">Cap. Mercado</span>
            <span className="font-semibold text-crypto-text">
              {formatCompactNumber(activeCoin.market_cap)}
            </span>
          </div>

          <div className="bg-crypto-surface-hover/70 p-2.5 rounded-lg border border-crypto-border/60">
            <span className="text-crypto-text-muted block text-[11px] mb-1">Volumen 24h</span>
            <span className="font-semibold text-crypto-text">
              {activeCoin.total_volume ? formatCompactNumber(activeCoin.total_volume) : "Disponible en F5"}
            </span>
          </div>

          <div className="bg-crypto-surface-hover/70 p-2.5 rounded-lg border border-crypto-border/60">
            <span className="text-crypto-text-muted block text-[11px] mb-1">Máx. 24h</span>
            <span className="font-semibold text-crypto-text">
              {activeCoin.high_24h ? formatCurrency(activeCoin.high_24h) : "Disponible en F5"}
            </span>
          </div>

          <div className="bg-crypto-surface-hover/70 p-2.5 rounded-lg border border-crypto-border/60">
            <span className="text-crypto-text-muted block text-[11px] mb-1">Mín. 24h</span>
            <span className="font-semibold text-crypto-text">
              {activeCoin.low_24h ? formatCurrency(activeCoin.low_24h) : "Disponible en F5"}
            </span>
          </div>
        </div>

        {/* Espacio Estructurado para el Futuro Gráfico (Fase 5) */}
        <div className="mt-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-crypto-text-secondary font-mono">
              Evolución de Precio
            </span>
            {/* Timeframe controls (visual structure) */}
            <div className="flex items-center gap-1 bg-crypto-surface-raised p-1 rounded-lg border border-crypto-border text-xs font-mono text-crypto-text-muted">
              <span className="px-2 py-0.5 rounded bg-crypto-surface-hover text-crypto-accent font-semibold">24H</span>
              <span className="px-2 py-0.5 opacity-60">7D</span>
              <span className="px-2 py-0.5 opacity-60">1M</span>
              <span className="px-2 py-0.5 opacity-60">1A</span>
            </div>
          </div>

          {/* Chart Canvas Area Placeholder */}
          <div className="h-48 sm:h-56 rounded-xl bg-crypto-surface-hover/40 border border-dashed border-crypto-border flex flex-col items-center justify-center p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-crypto-primary-soft border border-crypto-primary/30 flex items-center justify-center text-crypto-accent mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-crypto-text mb-1">
              Gráfico Histórico Interactivo
            </h4>
            <p className="text-xs text-crypto-text-muted max-w-sm mb-3">
              Espacio arquitectónico preparado para la visualización de velas y series temporales mediante CoinGecko /market_chart.
            </p>
            <StatusBadge variant="upcoming">Programado para Fase 5</StatusBadge>
          </div>
        </div>
      </div>

      {/* Panel Secundario: Tendencias y Top Movers */}
      <div className="lg:col-span-4 bg-crypto-surface rounded-xl border border-crypto-border p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-crypto-border mb-4">
            <h3 className="font-semibold text-sm text-crypto-text uppercase tracking-wider font-mono">
              Movers 24h
            </h3>
            <span className="text-[11px] text-crypto-text-muted font-mono">
              Muestra actual
            </span>
          </div>

          {/* Top Gainers */}
          <div className="mb-5">
            <span className="text-[11px] font-semibold text-crypto-positive uppercase tracking-wider font-mono block mb-2">
              ▲ Mayores Subidas
            </span>
            <div className="space-y-1.5">
              {gainers.map((coin) => (
                <button
                  key={`gainer-${coin.id}`}
                  type="button"
                  onClick={() => onSelectCoin(coin)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors border ${
                    activeCoin.id === coin.id
                      ? "bg-crypto-primary-soft/40 border-crypto-primary/50"
                      : "bg-crypto-surface-hover/50 hover:bg-crypto-surface-hover border-crypto-border/40"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={coin.image} alt={coin.name} className="w-5 h-5 rounded-full" />
                    <span className="text-xs font-medium text-crypto-text truncate">
                      {coin.name}
                    </span>
                    <span className="text-[10px] text-crypto-text-muted uppercase font-mono">
                      {coin.symbol}
                    </span>
                  </div>
                  <VariationBadge value={coin.price_change_percentage_24h} size="sm" />
                </button>
              ))}
            </div>
          </div>

          {/* Top Losers */}
          <div>
            <span className="text-[11px] font-semibold text-crypto-negative uppercase tracking-wider font-mono block mb-2">
              ▼ Mayores Bajadas
            </span>
            <div className="space-y-1.5">
              {losers.map((coin) => (
                <button
                  key={`loser-${coin.id}`}
                  type="button"
                  onClick={() => onSelectCoin(coin)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors border ${
                    activeCoin.id === coin.id
                      ? "bg-crypto-primary-soft/40 border-crypto-primary/50"
                      : "bg-crypto-surface-hover/50 hover:bg-crypto-surface-hover border-crypto-border/40"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={coin.image} alt={coin.name} className="w-5 h-5 rounded-full" />
                    <span className="text-xs font-medium text-crypto-text truncate">
                      {coin.name}
                    </span>
                    <span className="text-[10px] text-crypto-text-muted uppercase font-mono">
                      {coin.symbol}
                    </span>
                  </div>
                  <VariationBadge value={coin.price_change_percentage_24h} size="sm" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-crypto-border text-[11px] text-crypto-text-muted text-center">
          Haz clic en cualquier activo para seleccionarlo en el panel de detalle
        </div>
      </div>
    </div>
  );
};
