import type { FC } from "react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export const LoadingSpinner: FC<LoadingSpinnerProps> = ({
  message = "Consultando datos de mercado en tiempo real...",
  size = "md",
}) => {
  const spinnerSizes = {
    sm: "w-5 h-5 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-3",
  }[size];

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center animate-fade-in">
      <div
        className={`${spinnerSizes} rounded-full border-crypto-border border-t-crypto-primary animate-spin mb-4`}
      />
      <p className="text-sm font-medium text-crypto-text-secondary">{message}</p>
      <span className="text-xs text-crypto-text-muted mt-1">
        Conexión directa con la API de CoinGecko
      </span>
    </div>
  );
};
