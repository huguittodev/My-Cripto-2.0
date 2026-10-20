import { useState, useRef, useEffect } from "react";
import type { FC, KeyboardEvent, FormEvent } from "react";
import type {
  Cryptocurrency,
  CryptoList,
  GlobalMarketData,
} from "../../types/crypto";
import { useAiAnalyst } from "../../hooks/useAiAnalyst.ts";
import { usePortfolio } from "../../hooks/usePortfolio.ts";
import { useHistoricalChart } from "../../hooks/useHistoricalChart.ts";
import { AiMessageItem } from "./AiMessageItem.tsx";
import { AiSuggestedQuestions } from "./AiSuggestedQuestions.tsx";
import { StatusBadge } from "../ui/Badge.tsx";
import { formatCurrency } from "../../utils/formatters.ts";

interface AiAnalystViewProps {
  selectedCoin: Cryptocurrency | null;
  coins?: CryptoList;
  globalData?: GlobalMarketData | null;
  onSelectCoin?: (coin: Cryptocurrency) => void;
  onNavigateToMarkets?: () => void;
}

export const AiAnalystView: FC<AiAnalystViewProps> = ({
  selectedCoin,
  coins = [],
  globalData = null,
  onSelectCoin,
  onNavigateToMarkets,
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Datos de cartera para enriquecimiento contextual bajo consentimiento explícito
  const { summary: portfolioSummary, distribution: portfolioDistribution } = usePortfolio();

  // Datos históricos del activo seleccionado
  const { data: chartData } = useHistoricalChart(selectedCoin?.id);

  const {
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
    loadDegradedMode,
    cancelGeneration,
    checkStatus,
  } = useAiAnalyst({
    selectedCoin,
    coins,
    globalData,
    portfolioSummary,
    portfolioDistribution,
    historicalData: chartData,
  });

  // Auto-scroll al final cuando se añade un nuevo mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Auto-ajusta la altura del campo de entrada según el texto del usuario (máximo 120px)
  const adjustTextareaHeight = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(el.scrollHeight, 120);
    el.style.height = `${nextHeight}px`;
  };

  const handleInputChange = (val: string) => {
    setInputText(val.slice(0, 1000));
    adjustTextareaHeight();
  };

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isGenerating) return;

    sendMessage(trimmed);
    setInputText("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectSuggested = (question: string) => {
    setInputText(question);
    if (inputRef.current) {
      inputRef.current.focus();
      setTimeout(adjustTextareaHeight, 0);
    }
  };

  const activeCoin = selectedCoin || (coins.length > 0 ? coins[0] : null);

  return (
    <div className="flex-1 flex flex-col h-[calc(100dvh-5rem)] sm:h-[calc(100vh-140px)] sm:min-h-[600px] w-full max-w-full space-y-2 sm:space-y-4 animate-fade-in min-h-0">
      {/* 1. Encabezado compacto y optimizado para móvil */}
      <div className="flex items-center justify-between gap-2 pb-2 sm:pb-3 border-b border-crypto-border flex-shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap sm:flex-nowrap">
            <h2 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-crypto-text tracking-tight flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="text-crypto-accent">✦</span>
              <span>AI Crypto Analyst</span>
            </h2>

            {status?.isConfigured ? (
              <StatusBadge variant="live">Gemini API</StatusBadge>
            ) : (
              <StatusBadge variant="neutral">Configuración Pendiente</StatusBadge>
            )}

            <span className="hidden xs:inline-block text-[11px] sm:text-xs font-mono px-2 py-0.5 rounded bg-crypto-primary-soft text-crypto-accent border border-crypto-accent/20">
              {status?.model || "gemini-2.5-flash"}
            </span>
          </div>
          <p className="hidden sm:block text-xs sm:text-sm text-crypto-text-secondary mt-1">
            Asistente analítico inteligente fundamentado exclusivamente en datos de mercado verificados.
          </p>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={clearConversation}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-text-secondary hover:text-crypto-text border border-crypto-border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            title="Reiniciar conversación y borrar historial de la sesión"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3.5 h-3.5 flex-shrink-0"
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
            <span className="hidden sm:inline">Nueva Conversación</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Contexto de Mercado Activo */}
      <div className="bg-crypto-surface border border-crypto-border rounded-lg sm:rounded-xl p-2 sm:p-3 flex items-center justify-between gap-2 text-xs flex-shrink-0">
        {/* Activo de contexto */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
          <span className="hidden sm:inline text-crypto-text-muted font-mono uppercase text-[10px] flex-shrink-0">
            Contexto Activo:
          </span>
          {activeCoin ? (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-crypto-surface-raised px-2 sm:px-2.5 py-1 rounded-lg border border-crypto-border/60 max-w-full min-w-0">
              {activeCoin.image && (
                <img
                  src={activeCoin.image}
                  alt={activeCoin.name}
                  className="w-4 h-4 rounded-full object-contain flex-shrink-0"
                />
              )}
              <span className="font-bold text-crypto-text truncate max-w-[80px] xs:max-w-[120px] sm:max-w-none">
                {activeCoin.name}
              </span>
              <span className="text-crypto-text-muted uppercase font-mono text-[10px] flex-shrink-0">
                {activeCoin.symbol}
              </span>
              <span className="font-mono text-crypto-accent whitespace-nowrap flex-shrink-0 text-[11px] sm:text-xs">
                {formatCurrency(activeCoin.current_price)}
              </span>
            </div>
          ) : (
            <span className="text-crypto-text-muted">Ningún activo fijado</span>
          )}

          {coins.length > 1 && onSelectCoin && (
            <select
              aria-label="Cambiar criptomoneda de contexto"
              value={activeCoin?.id || ""}
              onChange={(e) => {
                const found = coins.find((c) => c.id === e.target.value);
                if (found) onSelectCoin(found);
              }}
              className="bg-crypto-surface-raised text-crypto-text text-xs rounded border border-crypto-border px-1.5 sm:px-2 py-1 focus:outline-none focus:border-crypto-primary font-mono max-w-[100px] sm:max-w-none truncate"
            >
              {coins.slice(0, 15).map((c) => (
                <option key={c.id} value={c.id}>
                  {`${c.name} (${c.symbol.toUpperCase()})`}
                </option>
              ))}
            </select>
          )}

          {onNavigateToMarkets && (
            <button
              type="button"
              onClick={onNavigateToMarkets}
              className="text-crypto-accent hover:underline text-[11px] font-mono hidden md:inline whitespace-nowrap"
            >
              Explorar mercados →
            </button>
          )}
        </div>

        {/* Toggle de Inclusión de Cartera */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none text-crypto-text-secondary hover:text-crypto-text transition-colors">
            <input
              type="checkbox"
              checked={includePortfolio}
              onChange={(e) => setIncludePortfolio(e.target.checked)}
              className="rounded bg-crypto-surface-raised border-crypto-border text-crypto-primary focus:ring-0 focus:outline-none cursor-pointer"
            />
            <span className="text-xs hidden md:inline">Incluir resumen de mi cartera</span>
            <span className="text-xs md:hidden">Mi cartera</span>
          </label>
        </div>
      </div>

      {/* Aviso informativo si se incluye cartera */}
      {includePortfolio && (
        <div className="p-2 sm:p-2.5 rounded-lg bg-crypto-primary-soft/40 border border-crypto-primary/30 text-[11px] text-crypto-text-secondary flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span>🛡️</span>
            <span>
              <strong className="text-crypto-text">Privacidad garantizada:</strong>{" "}
              <span className="hidden sm:inline">
                Se adjuntará únicamente un resumen anónimo (valoración global, P&L latente y reparto por activos). No se envían transacciones individuales ni notas.
              </span>
              <span className="sm:hidden">
                Resumen anónimo de métricas y reparto adjunto. Sin transacciones ni notas.
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIncludePortfolio(false)}
            className="text-crypto-accent hover:underline text-[10px] font-mono flex-shrink-0"
          >
            Desactivar
          </button>
        </div>
      )}

      {/* 3. Aviso si falta la clave de Gemini en el servidor */}
      {!isLoadingStatus && status && !status.isConfigured && (
        <div className="p-3 sm:p-4 rounded-xl bg-crypto-warning/10 border border-crypto-warning/30 text-xs text-crypto-text flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <span className="text-xl">⚙️</span>
            <div>
              <strong className="text-crypto-warning font-semibold block text-sm">
                Configuración de Gemini API pendiente
              </strong>
              <p className="text-crypto-text-secondary mt-0.5 leading-relaxed text-xs">
                Para interactuar con el AI Crypto Analyst, añade tu clave gratuita en el archivo{" "}
                <code className="text-crypto-accent font-mono">.env</code> del proyecto como{" "}
                <code className="text-crypto-accent font-mono">GEMINI_API_KEY=tu_clave</code> y reinicia el servidor.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-crypto-primary hover:bg-crypto-primary-hover text-white text-xs font-semibold transition-colors"
            >
              Obtener clave gratuita ↗
            </a>
            <button
              type="button"
              onClick={checkStatus}
              className="px-3 py-1.5 rounded-lg bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-text-secondary text-xs transition-colors border border-crypto-border"
            >
              Comprobar de nuevo
            </button>
          </div>
        </div>
      )}

      {/* 4. Contenedor de Mensajes de Conversación */}
      <div className="flex-1 bg-crypto-surface border border-crypto-border rounded-xl p-2.5 sm:p-5 md:p-6 overflow-y-auto space-y-3.5 sm:space-y-4 min-h-0 overscroll-contain">
        {messages.map((message) => (
          <AiMessageItem key={message.id} message={message} />
        ))}

        {/* Indicador de Generación en Curso */}
        {isGenerating && (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-crypto-surface-raised/70 border border-crypto-primary/30 animate-pulse text-xs text-crypto-text-secondary">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-crypto-accent animate-ping" />
              <span>Analizando datos de mercado con Gemini...</span>
            </div>
            <button
              type="button"
              onClick={cancelGeneration}
              className="px-2.5 py-1 rounded bg-crypto-surface hover:bg-crypto-surface-hover text-crypto-negative border border-crypto-negative/30 text-[11px] font-mono transition-colors"
            >
              Detener análisis
            </button>
          </div>
        )}

        {/* Banner de Error con opción de reintento o modo degradado */}
        {error && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-crypto-negative-soft/30 border border-crypto-negative/30 text-xs text-crypto-text">
            <div className="flex items-center gap-2">
              <span className="text-crypto-negative flex-shrink-0">⚠️</span>
              <span className="text-crypto-negative leading-relaxed">{error.message}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  void loadDegradedMode();
                }}
                className="px-2.5 py-1 rounded-lg bg-crypto-surface hover:bg-crypto-surface-hover text-crypto-warning border border-crypto-warning/30 text-[11px] font-mono transition-colors"
                title="Generar resumen cuantitativo con datos verificados de la terminal"
              >
                Ver datos (Modo Degradado)
              </button>
              <button
                type="button"
                onClick={() => {
                  void retryLastMessage();
                }}
                className="px-3 py-1 rounded-lg bg-crypto-negative/20 hover:bg-crypto-negative/30 text-crypto-negative border border-crypto-negative/40 text-[11px] font-mono transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 5. Preguntas Sugeridas */}
      <div className="flex-shrink-0">
        <AiSuggestedQuestions
          onSelectQuestion={handleSelectSuggested}
          selectedCoin={activeCoin}
          disabled={isGenerating}
          hasPortfolio={Boolean(portfolioSummary && portfolioSummary.positionCount > 0)}
        />
      </div>

      {/* 6. Formulario de Entrada */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 space-y-1.5 pb-[max(0px,env(safe-area-inset-bottom))]">
        <div className="bg-crypto-surface border border-crypto-border rounded-xl shadow-lg focus-within:border-crypto-primary transition-colors flex items-end p-1.5 sm:p-2 gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder={
              status?.isConfigured
                ? "Haz una pregunta sobre tendencias, volumen o activos..."
                : "Configura GEMINI_API_KEY para habilitar consultas interactivas..."
            }
            className="flex-1 bg-transparent text-crypto-text text-base p-2 sm:p-2.5 focus:outline-none resize-none placeholder:text-crypto-text-muted min-h-[42px] max-h-[120px] leading-relaxed"
          />

          <div className="flex items-center gap-1.5 sm:gap-2 pb-1 pr-1 flex-shrink-0">
            <span className="text-[10px] font-mono text-crypto-text-muted select-none hidden xs:inline">
              {inputText.length}/1000
            </span>
            <button
              type="submit"
              disabled={isGenerating || !inputText.trim() || !status?.isConfigured}
              className="w-10 h-10 rounded-lg bg-crypto-primary hover:bg-crypto-primary-hover active:bg-crypto-primary-hover text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-crypto-primary/20 flex-shrink-0"
              title="Enviar consulta al analista"
              aria-label="Enviar consulta"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 transform rotate-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Aviso de Responsabilidad Financiera */}
        <p className="text-[10px] text-crypto-text-muted text-center font-mono leading-tight">
          La inteligencia artificial puede cometer errores. Contrasta siempre con cotizaciones oficiales. No es
          asesoramiento de inversión.
        </p>
      </form>
    </div>
  );
};
