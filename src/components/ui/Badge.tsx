import type { ReactNode } from "react";
import { formatPercentage } from "../../utils/formatters.ts";

interface VariationBadgeProps {
  value: number;
  size?: "sm" | "md" | "lg";
}

/**
 * Badge sobrio para mostrar variaciones porcentuales financieras.
 * El color verde/rojo se usa exclusivamente para variación de precio.
 */
export const VariationBadge = ({
  value,
  size = "md",
}: VariationBadgeProps) => {
  const isPositive = value > 0;
  const isNegative = value < 0;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs font-semibold px-2.5 py-1",
    lg: "text-sm font-bold px-3 py-1.5",
  }[size];

  const colorClasses = isPositive
    ? "bg-crypto-positive-soft text-crypto-positive border border-crypto-positive/25"
    : isNegative
      ? "bg-crypto-negative-soft text-crypto-negative border border-crypto-negative/25"
      : "bg-crypto-surface-raised text-crypto-text-secondary border border-crypto-border";

  // Garantiza que el badge de variación porcentual se mantenga como unidad indivisible
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-mono tabular-nums leading-none transition-colors whitespace-nowrap flex-shrink-0 select-none ${sizeClasses} ${colorClasses}`}
    >
      <span className="text-[10px] flex-shrink-0">
        {isPositive ? "▲" : isNegative ? "▼" : "•"}
      </span>
      <span className="whitespace-nowrap">{formatPercentage(value)}</span>
    </span>
  );
};

interface StatusBadgeProps {
  variant?: "live" | "neutral" | "accent" | "upcoming" | "info";
  children: ReactNode;
}

/**
 * Badge informativo para estados de sistema, fases o tags.
 */
export const StatusBadge = ({
  variant = "neutral",
  children,
}: StatusBadgeProps) => {
  const variantClasses = {
    live: "bg-crypto-positive-soft text-crypto-positive border border-crypto-positive/25",
    neutral: "bg-crypto-surface-raised text-crypto-text-secondary border border-crypto-border",
    accent: "bg-crypto-primary-soft text-crypto-accent border border-crypto-accent/25",
    upcoming: "bg-crypto-surface-hover text-crypto-text-muted border border-crypto-border/60 text-[10px] uppercase tracking-wider",
    info: "bg-sky-500/10 text-crypto-info border border-crypto-info/20",
  }[variant];

  // Insignia de estado compacta indivisible
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium leading-none whitespace-nowrap flex-shrink-0 select-none ${variantClasses}`}
    >
      {variant === "live" && (
        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crypto-positive opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-crypto-positive"></span>
        </span>
      )}
      <span className="whitespace-nowrap">{children}</span>
    </span>
  );
};
