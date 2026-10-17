import { useState, useEffect, useRef, useCallback } from "react";
import type { TimeRangeDays, HistoricalPriceData, ChartPoint } from "../types/crypto";
import { getCoinMarketChart } from "../services/api.ts";

export interface UseHistoricalChartResult {
  days: TimeRangeDays;
  setDays: (days: TimeRangeDays) => void;
  data: HistoricalPriceData | null;
  loading: boolean;
  errorMsg: string | null;
  hoveredPoint: ChartPoint | null;
  setHoveredPoint: (point: ChartPoint | null) => void;
  refetch: () => void;
}

/**
 * Hook personalizado para gestionar el ciclo de vida, selección de periodo,
 * prevención de respuestas obsoletas y caché de la serie histórica de precios.
 */
export function useHistoricalChart(coinId: string | undefined): UseHistoricalChartResult {
  const [days, setDays] = useState<TimeRangeDays>(1);
  const [data, setData] = useState<HistoricalPriceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

  // Contador de peticiones para descartar respuestas desfasadas por clics rápidos
  const requestIdRef = useRef(0);

  const fetchChart = useCallback(
    async (targetCoinId: string, targetDays: TimeRangeDays, ignoreCache = false) => {
      if (!targetCoinId) return;

      const currentReqId = ++requestIdRef.current;
      setLoading(true);
      setErrorMsg(null);
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
        }
      } catch (err: unknown) {
        if (currentReqId === requestIdRef.current) {
          const message =
            err instanceof Error ? err.message : "Error al cargar la serie de precios.";
          setErrorMsg(message);
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
    hoveredPoint,
    setHoveredPoint,
    refetch: handleRetry,
  };
}
