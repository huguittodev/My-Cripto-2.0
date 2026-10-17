import type { FC } from "react";
import type { Cryptocurrency, CryptoList } from "../../types/crypto";
import { formatCurrency, formatCompactNumber, formatDateTime, formatRank } from "../../utils/formatters.ts";
import { VariationBadge } from "../ui/Badge.tsx";
import { useHistoricalChart } from "../../hooks/useHistoricalChart.ts";
import { TimeframeSelector } from "../charts/TimeframeSelector.tsx";
import { AssetPerformanceHeader } from "../charts/AssetPerformanceHeader.tsx";
import { InteractivePriceChart } from "../charts/InteractivePriceChart.tsx";

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
  const activeCoin = selectedCoin || coins[0] || null;

  // Hook para cargar y gestionar la serie histórica del activo seleccionado
  const {
    days,
    setDays,
    data: chartData,
    loading: chartLoading,
    errorMsg: chartError,
    hoveredPoint,
    setHoveredPoint,
    refetch: refetchChart,
  } = useHistoricalChart(activeCoin?.id);

  if (!activeCoin) {
    return null;
  }

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

        {/* Gráfico Histórico Interactivo y Controles de Periodo */}
        <div className="mt-4 pt-3 border-t border-crypto-border/70 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-crypto-text-secondary font-mono">
              Evolución Histórica de Cotización
            </span>
            <TimeframeSelector
              selectedDays={days}
              onSelectDays={setDays}
              disabled={chartLoading}
            />
          </div>

          {/* Cabecera dinámica con precio seleccionado, fecha y variación del periodo */}
          <AssetPerformanceHeader
            days={days}
            performance={chartData?.performance || null}
            hoveredPoint={hoveredPoint}
            isLoading={chartLoading}
          />

          {/* Canvas SVG interactivo del gráfico con soporte de cursor */}
          <InteractivePriceChart
            data={chartData}
            isLoading={chartLoading}
            errorMsg={chartError}
            onRetry={refetchChart}
            hoveredPoint={hoveredPoint}
            onHoverPoint={setHoveredPoint}
          />
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
