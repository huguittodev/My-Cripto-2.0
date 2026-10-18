// Hook para el ciclo de vida, selección de periodos y conservación de datos en caché del gráfico histórico

import { useState, useEffect, useRef, useCallback } from "react";
import type { TimeRangeDays, HistoricalPriceData, ChartPoint } from "../types/crypto";
import { getCoinMarketChart, getStaleChartData, RateLimitError } from "../services/api.ts";

export interface UseHistoricalChartResult {
  days: TimeRangeDays;
  setDays: (days: TimeRangeDays) => void;
  data: HistoricalPriceData | null;
  loading: boolean;
  errorMsg: string | null;
  isStale: boolean;
  isRateLimit: boolean;
  hoveredPoint: ChartPoint | null;
  setHoveredPoint: (point: ChartPoint | null) => void;
  refetch: () => void;
}

/**
 * Gestiona la carga de la serie temporal del gráfico histórico, protegiendo
 * frente a cancelaciones, deduplicando peticiones y reteniendo datos antiguos (stale)
 * en caso de que una actualización falle por rate limit o red.
 */
export function useHistoricalChart(coinId: string | undefined): UseHistoricalChartResult {
  const [days, setDays] = useState<TimeRangeDays>(1);
  const [data, setData] = useState<HistoricalPriceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [isRateLimit, setIsRateLimit] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

  // Contador de peticiones para descartar respuestas desfasadas por clics rápidos
  const requestIdRef = useRef(0);

  const fetchChart = useCallback(
    async (targetCoinId: string, targetDays: TimeRangeDays, ignoreCache = false) => {
      if (!targetCoinId) return;

      const currentReqId = ++requestIdRef.current;
      setLoading(true);
      setErrorMsg(null);
      setIsRateLimit(false);
      setHoveredPoint(null);

      try {
        const result = await getCoinMarketChart({
          coinId: targetCoinId,
          days: targetDays,
          ignoreCache,
        });

        // Solo aplica la respuesta si corresponde a la última petición emitida
        if (currentReqId === requestIdRef.current) {
          setData(result);
          setIsStale(false);
        }
      } catch (err: unknown) {
        if (currentReqId === requestIdRef.current) {
          const isRate = err instanceof RateLimitError;
          setIsRateLimit(isRate);

          const message =
            err instanceof Error ? err.message : "Error al cargar la serie de precios.";
          setErrorMsg(message);

          // Si ya disponemos de datos para este activo, los conservamos en lugar de mostrar pantalla vacía
          setData((prev) => {
            if (prev && prev.coinId === targetCoinId.toLowerCase().trim()) {
              setIsStale(true);
              return prev;
            }
            const stale = getStaleChartData(targetCoinId, targetDays);
            if (stale) {
              setIsStale(true);
              return stale;
            }
            return null;
          });
        }
      } finally {
        if (currentReqId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  // Carga automática al cambiar de activo o de periodo
  useEffect(() => {
    if (coinId) {
      fetchChart(coinId, days);
    }
  }, [coinId, days, fetchChart]);

  const handleSelectDays = useCallback((newDays: TimeRangeDays) => {
    setDays(newDays);
  }, []);

  const handleRetry = useCallback(() => {
    if (coinId) {
      fetchChart(coinId, days, true);
    }
  }, [coinId, days, fetchChart]);

  return {
    days,
    setDays: handleSelectDays,
    data,
    loading,
    errorMsg,
    isStale,
    isRateLimit,
    hoveredPoint,
    setHoveredPoint,
    refetch: handleRetry,
  };
}
