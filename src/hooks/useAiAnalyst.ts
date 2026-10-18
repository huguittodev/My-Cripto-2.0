import { useState, useEffect, useCallback, useRef } from "react";
import type {
  AiChatMessage,
  AiAnalystStatus,
  AiMarketContext,
  Cryptocurrency,
  CryptoList,
  GlobalMarketData,
  PortfolioSummary,
  HistoricalPriceData,
} from "../types/crypto";
import {
  askAiAnalyst,
  fetchAiStatus,
  AiAnalystError,
} from "../services/aiAnalystService.ts";
import { formatDateTime } from "../utils/formatters.ts";

export interface UseAiAnalystOptions {
  selectedCoin?: Cryptocurrency | null;
  coins?: CryptoList;
  globalData?: GlobalMarketData | null;
  portfolioSummary?: PortfolioSummary | null;
  portfolioDistribution?: Array<{ name: string; symbol: string; percentage: number }>;
  historicalData?: HistoricalPriceData | null;
}

export interface UseAiAnalystReturn {
  messages: AiChatMessage[];
  status: AiAnalystStatus | null;
  isLoadingStatus: boolean;
  isGenerating: boolean;
  error: AiAnalystError | null;
  includePortfolio: boolean;
  setIncludePortfolio: (include: boolean) => void;
  sendMessage: (prompt: string) => Promise<void>;
  clearConversation: () => void;
  retryLastMessage: () => Promise<void>;
  cancelGeneration: () => void;
  checkStatus: () => Promise<void>;
}

const WELCOME_MESSAGE: AiChatMessage = {
  id: "welcome-msg",
  role: "model",
  text: `¡Hola! Soy tu **AI Crypto Analyst** en My Crypto 2.0.

Puedo ayudarte a:
- **Analizar el mercado**: Interpretar precios, tendencias y rangos de cotización en EUR.
- **Comparar activos**: Evaluar dos o más criptomonedas utilizando los datos cargados en la terminal.
- **Comprender métricas técnicas**: Explicar qué significan el volumen de 24h, la capitalización o la dominancia de BTC.
- **Revisar tu cartera**: Si lo deseas, puedes activar la casilla inferior para incluir un resumen agregado anónimo de tu distribución.

*Nota de transparencia: Me baso estrictamente en datos reales de CoinGecko y reconozco cuando falta información. No ofrezco asesoramiento financiero ni prometo rentabilidad.*`,
  timestamp: Date.now(),
};

/**
 * Hook para gestionar el estado de conversación, contexto de mercado y conexión con el AI Analyst.
 */
export const useAiAnalyst = ({
  selectedCoin = null,
  coins = [],
  globalData = null,
  portfolioSummary = null,
  portfolioDistribution = [],
  historicalData = null,
}: UseAiAnalystOptions = {}): UseAiAnalystReturn => {
  const [messages, setMessages] = useState<AiChatMessage[]>([WELCOME_MESSAGE]);
  const [status, setStatus] = useState<AiAnalystStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<AiAnalystError | null>(null);
  const [includePortfolio, setIncludePortfolio] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastPromptRef = useRef<string>("");

  // Comprueba la configuración de Gemini en el servidor
  const checkStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const serverStatus = await fetchAiStatus();
      setStatus(serverStatus);
    } catch {
      setStatus({
        isConfigured: false,
        model: "gemini-2.5-flash",
        maxPromptLength: 1000,
        maxHistoryTurns: 6,
      });
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Construye el objeto de contexto real de mercado para adjuntar a la consulta
  const buildContext = useCallback((): AiMarketContext => {
    const context: AiMarketContext = {};

    // 1. Activo seleccionado
    if (selectedCoin) {
      context.asset = {
        id: selectedCoin.id,
        name: selectedCoin.name,
        symbol: selectedCoin.symbol,
        current_price: selectedCoin.current_price,
        price_change_percentage_24h: selectedCoin.price_change_percentage_24h,
        market_cap: selectedCoin.market_cap,
        market_cap_rank: selectedCoin.market_cap_rank,
        total_volume: selectedCoin.total_volume,
        low_24h: selectedCoin.low_24h,
        high_24h: selectedCoin.high_24h,
        last_updated: selectedCoin.last_updated,
        source: "CoinGecko v3",
        currency: "EUR",
      };

      if (historicalData && historicalData.coinId === selectedCoin.id) {
        context.asset.historical_summary = {
          days: historicalData.days,
          startPrice: historicalData.performance.startPrice,
          endPrice: historicalData.performance.endPrice,
          absoluteChange: historicalData.performance.absoluteChange,
          percentageChange: historicalData.performance.percentageChange,
        };
      }
    }

    // 2. Activos adicionales presentes en el explorador para comparaciones
    if (coins.length > 0) {
      context.compareAssets = coins.slice(0, 10).map((c) => ({
        id: c.id,
        name: c.name,
        symbol: c.symbol,
        current_price: c.current_price,
        price_change_percentage_24h: c.price_change_percentage_24h,
        market_cap: c.market_cap,
        total_volume: c.total_volume,
      }));
    }

    // 3. Resumen global del mercado
    if (globalData) {
      context.global = globalData;
    }

    // 4. Resumen anónimo de cartera (SOLO si el usuario lo activó explícitamente)
    if (includePortfolio && portfolioSummary && portfolioSummary.positionCount > 0) {
      context.portfolio = {
        totalCurrentValue: portfolioSummary.totalCurrentValue,
        totalCostBasis: portfolioSummary.totalCostBasis,
        totalUnrealizedPnl: portfolioSummary.totalUnrealizedPnl,
        totalUnrealizedPnlPercentage: portfolioSummary.totalUnrealizedPnlPercentage,
        totalRealizedPnl: portfolioSummary.totalRealizedPnl,
        positionCount: portfolioSummary.positionCount,
        distribution: portfolioDistribution,
      };
    }

    return context;
  }, [coins, globalData, historicalData, includePortfolio, portfolioDistribution, portfolioSummary, selectedCoin]);

  // Envía un mensaje a la IA
  const sendMessage = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || isGenerating) return;

      lastPromptRef.current = trimmed;
      setError(null);

      // Crea y añade el mensaje del usuario inmediatamente en la interfaz
      const userMessage: AiChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        text: trimmed,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsGenerating(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const context = buildContext();

        // Filtra el historial para enviarlo al modelo (excluye errores y el mensaje de bienvenida)
        const historyForApi = messages
          .filter((m) => m.id !== "welcome-msg" && !m.isError)
          .slice(-6)
          .map((m) => ({ role: m.role, text: m.text }));

        const response = await askAiAnalyst({
          prompt: trimmed,
          context,
          history: historyForApi,
          signal: controller.signal,
        });

        // Construye etiqueta informativa sobre los datos utilizados
        let contextTag = "Datos generales de mercado";
        if (selectedCoin) {
          contextTag = `Datos: ${selectedCoin.name} (${selectedCoin.symbol.toUpperCase()}) • ${formatDateTime(selectedCoin.last_updated, false)}`;
        }
        if (context.portfolio) {
          contextTag += " • Resumen de Cartera incluido";
        }

        const modelMessage: AiChatMessage = {
          id: `model-${Date.now()}`,
          role: "model",
          text: response.text,
          timestamp: response.timestamp,
          model: response.model,
          isCached: response.isCached,
          contextTag,
        };

        setMessages((prev) => [...prev, modelMessage]);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        const typedError =
          err instanceof AiAnalystError
            ? err
            : new AiAnalystError(
                err instanceof Error ? err.message : "Error inesperado al conectar con el analista.",
                "UNKNOWN_ERROR",
                500,
              );

        setError(typedError);

        // Añade un mensaje de error visible en el hilo de conversación
        const errorMessage: AiChatMessage = {
          id: `error-${Date.now()}`,
          role: "model",
          text: `⚠️ **No se pudo completar el análisis**: ${typedError.message}`,
          timestamp: Date.now(),
          isError: true,
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [buildContext, isGenerating, messages, selectedCoin],
  );

  // Reintenta la última consulta enviada
  const retryLastMessage = useCallback(async () => {
    if (lastPromptRef.current) {
      // Elimina el último mensaje de error si existe
      setMessages((prev) => (prev[prev.length - 1]?.isError ? prev.slice(0, -1) : prev));
      await sendMessage(lastPromptRef.current);
    }
  }, [sendMessage]);

  // Cancela una solicitud en curso
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  }, []);

  // Reinicia la conversación al estado inicial
  const clearConversation = useCallback(() => {
    cancelGeneration();
    setError(null);
    setMessages([
      {
        ...WELCOME_MESSAGE,
        timestamp: Date.now(),
      },
    ]);
  }, [cancelGeneration]);

  return {
    messages,
    status,
    isLoadingStatus,
    isGenerating,
    error,
    includePortfolio,
    setIncludePortfolio,
    sendMessage,
    clearConversation,
    retryLastMessage,
    cancelGeneration,
    checkStatus,
  };
};
