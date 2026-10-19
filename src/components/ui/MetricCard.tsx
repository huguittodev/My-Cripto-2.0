import type { FC, ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  tooltip?: string;
  accentColor?: "primary" | "accent" | "violet" | "cyan" | "default";
}

export const MetricCard: FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  icon,
  badge,
  tooltip,
  accentColor = "default",
}) => {
  const accentBorder = {
    primary: "hover:border-crypto-primary/60",
    accent: "hover:border-crypto-accent/60",
    violet: "hover:border-crypto-primary/60",
    cyan: "hover:border-crypto-accent/60",
    default: "hover:border-crypto-border-hover",
  }[accentColor];

  return (
    <div
      className={`bg-crypto-surface p-4 sm:p-5 rounded-xl border border-crypto-border transition-all duration-200 shadow-sm ${accentBorder} flex flex-col justify-between`}
      title={tooltip}
    >
      {/* Cabecera de la tarjeta con truncado seguro de etiqueta y protección de badges */}
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
        <span className="text-xs font-medium text-crypto-text-secondary uppercase tracking-wider truncate min-w-0">
          {label}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {badge}
          {icon && (
            <span className="text-crypto-text-muted text-sm">{icon}</span>
          )}
        </div>
      </div>

      {/* Cifra financiera principal: preserva número, signo y unidad en una sola línea */}
      <div className="my-1 overflow-hidden">
        <div className="text-xl sm:text-2xl font-mono font-bold text-crypto-text tracking-tight tabular-nums whitespace-nowrap truncate">
          {value}
        </div>
      </div>

      {subValue && (
        <div className="mt-2 text-xs text-crypto-text-muted flex items-center gap-2">
          {subValue}
        </div>
      )}
    </div>
  );
};
