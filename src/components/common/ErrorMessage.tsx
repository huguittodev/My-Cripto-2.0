import type { FC } from "react";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  title?: string;
}

export const ErrorMessage: FC<ErrorMessageProps> = ({
  message,
  onRetry,
  title = "Error al obtener datos del mercado",
}) => {
  return (
    <div className="bg-crypto-surface p-6 rounded-xl border border-crypto-negative/30 max-w-2xl mx-auto my-6 text-center shadow-lg shadow-red-950/20">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-crypto-negative-soft text-crypto-negative mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h3 className="text-base font-semibold text-crypto-text mb-1">
        {title}
      </h3>
      <p className="text-sm text-crypto-text-secondary mb-5 max-w-lg mx-auto">
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-crypto-surface-hover hover:bg-crypto-surface-raised text-crypto-text text-sm font-medium rounded-lg border border-crypto-border transition-colors focus:outline-none focus:ring-2 focus:ring-crypto-primary/40"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
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
          Reintentar consulta
        </button>
      )}
    </div>
  );
};
