import type { FC } from "react";
import type { PortfolioSummary } from "../../types/crypto";
import { MetricCard } from "../ui/MetricCard.tsx";
import { VariationBadge } from "../ui/Badge.tsx";
import { formatCurrency, formatPercentage } from "../../utils/formatters.ts";

interface PortfolioSummaryRowProps {
  summary: PortfolioSummary;
  isLoadingPrices: boolean;
  currency?: string;
}

export const PortfolioSummaryRow: FC<PortfolioSummaryRowProps> = ({
  summary,
  isLoadingPrices,
  currency = "EUR",
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Valor Total Actual de la Cartera */}
      <MetricCard
        label="Valor Total de Cartera"
        value={
          isLoadingPrices && summary.positionCount > 0
            ? "Actualizando..."
            : formatCurrency(summary.totalCurrentValue, currency)
        }
        subValue={
          <span className="text-[11px] text-crypto-text-muted">
            {summary.hasUnavailablePrices
              ? "Excluye activos sin cotización actual"
              : `${summary.positionCount} activo${summary.positionCount === 1 ? "" : "s"} en posesión`}
          </span>
        }
        tooltip={`Valoración total a precio de mercado actual en ${currency}`}
        accentColor="primary"
      />

      {/* 2. Coste Total de Adquisición */}
      <MetricCard
        label="Coste de Adquisición"
        value={formatCurrency(summary.totalCostBasis, currency)}
        subValue={
          <span className="text-[11px] text-crypto-text-muted">
            Base según método FIFO (incluye comisiones de compra)
          </span>
        }
        tooltip="Coste total pagado por las posiciones que actualmente permanecen en cartera"
        accentColor="default"
      />

      {/* 3. Beneficio / Pérdida No Realizado (Latente) */}
      <MetricCard
        label="P&L No Realizado"
        value={
          isLoadingPrices && summary.positionCount > 0
            ? "..."
            : `${summary.totalUnrealizedPnl >= 0 ? "+" : ""}${formatCurrency(summary.totalUnrealizedPnl, currency)}`
        }
        badge={
          !isLoadingPrices && summary.positionCount > 0 ? (
            <VariationBadge value={summary.totalUnrealizedPnlPercentage} size="sm" />
          ) : undefined
        }
        subValue={
          <span className="text-[11px] text-crypto-text-muted">
            {summary.positionCount > 0
              ? `Rentabilidad latente: ${formatPercentage(summary.totalUnrealizedPnlPercentage, true)}`
              : "Sin posiciones abiertas"}
          </span>
        }
        tooltip="Diferencia entre el valor actual de mercado y el coste de adquisición restante"
        accentColor={summary.totalUnrealizedPnl >= 0 ? "accent" : "default"}
      />

      {/* 4. Beneficio / Pérdida Realizado (Cerrado) */}
      <MetricCard
        label="P&L Realizado"
        value={`${summary.totalRealizedPnl >= 0 ? "+" : ""}${formatCurrency(summary.totalRealizedPnl, currency)}`}
        badge={
          summary.totalRealizedPnl !== 0 ? (
            <span
              className={`text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                summary.totalRealizedPnl > 0
                  ? "bg-crypto-positive-soft text-crypto-positive"
                  : "bg-crypto-negative-soft text-crypto-negative"
              }`}
            >
              {summary.totalRealizedPnl > 0 ? "Ganancia cerrada" : "Pérdida cerrada"}
            </span>
          ) : undefined
        }
        subValue={
          <span className="text-[11px] text-crypto-text-muted">
            Ganancia o pérdida neta acumulada por ventas ejecutadas
          </span>
        }
        tooltip="Beneficio consolidado por ventas completadas, descontando costes FIFO y comisiones"
        accentColor="default"
      />

      {/* 5. Comisiones Totales Contabilizadas */}
      <MetricCard
        label="Comisiones Pagadas"
        value={formatCurrency(summary.totalFees, currency)}
        subValue={
          <span className="text-[11px] text-crypto-text-muted">
            {summary.transactionCount} operaci{summary.transactionCount === 1 ? "ón" : "ones"} registradas
          </span>
        }
        tooltip="Suma total de costes de transacción y comisiones declaradas en compras y ventas"
        accentColor="default"
      />
    </div>
  );
};
