import { useState, useMemo } from "react";
import type { FC } from "react";
import type { PriceAlert, Cryptocurrency, CryptoList } from "../../types/crypto";
import { useAlerts } from "../../hooks/useAlerts.ts";
import { AlertsSummaryRow } from "./AlertsSummaryRow.tsx";
import { AlertCard } from "./AlertCard.tsx";
import { AlertModal } from "./AlertModal.tsx";
import { StatusBadge } from "../ui/Badge.tsx";

interface AlertsViewProps {
  onNavigateToMarkets?: () => void;
  initialCoins?: CryptoList;
  preselectedCoin?: Cryptocurrency | null;
}

type AlertFilterTab = "all" | "active" | "triggered" | "inactive";

export const AlertsView: FC<AlertsViewProps> = ({
  onNavigateToMarkets,
  initialCoins = [],
  preselectedCoin = null,
}) => {
  const {
    alerts,
    activeAlerts,
    triggeredAlerts,
    inactiveAlerts,
    activeAlertsCount,
    triggeredAlertsCount,
    currentPrices,
    isLoadingPrices,
    priceError,
    browserPermission,
    isNotificationSupported,
    addAlert,
    updateAlert,
    deleteAlert,
    toggleAlert,
    clearAlerts,
    refreshPrices,
    requestNotificationPermission,
  } = useAlerts({ externalCoins: initialCoins });

  const [activeTab, setActiveTab] = useState<AlertFilterTab>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);
  const [targetCoinForNew, setTargetCoinForNew] = useState<Cryptocurrency | null>(preselectedCoin);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Manejo de apertura del modal
  const handleOpenCreateModal = (coin?: Cryptocurrency | null) => {
    setEditingAlert(null);
    setTargetCoinForNew(coin || preselectedCoin || (initialCoins[0] ?? null));
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (alert: PriceAlert) => {
    setEditingAlert(alert);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAlert(null);
  };

  // Filtrado de alertas según pestaña y término de búsqueda
  const filteredAlerts = useMemo(() => {
    let list: PriceAlert[] = alerts;

    if (activeTab === "active") {
      list = activeAlerts;
    } else if (activeTab === "triggered") {
      list = triggeredAlerts;
    } else if (activeTab === "inactive") {
      list = inactiveAlerts;
    }

    const term = searchTerm.trim().toLowerCase();
    if (!term) return list;

    return list.filter(
      (a) =>
        a.coinName.toLowerCase().includes(term) ||
        a.coinSymbol.toLowerCase().includes(term) ||
        a.coinId.toLowerCase().includes(term) ||
        (a.notes && a.notes.toLowerCase().includes(term)),
    );
  }, [activeAlerts, activeTab, alerts, inactiveAlerts, searchTerm, triggeredAlerts]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Encabezado de la Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-crypto-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-crypto-text tracking-tight">
              Alertas de Precio
            </h2>
            <StatusBadge variant="live">Motor Local</StatusBadge>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-crypto-primary-soft text-crypto-accent border border-crypto-accent/20">
              {activeAlertsCount} activas
            </span>
          </div>
          <p className="text-xs sm:text-sm text-crypto-text-secondary mt-1">
            Configuración y monitorización de umbrales técnicos de cotización con notificaciones inmediatas.
          </p>
        </div>

        {/* Acciones principales del encabezado */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón de sincronización de precios */}
          <button
            type="button"
            onClick={() => refreshPrices()}
            disabled={isLoadingPrices}
            className="px-3 py-2 rounded-lg bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-text-secondary hover:text-crypto-text border border-crypto-border text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Refrescar cotizaciones para la evaluación de alertas"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-3.5 h-3.5 ${isLoadingPrices ? "animate-spin text-crypto-accent" : ""}`}
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
            <span>{isLoadingPrices ? "Evaluando..." : "Actualizar"}</span>
          </button>

          {/* Botón de permisos de notificaciones del navegador */}
          {isNotificationSupported && (
            <>
              {browserPermission === "granted" ? (
                <span className="px-3 py-2 rounded-lg bg-crypto-positive-soft text-crypto-positive border border-crypto-positive/30 text-xs font-semibold flex items-center gap-1.5">
                  <span>🔔</span>
                  <span className="hidden md:inline">Avisos web activos</span>
                </span>
              ) : browserPermission === "denied" ? (
                <span
                  className="px-3 py-2 rounded-lg bg-crypto-surface-raised text-crypto-text-muted border border-crypto-border text-xs flex items-center gap-1.5"
                  title="Las notificaciones están bloqueadas en la configuración de tu navegador"
                >
                  <span>🔕</span>
                  <span className="hidden md:inline">Avisos bloqueados</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => requestNotificationPermission()}
                  className="px-3 py-2 rounded-lg bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-accent border border-crypto-primary/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Habilita notificaciones del sistema operativo mientras My Crypto 2.0 esté abierto"
                >
                  <span>🔔</span>
                  <span>Permitir avisos</span>
                </button>
              )}
            </>
          )}

          {/* Botón Crear Alerta */}
          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2 rounded-lg bg-crypto-primary hover:bg-crypto-primary-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-crypto-primary/20 transition-all"
          >
            <span>+</span>
            <span>Nueva Alerta</span>
          </button>
        </div>
      </div>

      {/* 2. Banner de Transparencia y Limitaciones de la Versión Actual */}
      <div className="bg-crypto-surface/70 border border-crypto-border/80 rounded-xl p-3.5 text-xs text-crypto-text-secondary flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-crypto-accent flex-shrink-0 text-base">ℹ️</span>
          <span>
            <strong className="text-crypto-text font-medium">Evaluación en tiempo real:</strong> Las alertas se
            comprueban periódicamente contra los precios de CoinGecko mientras la aplicación permanezca abierta. No se
            garantizan avisos con el navegador cerrado hasta la futura versión con backend.
          </span>
        </div>

        {alerts.length > 0 && (
          <div className="flex-shrink-0">
            {showClearConfirm ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    clearAlerts();
                    setShowClearConfirm(false);
                  }}
                  className="px-2 py-1 rounded bg-crypto-negative text-white text-[10px] font-bold"
                >
                  Confirmar vaciado
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-1 rounded bg-crypto-surface-raised text-crypto-text-secondary text-[10px]"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="text-[11px] text-crypto-text-muted hover:text-crypto-negative hover:underline font-mono"
              >
                Vaciar todas
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Aviso de error en consulta de precios */}
      {priceError && (
        <div className="p-3 rounded-xl bg-crypto-warning/10 border border-crypto-warning/30 text-xs text-crypto-warning flex items-center justify-between gap-2">
          <span>⚠️ {priceError}</span>
          <button
            type="button"
            onClick={() => refreshPrices()}
            className="underline font-semibold hover:text-white"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* 4. Métricas Resumen */}
      <section aria-label="Resumen de Alertas">
        <AlertsSummaryRow
          totalCount={alerts.length}
          activeCount={activeAlertsCount}
          triggeredCount={triggeredAlertsCount}
          inactiveCount={inactiveAlerts.length}
        />
      </section>

      {/* 5. Controles de Filtrado y Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Pestañas de Estado */}
        <div className="flex items-center gap-2 border-b sm:border-b-0 border-crypto-border pb-2 sm:pb-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors ${
              activeTab === "all"
                ? "bg-crypto-primary text-white"
                : "bg-crypto-surface-raised text-crypto-text-secondary hover:text-crypto-text"
            }`}
          >
            Todas ({alerts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors ${
              activeTab === "active"
                ? "bg-crypto-primary text-white"
                : "bg-crypto-surface-raised text-crypto-text-secondary hover:text-crypto-text"
            }`}
          >
            Activas ({activeAlertsCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("triggered")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors ${
              activeTab === "triggered"
                ? "bg-crypto-primary text-white"
                : "bg-crypto-surface-raised text-crypto-text-secondary hover:text-crypto-text"
            }`}
          >
            Disparadas ({triggeredAlertsCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("inactive")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors ${
              activeTab === "inactive"
                ? "bg-crypto-primary text-white"
                : "bg-crypto-surface-raised text-crypto-text-secondary hover:text-crypto-text"
            }`}
          >
            Pausadas ({inactiveAlerts.length})
          </button>
        </div>

        {/* Buscador dentro de alertas */}
        {alerts.length > 0 && (
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por moneda o nota..."
              className="w-full bg-crypto-surface-raised border border-crypto-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-crypto-text placeholder:text-crypto-text-muted focus:outline-none focus:border-crypto-primary"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-crypto-text-muted absolute left-2.5 top-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* 6. Listado de Alertas o Estado Vacío */}
      {alerts.length === 0 ? (
        <div className="bg-crypto-surface border border-crypto-border rounded-xl p-8 sm:p-14 text-center max-w-2xl mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-crypto-primary-soft border border-crypto-primary/30 flex items-center justify-center mx-auto mb-5 text-crypto-accent shadow-lg shadow-crypto-primary/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8"
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
          </div>

          <h3 className="text-xl font-bold text-crypto-text mb-2">No tienes alertas configuradas</h3>
          <p className="text-xs sm:text-sm text-crypto-text-secondary mb-6 leading-relaxed max-w-lg mx-auto">
            Configura umbrales de cotización para Bitcoin, Ethereum o cualquier activo del mercado. Recibirás avisos
            inmediatos en la interfaz y en tu escritorio cuando el precio alcance o supere tus metas técnicas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="w-full sm:w-auto px-5 py-2.5 bg-crypto-primary hover:bg-crypto-primary-hover text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-crypto-primary/20 flex items-center justify-center gap-2"
            >
              <span>+</span>
              <span>Crear primera alerta</span>
            </button>

            {onNavigateToMarkets && (
              <button
                type="button"
                onClick={onNavigateToMarkets}
                className="w-full sm:w-auto px-5 py-2.5 bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-text text-xs font-semibold rounded-lg border border-crypto-border transition-colors"
              >
                Explorar mercados primero
              </button>
            )}
          </div>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-crypto-surface border border-crypto-border rounded-xl p-8 text-center my-4">
          <p className="text-sm text-crypto-text-secondary">
            No se encontraron alertas en la pestaña seleccionada o con el filtro aplicado.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveTab("all");
              setSearchTerm("");
            }}
            className="mt-3 text-xs font-semibold text-crypto-accent hover:underline"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              currentPrice={currentPrices[alert.coinId.toLowerCase().trim()] ?? null}
              onEdit={handleOpenEditModal}
              onDelete={deleteAlert}
              onToggle={toggleAlert}
            />
          ))}
        </div>
      )}

      {/* 7. Modal de Creación y Edición */}
      <AlertModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={addAlert}
        onUpdate={updateAlert}
        editingAlert={editingAlert}
        initialCoin={targetCoinForNew}
        existingAlerts={alerts}
        currentPrices={currentPrices}
      />
    </div>
  );
};
