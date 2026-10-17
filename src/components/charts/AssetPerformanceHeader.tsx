import type { FC } from "react";
import type { ChartPoint, PeriodPerformance, TimeRangeDays } from "../../types/crypto";
import { formatCurrency, formatDateTime } from "../../utils/formatters.ts";
import { VariationBadge } from "../ui/Badge.tsx";

interface AssetPerformanceHeaderProps {
  days: TimeRangeDays;
  performance: PeriodPerformance | null;
  hoveredPoint: ChartPoint | null;
  isLoading: boolean;
}

const TIMEFRAME_LABELS: Record<TimeRangeDays, string> = {
  1: "24 Horas",
  7: "7 Días",
  30: "30 Días",
  90: "90 Días",
  365: "1 Año",
};

export const AssetPerformanceHeader: FC<AssetPerformanceHeaderProps> = ({
  days,
  performance,
  hoveredPoint,
  isLoading,
}) => {
  if (isLoading || !performance || !performance.isValid) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-crypto-border/50 text-xs font-mono">
        <div className="h-6 w-36 bg-crypto-surface-hover animate-pulse rounded" />
        <div className="h-6 w-48 bg-crypto-surface-hover animate-pulse rounded" />
      </div>
    );
  }

  // Si el usuario pasa el cursor sobre un punto específico del gráfico, muestra los valores interactivos
  const displayPrice = hoveredPoint ? hoveredPoint.price : performance.endPrice;
  const displayDate = hoveredPoint ? formatDateTime(hoveredPoint.timestamp) : null;

  // Variación relativa respecto al inicio del periodo
  const pointDeltaAbsolute = hoveredPoint
    ? hoveredPoint.price - performance.startPrice
    : performance.absoluteChange;
  const pointDeltaPercent =
    performance.startPrice > 0
      ? ((displayPrice / performance.startPrice) - 1) * 100
      : 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-crypto-border/50 text-xs font-mono">
      {/* Cotización activa o del punto seleccionado */}
      <div className="flex items-center gap-3">
        <div>
          <span className="text-[11px] text-crypto-text-muted block">
            {hoveredPoint ? "Precio en punto inspeccionado" : "Precio de cierre del periodo"}
          </span>
          <span className="text-lg sm:text-xl font-bold text-crypto-text tabular-nums">
            {formatCurrency(displayPrice)}
          </span>
        </div>

        {displayDate && (
          <div className="hidden sm:block border-l border-crypto-border/60 pl-3">
            <span className="text-[10px] text-crypto-text-muted block">Fecha y hora</span>
            <span className="text-xs text-crypto-accent font-medium">
              {displayDate}
            </span>
          </div>
        )}
      </div>

      {/* Métricas de rendimiento del periodo seleccionado */}
      <div className="flex items-center gap-3 self-end sm:self-center">
        <div className="text-right">
          <span className="text-[11px] text-crypto-text-muted block">
            Rendimiento {TIMEFRAME_LABELS[days]}
          </span>
          <span
            className={`text-xs font-semibold tabular-nums ${
              pointDeltaAbsolute >= 0
                ? "text-crypto-positive"
                : "text-crypto-negative"
            }`}
          >
            {pointDeltaAbsolute >= 0 ? "+" : ""}
            {formatCurrency(pointDeltaAbsolute)}
          </span>
        </div>

        <VariationBadge value={pointDeltaPercent} size="md" />
      </div>
    </div>
  );
};
