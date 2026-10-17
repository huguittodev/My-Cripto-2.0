import { useState } from "react";
import type { FC, FormEvent } from "react";
import type { Transaction, TransactionType } from "../../types/crypto";
import { validateTransaction } from "../../utils/portfolioCalculations.ts";
import { formatCurrency } from "../../utils/formatters.ts";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (txData: Omit<Transaction, "id" | "createdAt">) => void;
  onUpdate?: (tx: Transaction) => void;
  editingTransaction?: Transaction | null;
  initialCoinId?: string;
  initialType?: TransactionType;
  availableHoldings: Record<string, number>;
  currentPrices: Record<string, number | null>;
}

// Activos habituales para sugerencias rápidas en el formulario
const POPULAR_COINS = [
  { id: "bitcoin", name: "Bitcoin (BTC)" },
  { id: "ethereum", name: "Ethereum (ETH)" },
  { id: "solana", name: "Solana (SOL)" },
  { id: "cardano", name: "Cardano (ADA)" },
  { id: "ripple", name: "XRP (XRP)" },
  { id: "binancecoin", name: "BNB (BNB)" },
  { id: "polkadot", name: "Polkadot (DOT)" },
  { id: "avalanche-2", name: "Avalanche (AVAX)" },
];

interface TransactionFormInnerProps {
  onClose: () => void;
  onSubmit: (txData: Omit<Transaction, "id" | "createdAt">) => void;
  onUpdate?: (tx: Transaction) => void;
  editingTransaction?: Transaction | null;
  initialCoinId: string;
  initialType: TransactionType;
  availableHoldings: Record<string, number>;
  currentPrices: Record<string, number | null>;
}

// Formulario interno inicializado limpiamente con props sin efectos secundarios
const TransactionFormInner: FC<TransactionFormInnerProps> = ({
  onClose,
  onSubmit,
  onUpdate,
  editingTransaction,
  initialCoinId,
  initialType,
  availableHoldings,
  currentPrices,
}) => {
  const [coinId, setCoinId] = useState<string>(
    () => editingTransaction?.coinId || initialCoinId || "bitcoin",
  );
  const [type, setType] = useState<TransactionType>(
    () => editingTransaction?.type || initialType || "buy",
  );
  const [amountStr, setAmountStr] = useState<string>(() =>
    editingTransaction ? String(editingTransaction.amount) : "",
  );
  const [priceStr, setPriceStr] = useState<string>(() =>
    editingTransaction ? String(editingTransaction.pricePerUnit) : "",
  );
  const [feeStr, setFeeStr] = useState<string>(() =>
    editingTransaction ? String(editingTransaction.fee || 0) : "0",
  );
  const [datetimeStr, setDatetimeStr] = useState<string>(() => {
    const date = editingTransaction ? new Date(editingTransaction.timestamp) : new Date();
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [notes, setNotes] = useState<string>(() => editingTransaction?.notes || "");
  const [formError, setFormError] = useState<string | null>(null);

  const selectedCoinId = coinId.toLowerCase().trim();
  const currentAvailableHolding = availableHoldings[selectedCoinId] || 0;
  const currentPrice = currentPrices[selectedCoinId];

  // Auto-rellena el precio con la cotización de mercado actual
  const handleUseCurrentPrice = () => {
    if (currentPrice !== null && currentPrice !== undefined) {
      setPriceStr(String(currentPrice));
    }
  };

  // Cálculo en vivo del valor monetario total de la operación
  const parsedAmount = parseFloat(amountStr) || 0;
  const parsedPrice = parseFloat(priceStr) || 0;
  const parsedFee = parseFloat(feeStr) || 0;
  const grossTotal = parsedAmount * parsedPrice;
  const netTotal = type === "buy" ? grossTotal + parsedFee : grossTotal - parsedFee;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const timestamp = datetimeStr ? new Date(datetimeStr).getTime() : Date.now();

    const candidateData: Partial<Transaction> = {
      coinId: selectedCoinId,
      type,
      amount: parsedAmount,
      pricePerUnit: parsedPrice,
      fee: parsedFee,
      timestamp,
      notes: notes.trim() || undefined,
    };

    // Si estamos editando una transacción de venta existente, reponemos su saldo para no auto-bloquearse
    const availableForValidation =
      editingTransaction &&
      editingTransaction.type === "sell" &&
      editingTransaction.coinId === selectedCoinId
        ? currentAvailableHolding + editingTransaction.amount
        : currentAvailableHolding;

    const validation = validateTransaction(candidateData, availableForValidation);
    if (!validation.isValid) {
      setFormError(validation.error || "Datos de transacción no válidos.");
      return;
    }

    if (editingTransaction && onUpdate) {
      onUpdate({
        ...editingTransaction,
        coinId: selectedCoinId,
        type,
        amount: parsedAmount,
        pricePerUnit: parsedPrice,
        fee: parsedFee,
        timestamp,
        notes: notes.trim() || undefined,
      });
    } else {
      onSubmit({
        coinId: selectedCoinId,
        type,
        amount: parsedAmount,
        pricePerUnit: parsedPrice,
        fee: parsedFee,
        timestamp,
        notes: notes.trim() || undefined,
      });
    }

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
      {/* Mensaje de error de validación */}
      {formError && (
        <div className="p-3 rounded-lg bg-crypto-negative-soft border border-crypto-negative/30 text-xs text-crypto-negative font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{formError}</span>
        </div>
      )}

      {/* Selector de Tipo: Compra vs Venta */}
      <div>
        <label className="block text-xs font-semibold text-crypto-text-secondary mb-1.5">
          Tipo de Operación
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType("buy")}
            className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${
              type === "buy"
                ? "bg-crypto-positive-soft text-crypto-positive border-2 border-crypto-positive"
                : "bg-crypto-surface-raised text-crypto-text-secondary border border-crypto-border hover:bg-crypto-surface-hover"
            }`}
          >
            <span>↓</span>
            <span>Compra (Adquisición)</span>
          </button>

          <button
            type="button"
            onClick={() => setType("sell")}
            className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${
              type === "sell"
                ? "bg-crypto-primary-soft text-crypto-accent border-2 border-crypto-primary"
                : "bg-crypto-surface-raised text-crypto-text-secondary border border-crypto-border hover:bg-crypto-surface-hover"
            }`}
          >
            <span>↑</span>
            <span>Venta (Liquidación)</span>
          </button>
        </div>
      </div>

      {/* Activo (coinId) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="coin-id-input" className="text-xs font-semibold text-crypto-text-secondary">
            Activo / Criptomoneda
          </label>
          {type === "sell" && (
            <span className="text-[11px] font-mono text-crypto-text-muted">
              Saldo disponible:{" "}
              <strong className="text-crypto-text">
                {currentAvailableHolding.toLocaleString("es-ES", { maximumFractionDigits: 8 })}
              </strong>
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <input
            id="coin-id-input"
            type="text"
            list="popular-coins-list"
            value={coinId}
            onChange={(e) => setCoinId(e.target.value)}
            placeholder="ej: bitcoin, ethereum, solana..."
            className="w-full bg-crypto-surface-raised border border-crypto-border rounded-lg px-3 py-2 text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-primary"
            required
          />
          <datalist id="popular-coins-list">
            {POPULAR_COINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </datalist>

          {/* Botones de selección rápida */}
          <div className="flex flex-wrap gap-1 pt-1">
            {POPULAR_COINS.slice(0, 5).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCoinId(c.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  selectedCoinId === c.id
                    ? "bg-crypto-primary text-white"
                    : "bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-text-muted border border-crypto-border/50"
                }`}
              >
                {c.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cantidad y Precio en 2 columnas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Cantidad */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="amount-input" className="text-xs font-semibold text-crypto-text-secondary">
              Cantidad
            </label>
            {type === "sell" && currentAvailableHolding > 0 && (
              <button
                type="button"
                onClick={() => setAmountStr(String(currentAvailableHolding))}
                className="text-[10px] text-crypto-accent hover:underline font-mono"
              >
                Vender todo (100%)
              </button>
            )}
          </div>
          <input
            id="amount-input"
            type="number"
            step="any"
            min="0.00000001"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0.00"
            className="w-full bg-crypto-surface-raised border border-crypto-border rounded-lg px-3 py-2 text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-primary"
            required
          />
        </div>

        {/* Precio Unitario */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="price-input" className="text-xs font-semibold text-crypto-text-secondary">
              Precio Unitario (€)
            </label>
            {currentPrice !== null && currentPrice !== undefined && (
              <button
                type="button"
                onClick={handleUseCurrentPrice}
                className="text-[10px] text-crypto-accent hover:underline font-mono"
                title={`Usar cotización actual (${formatCurrency(currentPrice)})`}
              >
                Mercado ({formatCurrency(currentPrice)})
              </button>
            )}
          </div>
          <input
            id="price-input"
            type="number"
            step="any"
            min="0"
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value)}
            placeholder="0.00"
            className="w-full bg-crypto-surface-raised border border-crypto-border rounded-lg px-3 py-2 text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-primary"
            required
          />
        </div>
      </div>

      {/* Comisión y Fecha en 2 columnas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Comisión */}
        <div>
          <label htmlFor="fee-input" className="block text-xs font-semibold text-crypto-text-secondary mb-1.5">
            Comisión (€)
          </label>
          <input
            id="fee-input"
            type="number"
            step="any"
            min="0"
            value={feeStr}
            onChange={(e) => setFeeStr(e.target.value)}
            placeholder="0.00"
            className="w-full bg-crypto-surface-raised border border-crypto-border rounded-lg px-3 py-2 text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-primary"
          />
        </div>

        {/* Fecha y hora */}
        <div>
          <label htmlFor="datetime-input" className="block text-xs font-semibold text-crypto-text-secondary mb-1.5">
            Fecha y Hora de Ejecución
          </label>
          <input
            id="datetime-input"
            type="datetime-local"
            value={datetimeStr}
            onChange={(e) => setDatetimeStr(e.target.value)}
            className="w-full bg-crypto-surface-raised border border-crypto-border rounded-lg px-3 py-2 text-xs font-mono text-crypto-text focus:outline-none focus:border-crypto-primary"
            required
          />
        </div>
      </div>

      {/* Notas Opcionales */}
      <div>
        <label htmlFor="notes-input" className="block text-xs font-semibold text-crypto-text-secondary mb-1.5">
          Notas / Etiqueta (opcional)
        </label>
        <input
          id="notes-input"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ej: Compra mensual DCA, transferencia, etc."
          className="w-full bg-crypto-surface-raised border border-crypto-border rounded-lg px-3 py-2 text-xs text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-primary"
        />
      </div>

      {/* Resumen del Total Estimado */}
      <div className="p-3 bg-crypto-surface-raised/60 border border-crypto-border rounded-lg flex items-center justify-between text-xs">
        <span className="text-crypto-text-secondary font-mono">
          {type === "buy" ? "Total Desembolsado (con fee):" : "Total Recibido (neto de fee):"}
        </span>
        <span className="font-mono font-bold text-sm text-crypto-text">
          {formatCurrency(netTotal)}
        </span>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-text-secondary hover:text-crypto-text text-xs font-semibold transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-5 py-2 rounded-lg bg-crypto-primary hover:bg-crypto-primary-hover text-white text-xs font-bold transition-all shadow-md shadow-crypto-primary/20"
        >
          {editingTransaction ? "Guardar Cambios" : "Registrar Transacción"}
        </button>
      </div>
    </form>
  );
};

export const TransactionModal: FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onUpdate,
  editingTransaction,
  initialCoinId = "",
  initialType = "buy",
  availableHoldings,
  currentPrices,
}) => {
  if (!isOpen) {
    return null;
  }

  // Genera una clave única que resetea el formulario al cambiar de transacción o modo
  const formKey = editingTransaction
    ? `edit-${editingTransaction.id}`
    : `new-${initialCoinId}-${initialType}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-crypto-surface border border-crypto-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera del modal */}
        <div className="px-6 py-4 border-b border-crypto-border flex items-center justify-between">
          <div>
            <h3 id="modal-title" className="text-base font-bold text-crypto-text">
              {editingTransaction ? "Editar Operación" : "Registrar Nueva Operación"}
            </h3>
            <p className="text-xs text-crypto-text-secondary mt-0.5">
              Introduce los detalles de la compra o venta para el cómputo FIFO de tu cartera
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-crypto-text-muted hover:text-crypto-text hover:bg-crypto-surface-raised transition-colors"
            aria-label="Cerrar modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulario desacoplado con clave única de reset */}
        <TransactionFormInner
          key={formKey}
          onClose={onClose}
          onSubmit={onSubmit}
          onUpdate={onUpdate}
          editingTransaction={editingTransaction}
          initialCoinId={initialCoinId}
          initialType={initialType}
          availableHoldings={availableHoldings}
          currentPrices={currentPrices}
        />
      </div>
    </div>
  );
};
