import { useState, useEffect, useRef } from "react";
import type { FC, FormEvent } from "react";
import type { PriceAlert, AlertCondition, Cryptocurrency, SearchCoinResult } from "../../types/crypto";
import { validateAlertInput } from "../../utils/alertEngine.ts";
import { formatCurrency, getCurrencySymbol } from "../../utils/formatters.ts";
import { searchCoins } from "../../services/api.ts";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (alertData: Omit<PriceAlert, "id" | "createdAt" | "status">) => void;
  onUpdate?: (alert: PriceAlert) => void;
  editingAlert?: PriceAlert | null;
  initialCoin?: Cryptocurrency | null;
  existingAlerts?: PriceAlert[];
  currentPrices?: Record<string, number | null>;
  currency?: string;
}

// Activos habituales con metadatos para sugerencias inmediatas
const POPULAR_ASSETS = [
  { id: "bitcoin", name: "Bitcoin", symbol: "btc", image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png" },
  { id: "ethereum", name: "Ethereum", symbol: "eth", image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png" },
  { id: "solana", name: "Solana", symbol: "sol", image: "https://assets.coingecko.com/coins/images/4128/large/solana.png" },
  { id: "ripple", name: "XRP", symbol: "xrp", image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png" },
  { id: "binancecoin", name: "BNB", symbol: "bnb", image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png" },
  { id: "cardano", name: "Cardano", symbol: "ada", image: "https://assets.coingecko.com/coins/images/975/large/cardano.png" },
];

interface AlertFormInnerProps {
  onClose: () => void;
  onSubmit: (alertData: Omit<PriceAlert, "id" | "createdAt" | "status">) => void;
  onUpdate?: (alert: PriceAlert) => void;
  editingAlert?: PriceAlert | null;
  initialCoin?: Cryptocurrency | null;
  existingAlerts: PriceAlert[];
  currentPrices: Record<string, number | null>;
  currency?: string;
}

const AlertFormInner: FC<AlertFormInnerProps> = ({
  onClose,
  onSubmit,
  onUpdate,
  editingAlert,
  initialCoin,
  existingAlerts,
  currentPrices,
  currency = "EUR",
}) => {
  // Inicialización de estado del formulario
  const [coinId, setCoinId] = useState<string>(
    () => editingAlert?.coinId || initialCoin?.id || "bitcoin",
  );
  const [coinName, setCoinName] = useState<string>(
    () => editingAlert?.coinName || initialCoin?.name || "Bitcoin",
  );
  const [coinSymbol, setCoinSymbol] = useState<string>(
    () => editingAlert?.coinSymbol || initialCoin?.symbol || "btc",
  );
  const [coinImage, setCoinImage] = useState<string | undefined>(
    () => editingAlert?.coinImage || initialCoin?.image,
  );
  const [condition, setCondition] = useState<AlertCondition>(
    () => editingAlert?.condition || "gte",
  );
  const [targetPriceStr, setTargetPriceStr] = useState<string>(
    () => (editingAlert ? String(editingAlert.targetPrice) : ""),
  );
  const [notes, setNotes] = useState<string>(() => editingAlert?.notes || "");
  const [formError, setFormError] = useState<string | null>(null);
  const [formWarning, setFormWarning] = useState<string | null>(null);

  // Estado para el buscador remoto integrado de activos
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchCoinResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedCoinId = coinId.toLowerCase().trim();
  const currentPrice = currentPrices[selectedCoinId] ?? initialCoin?.current_price ?? null;

  // Efecto de búsqueda remota con debounce (300ms)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCoins(searchQuery.trim());
        setSearchResults(results.slice(0, 6));
      } catch (err) {
        console.warn("Error buscando activos para alerta:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Aplica un porcentaje de variación rápido relativo al precio actual
  const handleApplyPercentage = (pct: number) => {
    if (currentPrice === null || currentPrice <= 0) return;
    const computed = currentPrice * (1 + pct / 100);
    // Formatea con precisión adecuada para monedas pequeñas o grandes
    const decimals = computed < 1 ? 6 : computed < 10 ? 4 : 2;
    setTargetPriceStr(computed.toFixed(decimals));
  };

  // Validación dinámica en tiempo real para advertencias informativas
  useEffect(() => {
    const num = parseFloat(targetPriceStr);
    if (!isNaN(num) && num > 0) {
      const validation = validateAlertInput({
        coinId: selectedCoinId,
        condition,
        targetPrice: num,
        currentPrice,
        existingAlerts,
        editingAlertId: editingAlert?.id,
      });

      setFormWarning(validation.warning || null);
    } else {
      setFormWarning(null);
    }
  }, [condition, currentPrice, editingAlert?.id, existingAlerts, selectedCoinId, targetPriceStr]);

  const handleSelectAsset = (asset: { id: string; name: string; symbol: string; image?: string; thumb?: string }) => {
    setCoinId(asset.id);
    setCoinName(asset.name);
    setCoinSymbol(asset.symbol);
    setCoinImage(asset.image || asset.thumb);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedPrice = parseFloat(targetPriceStr);

    const validation = validateAlertInput({
      coinId: selectedCoinId,
      condition,
      targetPrice: parsedPrice,
      currentPrice,
      existingAlerts,
      editingAlertId: editingAlert?.id,
    });

    if (!validation.isValid) {
      setFormError(validation.error || "Datos de alerta no válidos.");
      return;
    }

    if (editingAlert && onUpdate) {
      onUpdate({
        ...editingAlert,
        coinId: selectedCoinId,
        coinName,
        coinSymbol,
        coinImage,
        condition,
        targetPrice: parsedPrice,
        notes: notes.trim() || undefined,
      });
    } else {
      onSubmit({
        coinId: selectedCoinId,
        coinName,
        coinSymbol,
        coinImage,
        condition,
        targetPrice: parsedPrice,
        currency: (editingAlert?.currency || currency || "eur").toLowerCase(),
        notes: notes.trim() || undefined,
      });
    }

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
      {/* Mensajes de Validación y Advertencias */}
      {formError && (
        <div className="p-3 rounded-lg bg-crypto-negative-soft border border-crypto-negative/30 text-xs text-crypto-negative font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{formError}</span>
        </div>
      )}

      {formWarning && (
        <div className="p-3 rounded-lg bg-crypto-warning/10 border border-crypto-warning/30 text-xs text-crypto-warning font-medium flex items-center gap-2">
          <span>ℹ️</span>
          <span>{formWarning}</span>
        </div>
      )}

      {/* Selector / Buscador de Activo */}
      <div>
        <label className="block text-xs font-semibold text-crypto-text-secondary mb-1.5">
          Criptomoneda Objetivo
        </label>

        {/* Activo Actualmente Seleccionado */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-crypto-surface-raised border border-crypto-border mb-2">
          <div className="flex items-center gap-3">
            {coinImage ? (
              <img src={coinImage} alt={coinName} className="w-7 h-7 rounded-full object-contain" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-crypto-primary-soft flex items-center justify-center font-bold text-xs text-crypto-accent">
                {coinSymbol.slice(0, 3).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-xs font-bold text-crypto-text">{coinName}</div>
              <div className="text-[10px] font-mono text-crypto-text-muted uppercase">
                {coinSymbol} • {coinId}
              </div>
            </div>
          </div>

          {currentPrice !== null && (
            <div className="text-right">
              <span className="text-[10px] text-crypto-text-muted block font-mono">Cotización actual:</span>
              <span className="text-xs font-mono font-bold text-crypto-text">
                {formatCurrency(currentPrice)}
              </span>
            </div>
          )}
        </div>

        {/* Campo de búsqueda remota para cambiar activo */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar otra criptomoneda (ej: cardano, ripple, avax)..."
            className="w-full bg-crypto-surface-raised border border-crypto-border rounded-lg px-3 py-2 text-xs text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-primary"
          />
          {isSearching && (
            <span className="absolute right-3 top-2.5 text-[10px] text-crypto-text-muted font-mono animate-pulse">
              Buscando...
            </span>
          )}

          {/* Menú desplegable con resultados de búsqueda */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-crypto-surface-raised border border-crypto-border rounded-lg shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto">
              {searchResults.map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => handleSelectAsset(res)}
                  className="w-full px-3 py-2 text-left hover:bg-crypto-surface-hover flex items-center justify-between text-xs transition-colors border-b border-crypto-border/40 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <img src={res.thumb} alt={res.name} className="w-5 h-5 rounded-full" />
                    <span className="font-semibold text-crypto-text">{res.name}</span>
                    <span className="text-crypto-text-muted font-mono uppercase text-[10px]">
                      {res.symbol}
                    </span>
                  </div>
                  <span className="text-[10px] text-crypto-text-muted font-mono">
                    #{res.market_cap_rank ?? "—"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sugerencias Rápidas Populares */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          <span className="text-[10px] text-crypto-text-muted self-center">Populares:</span>
          {POPULAR_ASSETS.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => handleSelectAsset(asset)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                selectedCoinId === asset.id
                  ? "bg-crypto-primary text-white"
                  : "bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-text-muted border border-crypto-border/50"
              }`}
            >
              {asset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Condición de Disparo */}
      <div>
        <label className="block text-xs font-semibold text-crypto-text-secondary mb-1.5">
          Condición de Disparo
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCondition("gte")}
            className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${
              condition === "gte"
                ? "bg-crypto-positive-soft text-crypto-positive border-2 border-crypto-positive"
                : "bg-crypto-surface-raised text-crypto-text-secondary border border-crypto-border hover:bg-crypto-surface-hover"
            }`}
          >
            <span>📈</span>
            <span>Sube a o supera (≥)</span>
          </button>

          <button
            type="button"
            onClick={() => setCondition("lte")}
            className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${
              condition === "lte"
                ? "bg-crypto-negative-soft text-crypto-negative border-2 border-crypto-negative"
                : "bg-crypto-surface-raised text-crypto-text-secondary border border-crypto-border hover:bg-crypto-surface-hover"
            }`}
          >
            <span>📉</span>
            <span>Cae a o baja de (≤)</span>
          </button>
        </div>
      </div>

      {/* Precio Objetivo */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="target-price-input" className="text-xs font-semibold text-crypto-text-secondary">
            Precio Objetivo ({getCurrencySymbol(currency)})
          </label>
          {currentPrice !== null && (
            <span className="text-[10px] font-mono text-crypto-text-muted">
              Base: {formatCurrency(currentPrice, currency)}
            </span>
          )}
        </div>

        <input
          id="target-price-input"
          type="number"
          step="any"
          min="0.00000001"
          value={targetPriceStr}
          onChange={(e) => setTargetPriceStr(e.target.value)}
          placeholder="ej: 75000"
          className="w-full bg-crypto-surface-raised border border-crypto-border rounded-lg px-3 py-2 text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-primary"
          required
        />

        {/* Accesos rápidos de variación porcentual */}
        {currentPrice !== null && currentPrice > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[10px] text-crypto-text-muted">Atajos:</span>
            {condition === "gte" ? (
              <>
                <button
                  type="button"
                  onClick={() => handleApplyPercentage(5)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-positive border border-crypto-border"
                >
                  +5%
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPercentage(10)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-positive border border-crypto-border"
                >
                  +10%
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPercentage(20)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-positive border border-crypto-border"
                >
                  +20%
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleApplyPercentage(-5)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-negative border border-crypto-border"
                >
                  -5%
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPercentage(-10)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-negative border border-crypto-border"
                >
                  -10%
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPercentage(-20)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-negative border border-crypto-border"
                >
                  -20%
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Notas / Etiqueta Opcional */}
      <div>
        <label htmlFor="alert-notes-input" className="block text-xs font-semibold text-crypto-text-secondary mb-1.5">
          Notas o Estrategia (opcional)
        </label>
        <input
          id="alert-notes-input"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ej: Nivel de soporte clave, toma de beneficios parcial, etc."
          className="w-full bg-crypto-surface-raised border border-crypto-border rounded-lg px-3 py-2 text-xs text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-primary"
        />
      </div>

      {/* Botones de Acción */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-crypto-border">
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
          {editingAlert ? "Guardar Cambios" : "Crear Alerta"}
        </button>
      </div>
    </form>
  );
};

export const AlertModal: FC<AlertModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onUpdate,
  editingAlert,
  initialCoin,
  existingAlerts = [],
  currentPrices = {},
  currency = "EUR",
}) => {
  if (!isOpen) return null;

  const formKey = editingAlert ? `edit-${editingAlert.id}` : `new-${initialCoin?.id || "btc"}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
    >
      <div className="bg-crypto-surface border border-crypto-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-crypto-border flex items-center justify-between">
          <div>
            <h3 id="alert-modal-title" className="text-base font-bold text-crypto-text">
              {editingAlert ? "Editar Alerta de Precio" : "Configurar Alerta de Precio"}
            </h3>
            <p className="text-xs text-crypto-text-secondary mt-0.5">
              Establece un umbral de cotización para recibir avisos mientras la aplicación esté abierta
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

        {/* Formulario */}
        <AlertFormInner
          key={formKey}
          onClose={onClose}
          onSubmit={onSubmit}
          onUpdate={onUpdate}
          editingAlert={editingAlert}
          initialCoin={initialCoin}
          existingAlerts={existingAlerts}
          currentPrices={currentPrices}
          currency={currency}
        />
      </div>
    </div>
  );
};
