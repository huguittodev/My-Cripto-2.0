import { useEffect } from "react";
import type { FC } from "react";
import type { NotificationToast } from "../../types/crypto";
import { formatCurrency, formatDateTime } from "../../utils/formatters.ts";

interface ToastItemProps {
  toast: NotificationToast;
  onDismiss: (id: string) => void;
  onNavigateToAlerts?: () => void;
}

const ToastItem: FC<ToastItemProps> = ({ toast, onDismiss, onNavigateToAlerts }) => {
  // Cierre automático tras 7 segundos para no saturar la pantalla
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 7000);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isGte = toast.condition === "gte";
  const conditionLabel = isGte ? "Alcanzó o superó" : "Cayó a o por debajo de";
  const conditionIcon = isGte ? "📈" : "📉";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="pointer-events-auto bg-crypto-surface border border-crypto-primary/50 shadow-2xl shadow-crypto-primary/20 rounded-xl p-4 flex flex-col gap-2.5 backdrop-blur-md animate-fade-in transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {toast.coinImage ? (
            <img
              src={toast.coinImage}
              alt={toast.coinName}
              className="w-8 h-8 rounded-full bg-crypto-surface-raised p-0.5 object-contain"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-crypto-primary-soft flex items-center justify-center font-bold text-xs text-crypto-accent">
              {toast.coinSymbol.slice(0, 3).toUpperCase()}
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-crypto-text">{toast.coinName}</span>
              <span className="text-[10px] font-mono text-crypto-text-muted uppercase">
                {toast.coinSymbol}
              </span>
            </div>
            <span className="text-[10px] text-crypto-text-muted font-mono block">
              {formatDateTime(toast.timestamp)}
            </span>
          </div>
        </div>

        {/* Botón de cierre */}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="text-crypto-text-muted hover:text-crypto-text p-1 rounded-md hover:bg-crypto-surface-raised transition-colors"
          aria-label="Cerrar notificación"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Cuerpo del mensaje */}
      <div className="text-xs text-crypto-text-secondary bg-crypto-surface-raised/70 p-2.5 rounded-lg border border-crypto-border/50">
        <div className="flex items-center gap-1.5 font-medium text-crypto-text mb-1">
          <span>{conditionIcon}</span>
          <span>
            {conditionLabel}:{" "}
            <strong className="text-crypto-accent font-mono">
              {formatCurrency(toast.targetPrice, toast.currency.toUpperCase())}
            </strong>
          </span>
        </div>
        <div className="text-[11px] font-mono text-crypto-text-muted">
          Precio observado:{" "}
          <span className="text-crypto-text font-semibold">
            {formatCurrency(toast.observedPrice, toast.currency.toUpperCase())}
          </span>
        </div>
      </div>

      {/* Acción para navegar directamente a la lista de alertas */}
      {onNavigateToAlerts && (
        <div className="flex justify-end pt-0.5">
          <button
            type="button"
            onClick={() => {
              onDismiss(toast.id);
              onNavigateToAlerts();
            }}
            className="text-[11px] font-semibold text-crypto-accent hover:text-crypto-accent-strong hover:underline flex items-center gap-1"
          >
            <span>Ver mis alertas</span>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
};

interface ToastContainerProps {
  toasts: NotificationToast[];
  onDismiss: (id: string) => void;
  onNavigateToAlerts?: () => void;
}

export const ToastContainer: FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  onNavigateToAlerts,
}) => {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onNavigateToAlerts={onNavigateToAlerts}
        />
      ))}
    </div>
  );
};
