import type { FC } from "react";
import { formatCurrency, formatPercentage } from "../../utils/formatters.ts";

interface DistributionItem {
  coinId: string;
  symbol: string;
  name: string;
  percentage: number;
  value: number;
}

interface PortfolioDistributionProps {
  distribution: DistributionItem[];
  totalValue: number;
}

// Paleta de gradientes y tonalidades corporativas para los segmentos de la cartera
const SEGMENT_COLORS = [
  "bg-crypto-primary",
  "bg-crypto-accent",
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-blue-400",
  "bg-sky-600",
  "bg-slate-400",
];

export const PortfolioDistribution: FC<PortfolioDistributionProps> = ({
  distribution,
  totalValue,
}) => {
  if (distribution.length === 0 || totalValue <= 0) {
    return null;
  }

  return (
    <div className="bg-crypto-surface border border-crypto-border rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-crypto-text uppercase tracking-wider font-mono">
            Distribución de Activos
          </h3>
          <p className="text-xs text-crypto-text-secondary mt-0.5">
            Ponderación porcentual de cada activo sobre el valor de mercado total ({formatCurrency(totalValue)})
          </p>
        </div>
        <span className="text-xs font-mono text-crypto-text-muted">
          {distribution.length} activo{distribution.length === 1 ? "" : "s"} ponderados
        </span>
      </div>

      {/* Barra segmentada de distribución */}
      <div className="w-full h-3.5 bg-crypto-surface-raised rounded-full overflow-hidden flex shadow-inner mb-4">
        {distribution.map((item, index) => {
          const colorClass = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
          return (
            <div
              key={item.coinId}
              style={{ width: `${Math.max(item.percentage, 0.5)}%` }}
              className={`h-full ${colorClass} transition-all duration-300 relative group`}
              title={`${item.name} (${item.symbol}): ${formatPercentage(item.percentage, false)} — ${formatCurrency(item.value)}`}
            />
          );
        })}
      </div>

      {/* Lista de leyendas y desglose por activo */}
      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-crypto-border/50">
        {distribution.map((item, index) => {
          const colorClass = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
          return (
            <div
              key={item.coinId}
              className="flex items-center gap-2 bg-crypto-surface-hover/60 border border-crypto-border/60 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap flex-shrink-0"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${colorClass} flex-shrink-0`} />
              <span className="font-bold text-crypto-text font-mono whitespace-nowrap">{item.symbol}</span>
              <span className="text-crypto-text-muted">·</span>
              <span className="text-crypto-accent font-mono font-medium whitespace-nowrap">
                {formatPercentage(item.percentage, false)}
              </span>
              <span className="text-crypto-text-secondary font-mono text-[11px] whitespace-nowrap">
                ({formatCurrency(item.value)})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
