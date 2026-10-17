import type { FC } from "react";
import type { TimeRangeDays } from "../../types/crypto";

export interface TimeframeOption {
  days: TimeRangeDays;
  label: string;
  tooltip: string;
}

const TIMEFRAME_OPTIONS: readonly TimeframeOption[] = [
  { days: 1, label: "24H", tooltip: "Últimas 24 horas (intervalos de ~5 min)" },
  { days: 7, label: "7D", tooltip: "Últimos 7 días (intervalos de ~1 h)" },
  { days: 30, label: "30D", tooltip: "Últimos 30 días (intervalos de ~1 h)" },
  { days: 90, label: "90D", tooltip: "Últimos 90 días (intervalos diarios)" },
  { days: 365, label: "1A", tooltip: "Último año (intervalos diarios)" },
] as const;

interface TimeframeSelectorProps {
  selectedDays: TimeRangeDays;
  onSelectDays: (days: TimeRangeDays) => void;
  disabled?: boolean;
}

export const TimeframeSelector: FC<TimeframeSelectorProps> = ({
  selectedDays,
  onSelectDays,
  disabled = false,
}) => {
  return (
    <div
      role="group"
      aria-label="Selector de rango temporal del gráfico"
      className="inline-flex items-center gap-1 bg-crypto-surface-raised p-1 rounded-lg border border-crypto-border text-xs font-mono"
    >
      {TIMEFRAME_OPTIONS.map((option) => {
        const isActive = selectedDays === option.days;
        return (
          <button
            key={`timeframe-${option.days}`}
            type="button"
            onClick={() => onSelectDays(option.days)}
            disabled={disabled}
            title={option.tooltip}
            aria-pressed={isActive}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 ${
              isActive
                ? "bg-crypto-primary text-white shadow-sm"
                : "text-crypto-text-secondary hover:text-crypto-text hover:bg-crypto-surface-hover/80"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
