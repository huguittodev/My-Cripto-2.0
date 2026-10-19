import { useState } from "react";
import type { FC } from "react";
import type { PortfolioPosition } from "../../types/crypto";
import { formatCurrency, formatPercentage } from "../../utils/formatters.ts";
import { VariationBadge } from "../ui/Badge.tsx";

interface PortfolioPositionsTableProps {
  positions: PortfolioPosition[];
  onOpenTrade: (coinId: string, initialType?: "buy" | "sell") => void;
  isLoadingPrices: boolean;
  currency?: string;
}

export const PortfolioPositionsTable: FC<PortfolioPositionsTableProps> = ({
  positions,
  onOpenTrade,
  isLoadingPrices,
  currency = "EUR",
}) => {
  const [showClosedPositions, setShowClosedPositions] = useState(false);

  const activePositions = positions.filter((p) => p.amount > 0);
  const closedPositions = positions.filter((p) => p.amount === 0 && (p.realizedPnl !== 0 || p.totalFees > 0));

  const displayedPositions = showClosedPositions ? [...activePositions, ...closedPositions] : activePositions;

  if (activePositions.length === 0 && closedPositions.length === 0) {
    return null;
  }

  return (
    <div className="bg-crypto-surface border border-crypto-border rounded-xl overflow-hidden shadow-sm">
      {/* Encabezado y selector de filtro */}
      <div className="p-4 sm:p-5 border-b border-crypto-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-crypto-text flex items-center gap-2">
            <span>Posiciones en Cartera</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-crypto-primary-soft text-crypto-accent border border-crypto-accent/20">
              {activePositions.length} abierta{activePositions.length === 1 ? "" : "s"}
            </span>
          </h3>
          <p className="text-xs text-crypto-text-secondary mt-0.5">
            Valoración a mercado según cotización actual en EUR y coste por método FIFO
          </p>
        </div>

        {closedPositions.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-crypto-text-secondary cursor-pointer hover:text-crypto-text">
            <input
              type="checkbox"
              checked={showClosedPositions}
              onChange={(e) => setShowClosedPositions(e.target.checked)}
              className="rounded bg-crypto-surface-raised border-crypto-border text-crypto-primary focus:ring-0 cursor-pointer"
            />
            <span>Mostrar posiciones liquidadas ({closedPositions.length})</span>
          </label>
        )}
      </div>

      {/* Tabla con scroll horizontal responsivo */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-crypto-surface-raised/50 border-b border-crypto-border text-crypto-text-muted font-mono uppercase text-[11px] tracking-wider">
              <th className="py-3 px-4 font-semibold whitespace-nowrap">Activo</th>
              <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Cantidad</th>
              <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Coste Medio</th>
              <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Precio Actual</th>
              <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Valor Total</th>
              <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">P&L No Realizado</th>
              <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">P&L Realizado</th>
              <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Peso</th>
              <th className="py-3 px-4 font-semibold text-center whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-crypto-border/60">
            {displayedPositions.map((pos) => {
              const isClosed = pos.amount === 0;

              return (
                <tr
                  key={pos.coinId}
                  className={`hover:bg-crypto-surface-hover/70 transition-colors ${
                    isClosed ? "opacity-60 bg-crypto-surface-hover/20" : ""
                  }`}
                >
                  {/* Activo: Logo, Nombre, Símbolo */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      {pos.coinImage ? (
                        <img
                          src={pos.coinImage}
                          alt={pos.coinName || pos.coinId}
                          className="w-6 h-6 rounded-full flex-shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-crypto-primary-soft text-crypto-accent flex items-center justify-center font-bold text-[10px] font-mono flex-shrink-0">
                          {(pos.coinSymbol || pos.coinId).slice(0, 3).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-crypto-text flex items-center gap-1.5 truncate">
                          <span>{pos.coinName || pos.coinId}</span>
                          {isClosed && (
                            <span className="text-[10px] font-mono px-1 rounded bg-crypto-surface-raised text-crypto-text-muted whitespace-nowrap">
                              Liquidada
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-crypto-text-muted uppercase whitespace-nowrap">
                          {pos.coinSymbol || pos.coinId}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Cantidad poseída */}
                  <td className="py-3.5 px-4 text-right font-mono text-crypto-text font-medium whitespace-nowrap">
                    {pos.amount.toLocaleString("es-ES", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 8,
                    })}
                  </td>

                  {/* Coste medio de compra FIFO */}
                  <td className="py-3.5 px-4 text-right font-mono text-crypto-text-secondary whitespace-nowrap">
                    {pos.amount > 0 ? formatCurrency(pos.averageBuyPrice, currency) : "—"}
                  </td>

                  {/* Precio de mercado actual */}
                  <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                    {isLoadingPrices ? (
                      <span className="text-crypto-text-muted">...</span>
                    ) : pos.currentPrice !== null ? (
                      <span className="text-crypto-text font-medium whitespace-nowrap">
                        {formatCurrency(pos.currentPrice, currency)}
                      </span>
                    ) : (
                      <span
                        className="text-[11px] text-crypto-warning bg-crypto-warning/10 px-1.5 py-0.5 rounded border border-crypto-warning/20 whitespace-nowrap"
                        title="Cotización temporalmente no disponible desde CoinGecko"
                      >
                        No disponible
                      </span>
                    )}
                  </td>

                  {/* Valor Total a Mercado */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-crypto-text whitespace-nowrap">
                    {pos.currentValue !== null ? formatCurrency(pos.currentValue, currency) : "—"}
                  </td>

                  {/* P&L No Realizado */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {pos.unrealizedPnl !== null && pos.unrealizedPnlPercentage !== null ? (
                      <div className="flex flex-col items-end">
                        <span
                          className={`font-mono font-semibold whitespace-nowrap ${
                            pos.unrealizedPnl >= 0 ? "text-crypto-positive" : "text-crypto-negative"
                          }`}
                        >
                          {pos.unrealizedPnl >= 0 ? "+" : ""}
                          {formatCurrency(pos.unrealizedPnl, currency)}
                        </span>
                        <VariationBadge value={pos.unrealizedPnlPercentage} size="sm" />
                      </div>
                    ) : (
                      <span className="font-mono text-crypto-text-muted">—</span>
                    )}
                  </td>

                  {/* P&L Realizado */}
                  <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                    {pos.realizedPnl !== 0 ? (
                      <span
                        className={`font-semibold whitespace-nowrap ${
                          pos.realizedPnl > 0 ? "text-crypto-positive" : "text-crypto-negative"
                        }`}
                      >
                        {pos.realizedPnl > 0 ? "+" : ""}
                        {formatCurrency(pos.realizedPnl, currency)}
                      </span>
                    ) : (
                      <span className="text-crypto-text-muted whitespace-nowrap">{formatCurrency(0, currency)}</span>
                    )}
                  </td>

                  {/* Ponderación de la cartera */}
                  <td className="py-3.5 px-4 text-right font-mono text-crypto-accent font-medium whitespace-nowrap">
                    {pos.allocationPercentage > 0
                      ? formatPercentage(pos.allocationPercentage, false)
                      : "0,00 %"}
                  </td>

                  {/* Botones de acción rápida */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenTrade(pos.coinId, "buy")}
                        className="px-2 py-1 rounded bg-crypto-primary/20 hover:bg-crypto-primary text-crypto-accent hover:text-white text-[11px] font-semibold transition-colors whitespace-nowrap"
                        title={`Comprar más ${pos.coinName || pos.coinId}`}
                      >
                        + Compra
                      </button>
                      {pos.amount > 0 && (
                        <button
                          type="button"
                          onClick={() => onOpenTrade(pos.coinId, "sell")}
                          className="px-2 py-1 rounded bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-text-secondary hover:text-crypto-text text-[11px] font-semibold border border-crypto-border transition-colors whitespace-nowrap"
                          title={`Vender parte o todo de ${pos.coinName || pos.coinId}`}
                        >
                          - Venta
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
