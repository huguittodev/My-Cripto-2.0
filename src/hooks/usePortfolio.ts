import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  Transaction,
  PortfolioPosition,
  PortfolioSummary,
} from "../types/crypto";
import {
  getStoredTransactions,
  addStoredTransaction,
  updateStoredTransaction,
  deleteStoredTransaction,
  clearPortfolioStorage,
  PORTFOLIO_UPDATED_EVENT,
} from "../services/portfolioStorage.ts";
import {
  calculatePortfolioPositions,
  calculatePortfolioSummary,
  calculatePortfolioDistribution,
} from "../utils/portfolioCalculations.ts";
import { getMarkets } from "../services/api.ts";

export interface UsePortfolioReturn {
  transactions: Transaction[];
  positions: PortfolioPosition[];
  summary: PortfolioSummary;
  distribution: Array<{
    coinId: string;
    symbol: string;
    name: string;
    percentage: number;
    value: number;
  }>;
  isLoadingPrices: boolean;
  priceError: string | null;
  addTransaction: (tx: Omit<Transaction, "id" | "createdAt">) => Transaction;
  updateTransaction: (tx: Transaction) => boolean;
  deleteTransaction: (id: string) => boolean;
  clearPortfolio: () => void;
  refreshPrices: () => Promise<void>;
  currentPrices: Record<string, number | null>;
}

/**
 * Hook orquestador de la cartera cripto: gestiona el estado de transacciones,
 * sincronización de almacenamiento, cotizaciones en tiempo real y cálculos FIFO.
 */
export const usePortfolio = (): UsePortfolioReturn => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => getStoredTransactions());
  const [currentPrices, setCurrentPrices] = useState<Record<string, number | null>>({});
  const [coinMetadata, setCoinMetadata] = useState<
    Record<string, { name?: string; symbol?: string; image?: string }>
  >({});
  const [isLoadingPrices, setIsLoadingPrices] = useState<boolean>(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Sincroniza el estado cuando se detecta el evento custom o evento de storage entre pestañas
  const reloadTransactions = useCallback(() => {
    setTransactions(getStoredTransactions());
  }, []);

  useEffect(() => {
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === null || e.key.includes("my-crypto-portfolio")) {
        reloadTransactions();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(PORTFOLIO_UPDATED_EVENT, reloadTransactions);
      window.addEventListener("storage", handleStorageEvent);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(PORTFOLIO_UPDATED_EVENT, reloadTransactions);
        window.removeEventListener("storage", handleStorageEvent);
      }
    };
  }, [reloadTransactions]);

  // Extrae la lista única de activos operados en la cartera
  const uniqueCoinIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tx of transactions) {
      if (tx.coinId) {
        ids.add(tx.coinId.toLowerCase().trim());
      }
    }
    return Array.from(ids);
  }, [transactions]);

  // Recupera cotizaciones de mercado en vivo para los activos presentes en la cartera
  const fetchPrices = useCallback(async () => {
    if (uniqueCoinIds.length === 0) {
      setCurrentPrices({});
      setIsLoadingPrices(false);
      setPriceError(null);
      return;
    }

    setIsLoadingPrices(true);
    setPriceError(null);

    try {
      const data = await getMarkets({
        vsCurrency: "eur",
        ids: uniqueCoinIds,
        perPage: Math.max(uniqueCoinIds.length, 50),
        sparkline: false,
        ignoreCache: false,
      });

      const priceMap: Record<string, number | null> = {};
      const metaMap: Record<string, { name?: string; symbol?: string; image?: string }> = {};

      for (const coin of data) {
        const id = coin.id.toLowerCase();
        priceMap[id] = typeof coin.current_price === "number" ? coin.current_price : null;
        metaMap[id] = {
          name: coin.name,
          symbol: coin.symbol?.toUpperCase(),
          image: coin.image,
        };
      }

      // Si algún activo no fue retornado por CoinGecko, se asigna explícitamente null (no disponible)
      for (const id of uniqueCoinIds) {
        if (priceMap[id] === undefined) {
          priceMap[id] = null;
        }
      }

      setCurrentPrices(priceMap);
      setCoinMetadata((prev) => ({ ...prev, ...metaMap }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al consultar cotizaciones en vivo.";
      setPriceError(message);
    } finally {
      setIsLoadingPrices(false);
    }
  }, [uniqueCoinIds]);

  // Dispara la consulta de precios al cambiar los activos únicos operados
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Calcula posiciones consolidadas usando el método FIFO
  const positions = useMemo(() => {
    try {
      return calculatePortfolioPositions(transactions, currentPrices, coinMetadata);
    } catch (err) {
      console.error("Error al calcular posiciones de cartera:", err);
      return [];
    }
  }, [transactions, currentPrices, coinMetadata]);

  // Calcula métricas globales de la cartera
  const summary = useMemo(() => {
    return calculatePortfolioSummary(positions, transactions.length);
  }, [positions, transactions.length]);

  // Calcula la distribución visual por activo
  const distribution = useMemo(() => {
    return calculatePortfolioDistribution(positions);
  }, [positions]);

  // Métodos de mutación delegados en el servicio de persistencia
  const addTransaction = useCallback(
    (tx: Omit<Transaction, "id" | "createdAt">): Transaction => {
      const created = addStoredTransaction(tx);
      reloadTransactions();
      return created;
    },
    [reloadTransactions],
  );

  const updateTransaction = useCallback(
    (tx: Transaction): boolean => {
      const ok = updateStoredTransaction(tx);
      reloadTransactions();
      return ok;
    },
    [reloadTransactions],
  );

  const deleteTransaction = useCallback(
    (id: string): boolean => {
      const ok = deleteStoredTransaction(id);
      reloadTransactions();
      return ok;
    },
    [reloadTransactions],
  );

  const clearPortfolio = useCallback(() => {
    clearPortfolioStorage();
    reloadTransactions();
  }, [reloadTransactions]);

  return {
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
    refreshPrices: fetchPrices,
    currentPrices,
  };
};
