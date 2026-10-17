import { useState, useMemo } from "react";
import type { FC } from "react";
import { usePortfolio } from "../../hooks/usePortfolio.ts";
import type { Transaction, TransactionType } from "../../types/crypto";
import { PortfolioSummaryRow } from "./PortfolioSummaryRow.tsx";
import { PortfolioDistribution } from "./PortfolioDistribution.tsx";
import { PortfolioPositionsTable } from "./PortfolioPositionsTable.tsx";
import { PortfolioHistoryTable } from "./PortfolioHistoryTable.tsx";
import { TransactionModal } from "./TransactionModal.tsx";
import { StatusBadge } from "../ui/Badge.tsx";

interface PortfolioViewProps {
  onNavigateToMarkets?: () => void;
}

export const PortfolioView: FC<PortfolioViewProps> = ({ onNavigateToMarkets }) => {
  const {
    transactions,
    positions,
    summary,
    distribution,
    isLoadingPrices,
    priceError,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    clearPortfolio,
    refreshPrices,
    currentPrices,
  } = usePortfolio();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [modalCoinId, setModalCoinId] = useState<string>("bitcoin");
  const [modalType, setModalType] = useState<TransactionType>("buy");
  const [activeTab, setActiveTab] = useState<"positions" | "history">("positions");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Mapa de holdings disponibles por activo para validaciones anti-ventas en corto
  const availableHoldings = useMemo(() => {
    const map: Record<string, number> = {};
    for (const pos of positions) {
      map[pos.coinId] = pos.amount;
    }
    return map;
  }, [positions]);

  // Manejadores para abrir el modal en diferentes modos
  const handleOpenNewTrade = (coinId = "bitcoin", initialType: TransactionType = "buy") => {
    setEditingTx(null);
    setModalCoinId(coinId);
    setModalType(initialType);
    setIsModalOpen(true);
  };

  const handleEditTrade = (tx: Transaction) => {
    setEditingTx(tx);
    setModalCoinId(tx.coinId);
    setModalType(tx.type);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTx(null);
  };

  const handleClearAllConfirm = () => {
    clearPortfolio();
    setShowClearConfirm(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Encabezado de la Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-crypto-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-crypto-text tracking-tight">
              Mi Cartera
            </h2>
            <StatusBadge variant="live">Método FIFO</StatusBadge>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-crypto-primary-soft text-crypto-accent border border-crypto-accent/20">
              No Custodial
            </span>
          </div>
          <p className="text-xs sm:text-sm text-crypto-text-secondary mt-1">
            Gestión de transacciones, valoración de activos a precio de mercado y desglose de P&L realizado y latente.
          </p>
        </div>

        {/* Acciones principales del encabezado */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => refreshPrices()}
            disabled={isLoadingPrices}
            className="px-3 py-2 rounded-lg bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-text-secondary hover:text-crypto-text border border-crypto-border text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Refrescar cotizaciones en vivo desde CoinGecko"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-3.5 h-3.5 ${isLoadingPrices ? "animate-spin text-crypto-accent" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{isLoadingPrices ? "Sincronizando..." : "Actualizar Precios"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenNewTrade("bitcoin", "buy")}
            className="px-4 py-2 rounded-lg bg-crypto-primary hover:bg-crypto-primary-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-crypto-primary/20 transition-all"
          >
            <span>+</span>
            <span>Registrar Operación</span>
          </button>
        </div>
      </div>

      {/* 2. Banner informativo sobre privacidad y límites */}
      <div className="bg-crypto-surface/70 border border-crypto-border/80 rounded-xl p-3.5 text-xs text-crypto-text-secondary flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-crypto-accent flex-shrink-0 text-base">🛡️</span>
          <span>
            <strong className="text-crypto-text font-medium">Almacenamiento 100% privado en navegador:</strong> Tus
            operaciones nunca salen de este dispositivo. Valoración contable FIFO (First-In, First-Out).
          </span>
        </div>
        {transactions.length > 0 && (
          <div className="flex-shrink-0">
            {showClearConfirm ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClearAllConfirm}
                  className="px-2 py-1 rounded bg-crypto-negative text-white text-[10px] font-bold"
                >
                  Confirmar vaciado
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-1 rounded bg-crypto-surface-raised text-crypto-text-secondary text-[10px]"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="text-[11px] text-crypto-text-muted hover:text-crypto-negative hover:underline font-mono"
              >
                Vaciar historial
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Aviso de error en consulta de precios en vivo */}
      {priceError && (
        <div className="p-3 rounded-xl bg-crypto-warning/10 border border-crypto-warning/30 text-xs text-crypto-warning flex items-center justify-between gap-2">
          <span>⚠️ {priceError} — Los cálculos continúan usando costes registrados.</span>
          <button
            type="button"
            onClick={() => refreshPrices()}
            className="underline font-semibold hover:text-white"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* 4. Estado Vacío: Sin transacciones registradas */}
      {transactions.length === 0 ? (
        <div className="bg-crypto-surface border border-crypto-border rounded-xl p-8 sm:p-14 text-center max-w-2xl mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-crypto-primary-soft border border-crypto-primary/30 flex items-center justify-center mx-auto mb-5 text-crypto-accent shadow-lg shadow-crypto-primary/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-crypto-text mb-2">Tu cartera está vacía</h3>
          <p className="text-xs sm:text-sm text-crypto-text-secondary mb-6 leading-relaxed max-w-lg mx-auto">
            Comienza registrando tus compras de Bitcoin, Ethereum o cualquier criptomoneda. My Crypto 2.0 calculará
            automáticamente tu saldo disponible, coste de adquisición por método FIFO, beneficio latente y ganancias
            cerradas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenNewTrade("bitcoin", "buy")}
              className="w-full sm:w-auto px-5 py-2.5 bg-crypto-primary hover:bg-crypto-primary-hover text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-crypto-primary/20 flex items-center justify-center gap-2"
            >
              <span>+</span>
              <span>Registrar primera compra</span>
            </button>

            {onNavigateToMarkets && (
              <button
                type="button"
                onClick={onNavigateToMarkets}
                className="w-full sm:w-auto px-5 py-2.5 bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-text text-xs font-semibold rounded-lg border border-crypto-border transition-colors"
              >
                Explorar mercados primero
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 5. Tarjetas de Resumen Global de Cartera */}
          <section aria-label="Resumen de Cartera">
            <PortfolioSummaryRow summary={summary} isLoadingPrices={isLoadingPrices} />
          </section>

          {/* 6. Distribución de Activos */}
          <section aria-label="Distribución de Activos">
            <PortfolioDistribution
              distribution={distribution}
              totalValue={summary.totalCurrentValue}
            />
          </section>

          {/* 7. Navegación por Pestañas: Posiciones vs Historial */}
          <div className="border-b border-crypto-border flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("positions")}
              className={`pb-3 text-sm font-bold transition-all relative ${
                activeTab === "positions"
                  ? "text-crypto-text border-b-2 border-crypto-primary"
                  : "text-crypto-text-secondary hover:text-crypto-text"
              }`}
            >
              Posiciones ({summary.positionCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`pb-3 text-sm font-bold transition-all relative ${
                activeTab === "history"
                  ? "text-crypto-text border-b-2 border-crypto-primary"
                  : "text-crypto-text-secondary hover:text-crypto-text"
              }`}
            >
              Historial de Transacciones ({transactions.length})
            </button>
          </div>

          {/* 8. Contenido de la pestaña activa */}
          {activeTab === "positions" && (
            <section aria-label="Tabla de Posiciones">
              <PortfolioPositionsTable
                positions={positions}
                onOpenTrade={(coinId, initialType) => handleOpenNewTrade(coinId, initialType)}
                isLoadingPrices={isLoadingPrices}
              />
            </section>
          )}

          {activeTab === "history" && (
            <section aria-label="Tabla de Historial">
              <PortfolioHistoryTable
                transactions={transactions}
                onEdit={handleEditTrade}
                onDelete={deleteTransaction}
              />
            </section>
          )}
        </>
      )}

      {/* Modal de Transacción */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={addTransaction}
        onUpdate={updateTransaction}
        editingTransaction={editingTx}
        initialCoinId={modalCoinId}
        initialType={modalType}
        availableHoldings={availableHoldings}
        currentPrices={currentPrices}
      />
    </div>
  );
};
