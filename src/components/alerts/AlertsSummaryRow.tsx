import type { FC } from "react";
import { MetricCard } from "../ui/MetricCard.tsx";

interface AlertsSummaryRowProps {
  totalCount: number;
  activeCount: number;
  triggeredCount: number;
  inactiveCount: number;
}

export const AlertsSummaryRow: FC<AlertsSummaryRowProps> = ({
  totalCount,
  activeCount,
  triggeredCount,
  inactiveCount,
}) => {
  // Distribución responsive adaptada: 1 col móvil pequeño, 2 cols tablet/laptop, 4 cols desktop amplio
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Total Alertas */}
      <MetricCard
        label="Total Alertas"
        value={String(totalCount)}
        subValue={<span>Registradas localmente</span>}
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        }
      />

      {/* Alertas Activas */}
      <MetricCard
        label="Alertas Activas"
        value={String(activeCount)}
        subValue={<span>Monitorización en vivo</span>}
        accentColor="primary"
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-crypto-positive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
      />

      {/* Alertas Disparadas */}
      <MetricCard
        label="Alertas Disparadas"
        value={String(triggeredCount)}
        subValue={<span>Condición alcanzada</span>}
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-crypto-warning"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        }
      />

      {/* Alertas Pausadas / Inactivas */}
      <MetricCard
        label="Alertas Pausadas"
        value={String(inactiveCount)}
        subValue={<span>Desactivadas por usuario</span>}
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-crypto-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      />
    </div>
  );
};
