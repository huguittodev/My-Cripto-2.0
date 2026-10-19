import { useState } from "react";
import type { FC } from "react";
import type { PriceAlert } from "../../types/crypto";
import { formatCurrency, formatDateTime } from "../../utils/formatters.ts";
import { StatusBadge } from "../ui/Badge.tsx";

interface AlertCardProps {
  alert: PriceAlert;
  currentPrice: number | null;
  onEdit: (alert: PriceAlert) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export const AlertCard: FC<AlertCardProps> = ({
  alert,
  currentPrice,
  onEdit,
  onDelete,
  onToggle,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isGte = alert.condition === "gte";
  const conditionIcon = isGte ? "📈" : "📉";
  const conditionText = isGte ? "Mayor o igual (≥)" : "Menor o igual (≤)";

  // Cálculo de distancia porcentual hacia el objetivo de cotización
  let distanceText: string | null = null;
  let isDistancePositive = true;

  if (currentPrice !== null && currentPrice > 0) {
    const diffPct = ((alert.targetPrice - currentPrice) / currentPrice) * 100;

    if (alert.status === "triggered") {
      distanceText = "Objetivo cumplido";
    } else if (isGte) {
      if (currentPrice >= alert.targetPrice) {
        distanceText = "Objetivo alcanzado";
      } else {
        distanceText = `A +${diffPct.toFixed(2)}% del precio actual`;
      }
    } else {
      if (currentPrice <= alert.targetPrice) {
        distanceText = "Objetivo alcanzado";
        isDistancePositive = false;
      } else {
        distanceText = `A ${diffPct.toFixed(2)}% del precio actual`;
        isDistancePositive = false;
      }
    }
  }

  return (
    <div
      className={`bg-crypto-surface border rounded-xl p-4 sm:p-5 transition-all flex flex-col justify-between gap-4 ${
        alert.status === "active"
          ? "border-crypto-border hover:border-crypto-primary/40 shadow-sm"
          : alert.status === "triggered"
          ? "border-crypto-warning/40 bg-crypto-surface/90 shadow-sm"
          : "border-crypto-border/50 opacity-75"
      }`}
    >
      {/* 1. Encabezado del Activo y Estado */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {alert.coinImage ? (
            <img
              src={alert.coinImage}
              alt={alert.coinName}
              className="w-9 h-9 rounded-full bg-crypto-surface-raised p-0.5 object-contain"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-crypto-primary-soft flex items-center justify-center font-bold text-xs text-crypto-accent">
              {alert.coinSymbol.slice(0, 3).toUpperCase()}
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-crypto-text tracking-tight">{alert.coinName}</h3>
              <span className="text-[10px] font-mono font-bold text-crypto-text-muted px-1.5 py-0.5 rounded bg-crypto-surface-raised border border-crypto-border uppercase">
                {alert.coinSymbol}
              </span>
            </div>
            <span className="text-[11px] text-crypto-text-muted font-mono block mt-0.5">
              Creada el {formatDateTime(alert.createdAt, false)}
            </span>
          </div>
        </div>

        {/* Badge de Estado */}
        <div className="flex-shrink-0">
          {alert.status === "active" && <StatusBadge variant="live">Activa</StatusBadge>}
          {alert.status === "triggered" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-crypto-warning/15 text-crypto-warning border border-crypto-warning/30 whitespace-nowrap flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-crypto-warning animate-pulse flex-shrink-0" />
              Disparada
            </span>
          )}
          {alert.status === "inactive" && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-crypto-surface-raised text-crypto-text-muted border border-crypto-border whitespace-nowrap flex-shrink-0">
              Pausada
            </span>
          )}
        </div>
      </div>

      {/* 2. Cuerpo: Precio Objetivo vs Precio de Mercado */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-crypto-surface-raised/70 border border-crypto-border/50 text-xs font-mono">
        <div>
          <span className="text-[10px] text-crypto-text-muted block uppercase tracking-wider whitespace-nowrap">
            Condición y Objetivo
          </span>
          <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-crypto-text whitespace-nowrap">
            <span className="flex-shrink-0">{conditionIcon}</span>
            <span className="text-crypto-accent whitespace-nowrap">
              {formatCurrency(alert.targetPrice, alert.currency.toUpperCase())}
            </span>
          </div>
          <span className="text-[10px] text-crypto-text-muted block mt-0.5 whitespace-nowrap">
            {conditionText}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-crypto-text-muted block uppercase tracking-wider whitespace-nowrap">
            Cotización Actual
          </span>
          <div className="font-bold text-sm text-crypto-text mt-1 whitespace-nowrap">
            {currentPrice !== null ? formatCurrency(currentPrice, alert.currency.toUpperCase()) : "—"}
          </div>
          {distanceText && (
            <span
              className={`text-[10px] block mt-0.5 font-medium whitespace-nowrap ${
                alert.status === "triggered"
                  ? "text-crypto-warning font-semibold"
                  : isDistancePositive
                  ? "text-crypto-positive"
                  : "text-crypto-negative"
              }`}
            >
              {distanceText}
            </span>
          )}
        </div>
      </div>

      {/* 3. Información de Disparo o Notas */}
      {alert.status === "triggered" && alert.triggeredAt && (
        <div className="p-2.5 rounded-lg bg-crypto-warning/10 border border-crypto-warning/20 text-xs text-crypto-warning flex items-start gap-2">
          <span className="flex-shrink-0">🚨</span>
          <div className="flex-1">
            <span className="font-semibold block">Alerta activada:</span>
            <span className="text-[11px] opacity-90 block">
              Registrado el {formatDateTime(alert.triggeredAt)} con precio observado de{" "}
              <strong className="whitespace-nowrap">
                {alert.triggeredPrice !== undefined
                  ? formatCurrency(alert.triggeredPrice, alert.currency.toUpperCase())
                  : "—"}
              </strong>.
            </span>
          </div>
        </div>
      )}

      {alert.notes && (
        <div className="text-xs text-crypto-text-secondary bg-crypto-surface-raised/40 px-3 py-1.5 rounded-lg border border-crypto-border/40 italic">
          "{alert.notes}"
        </div>
      )}

      {/* 4. Acciones y Controles */}
      <div className="flex items-center justify-between pt-2 border-t border-crypto-border/60">
        <div className="flex items-center gap-2">
          {/* Botón Activar / Pausar / Rearmar */}
          <button
            type="button"
            onClick={() => onToggle(alert.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors border ${
              alert.status === "active"
                ? "bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-text-secondary hover:text-crypto-text border-crypto-border"
                : alert.status === "triggered"
                ? "bg-crypto-primary hover:bg-crypto-primary-hover text-white border-crypto-primary shadow-sm"
                : "bg-crypto-positive-soft hover:bg-crypto-positive text-crypto-positive hover:text-white border-crypto-positive/30"
            }`}
          >
            {alert.status === "active"
              ? "Pausar"
              : alert.status === "triggered"
              ? "↻ Rearmar Alerta"
              : "▶ Activar"}
          </button>

          {/* Botón Editar */}
          <button
            type="button"
            onClick={() => onEdit(alert)}
            className="p-1.5 rounded-lg text-crypto-text-secondary hover:text-crypto-text hover:bg-crypto-surface-raised transition-colors border border-crypto-border"
            title="Editar umbrales o notas de la alerta"
            aria-label="Editar alerta"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
        </div>

        {/* Botón y Diálogo de Confirmación de Eliminación */}
        <div>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <button
                type="button"
                onClick={() => {
                  onDelete(alert.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-2 py-1 rounded bg-crypto-negative text-white text-[10px] font-bold shadow-sm"
              >
                Eliminar
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 rounded bg-crypto-surface-raised text-crypto-text-secondary text-[10px]"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg text-crypto-text-muted hover:text-crypto-negative hover:bg-crypto-surface-raised transition-colors"
              title="Eliminar alerta"
              aria-label="Eliminar alerta"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
