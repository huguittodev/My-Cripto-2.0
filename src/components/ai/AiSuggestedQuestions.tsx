import type { FC } from "react";
import type { Cryptocurrency } from "../../types/crypto";

interface AiSuggestedQuestionsProps {
  onSelectQuestion: (question: string) => void;
  selectedCoin: Cryptocurrency | null;
  disabled?: boolean;
  hasPortfolio?: boolean;
}

export const AiSuggestedQuestions: FC<AiSuggestedQuestionsProps> = ({
  onSelectQuestion,
  selectedCoin,
  disabled = false,
  hasPortfolio = false,
}) => {
  const coinName = selectedCoin?.name || "Bitcoin";

  const suggestions = [
    `Analiza el mercado actual de ${coinName}`,
    "Compara Bitcoin y Ethereum con los datos disponibles",
    "Explícame qué significa el volumen de negociación de este activo",
    `Resume la evolución de ${coinName} durante los últimos siete días`,
  ];

  if (hasPortfolio) {
    suggestions.push("Analiza la distribución de mi cartera respecto al mercado");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <span className="text-[11px] font-mono text-crypto-text-muted flex items-center gap-1">
        <span>💡</span>
        <span>Sugerencias:</span>
      </span>
      {suggestions.map((q, idx) => (
        <button
          key={idx}
          type="button"
          disabled={disabled}
          onClick={() => onSelectQuestion(q)}
          className="text-[11px] px-3 py-1 rounded-full bg-crypto-surface-raised hover:bg-crypto-surface-hover hover:border-crypto-accent/40 text-crypto-text-secondary hover:text-crypto-text border border-crypto-border transition-all disabled:opacity-50 text-left"
        >
          {q}
        </button>
      ))}
    </div>
  );
};
