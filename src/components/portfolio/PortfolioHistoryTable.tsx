import { useState } from "react";
import type { FC } from "react";
import type { Transaction } from "../../types/crypto";
import { formatCurrency, formatDateTime } from "../../utils/formatters.ts";

interface PortfolioHistoryTableProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

export const PortfolioHistoryTable: FC<PortfolioHistoryTableProps> = ({
  transactions,
  onEdit,
  onDelete,
}) => {
  const [filterCoin, setFilterCoin] = useState<string>("all");
  const [filterType, setFilterType] = useState<"all" | "buy" | "sell">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Lista única de monedas con operaciones registradas
  const coinOptions = Array.from(new Set(transactions.map((t) => t.coinId))).sort();

  // Filtra transacciones según la selección
  const filtered = transactions.filter((t) => {
    if (filterCoin !== "all" && t.coinId.toLowerCase() !== filterCoin.toLowerCase()) {
      return false;
    }
    if (filterType !== "all" && t.type !== filterType) {
      return false;
    }
    return true;
  });

  const handleDeleteConfirm = (id: string) => {
    onDelete(id);
    setDeletingId(null);
  };

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="bg-crypto-surface border border-crypto-border rounded-xl overflow-hidden shadow-sm">
      {/* Barra de Filtros del Historial */}
      <div className="p-4 sm:p-5 border-b border-crypto-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-crypto-text flex items-center gap-2">
            <span>Historial de Operaciones</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-crypto-surface-raised text-crypto-text-secondary border border-crypto-border">
              {filtered.length} de {transactions.length}
            </span>
          </h3>
          <p className="text-xs text-crypto-text-secondary mt-0.5">
            Registro cronológico inmutable de compras y ventas de la cartera
          </p>
        </div>

        {/* Filtros rápidos */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as "all" | "buy" | "sell")}
            className="bg-crypto-surface-raised border border-crypto-border rounded-lg text-xs font-mono text-crypto-text px-2.5 py-1.5 focus:outline-none focus:border-crypto-primary"
          >
            <option value="all">Todas las operaciones</option>
            <option value="buy">Solo compras</option>
            <option value="sell">Solo ventas</option>
          </select>

          {coinOptions.length > 1 && (
            <select
              value={filterCoin}
              onChange={(e) => setFilterCoin(e.target.value)}
              className="bg-crypto-surface-raised border border-crypto-border rounded-lg text-xs font-mono text-crypto-text px-2.5 py-1.5 focus:outline-none focus:border-crypto-primary uppercase"
            >
              <option value="all">Todos los activos</option>
              {coinOptions.map((coinId) => (
                <option key={coinId} value={coinId}>
                  {coinId.toUpperCase()}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-crypto-surface-raised/50 border-b border-crypto-border text-crypto-text-muted font-mono uppercase text-[11px] tracking-wider">
              <th className="py-3 px-4 font-semibold">Fecha / Hora</th>
              <th className="py-3 px-4 font-semibold">Tipo</th>
              <th className="py-3 px-4 font-semibold">Activo</th>
              <th className="py-3 px-4 font-semibold text-right">Cantidad</th>
              <th className="py-3 px-4 font-semibold text-right">Precio Unitario</th>
              <th className="py-3 px-4 font-semibold text-right">Comisión</th>
              <th className="py-3 px-4 font-semibold text-right">Total Transacción</th>
              <th className="py-3 px-4 font-semibold">Notas</th>
              <th className="py-3 px-4 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-crypto-border/60">
            {filtered.map((tx) => {
              const isBuy = tx.type === "buy";
              const grossTotal = tx.amount * tx.pricePerUnit;
              // Para compras, el desembolso total incluye la comisión; para ventas, los ingresos brutos
              const effectiveTotal = isBuy ? grossTotal + tx.fee : grossTotal - tx.fee;
              const isPendingDelete = deletingId === tx.id;

              return (
                <tr key={tx.id} className="hover:bg-crypto-surface-hover/70 transition-colors">
                  {/* Fecha y hora */}
                  <td className="py-3 px-4 font-mono text-crypto-text-secondary whitespace-nowrap">
                    {formatDateTime(tx.timestamp)}
                  </td>

                  {/* Tipo de Operación */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 font-mono font-bold text-[10px] uppercase px-2 py-0.5 rounded ${
                        isBuy
                          ? "bg-crypto-positive-soft text-crypto-positive border border-crypto-positive/20"
                          : "bg-crypto-primary-soft text-crypto-accent border border-crypto-accent/20"
                      }`}
                    >
                      <span>{isBuy ? "↓" : "↑"}</span>
                      <span>{isBuy ? "Compra" : "Venta"}</span>
                    </span>
                  </td>

                  {/* Activo */}
                  <td className="py-3 px-4 font-mono font-bold text-crypto-text uppercase">
                    {tx.coinId}
                  </td>

                  {/* Cantidad */}
                  <td className="py-3 px-4 text-right font-mono text-crypto-text font-medium">
                    {tx.amount.toLocaleString("es-ES", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 8,
                    })}
                  </td>

                  {/* Precio Unitario */}
                  <td className="py-3 px-4 text-right font-mono text-crypto-text-secondary">
                    {formatCurrency(tx.pricePerUnit)}
                  </td>

                  {/* Comisión */}
                  <td className="py-3 px-4 text-right font-mono text-crypto-text-muted">
                    {tx.fee > 0 ? formatCurrency(tx.fee) : "0,00 €"}
                  </td>

                  {/* Total Transacción */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-crypto-text">
                    {formatCurrency(effectiveTotal)}
                  </td>

                  {/* Notas */}
                  <td className="py-3 px-4 text-crypto-text-secondary max-w-xs truncate" title={tx.notes}>
                    {tx.notes ? tx.notes : <span className="text-crypto-text-muted">—</span>}
                  </td>

                  {/* Acciones */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {isPendingDelete ? (
                      <div className="flex items-center justify-center gap-1.5 animate-fade-in">
                        <button
                          type="button"
                          onClick={() => handleDeleteConfirm(tx.id)}
                          className="px-2 py-0.5 rounded bg-crypto-negative hover:bg-red-600 text-white font-bold text-[11px] transition-colors"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-0.5 rounded bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-text-secondary text-[11px] transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(tx)}
                          className="p-1 rounded text-crypto-text-secondary hover:text-crypto-text hover:bg-crypto-surface-raised transition-colors"
                          title="Editar operación"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.8}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingId(tx.id)}
                          className="p-1 rounded text-crypto-text-muted hover:text-crypto-negative hover:bg-crypto-negative-soft transition-colors"
                          title="Eliminar operación"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.8}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
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
