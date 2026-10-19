import { useState, useEffect, useCallback } from "react";
import type { FC, FormEvent } from "react";
import { getMarkets, getGlobalMarketData } from "./services/api.ts";
import type { Cryptocurrency, CryptoList, GlobalMarketData } from "./types/crypto";
import { AppLayout } from "./components/layout/AppLayout.tsx";
import type { NavSection } from "./components/layout/Sidebar.tsx";
import { MarketMetricsRow } from "./components/overview/MarketMetricsRow.tsx";
import { AnalysisZone } from "./components/overview/AnalysisZone.tsx";
import { MarketTable } from "./components/overview/MarketTable.tsx";
import { WatchlistView } from "./components/watchlist/WatchlistView.tsx";
import { PortfolioView } from "./components/portfolio/PortfolioView.tsx";
import { AlertsView } from "./components/alerts/AlertsView.tsx";
import { ToastContainer } from "./components/alerts/ToastContainer.tsx";
import { useAlerts } from "./hooks/useAlerts.ts";
import { LoadingSpinner } from "./components/common/LoadingSpinner.tsx";
import { ErrorMessage } from "./components/common/ErrorMessage.tsx";
import { StatusBadge } from "./components/ui/Badge.tsx";
import { AiAnalystView } from "./components/ai/AiAnalystView.tsx";
import { SettingsView } from "./components/settings/SettingsView.tsx";
import { SettingsProvider, useSettings } from "./context/SettingsContext.tsx";

// Contenido principal de la aplicación conectado a las preferencias globales
const AppContent: FC = () => {
  const { currency, settings } = useSettings();
  const [coins, setCoins] = useState<CryptoList>([]);
  const [globalData, setGlobalData] = useState<GlobalMarketData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [value, setValue] = useState<string>("25");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<Cryptocurrency | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>("overview");

  // Motor centralizado de alertas con notificaciones visuales globales y divisa activa
  const { toasts, dismissToast } = useAlerts({
    externalCoins: coins,
    vsCurrency: currency.toLowerCase(),
  });

  // Obtiene las métricas macroeconómicas consolidadas del mercado desde CoinGecko /global
  const fetchGlobalData = useCallback(() => {
    setGlobalLoading(true);
    getGlobalMarketData()
      .then((data) => {
        setGlobalData(data);
      })
      .catch((err: Error) => {
        // Si falla la API global (ej. rate limit), no bloqueamos la visualización de la lista de monedas
        console.warn("No se pudieron cargar los datos globales del mercado:", err.message);
      })
      .finally(() => {
        setGlobalLoading(false);
      });
  }, []);

  // Función centralizada para cargar datos desde el proveedor de mercado en la divisa activa
  const fetchCoins = useCallback(
    (countStr: string, ignoreCache = false) => {
      const num = parseInt(countStr, 10);
      if (isNaN(num) || num <= 0) {
        alert("Por favor, introduce un número entero mayor que 0.");
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      getMarkets({
        perPage: num,
        vsCurrency: currency.toLowerCase(),
        sparkline: true,
        ignoreCache,
      })
        .then((data) => {
          setCoins(data);
          setLastUpdated(new Date().toISOString());
          // Mantiene el activo seleccionado si aún existe en el nuevo conjunto, o selecciona el primero
          setSelectedCoin((prev) => {
            if (!prev) return data[0] || null;
            const found = data.find((c) => c.id === prev.id);
            return found || data[0] || null;
          });
        })
        .catch((err: Error) => {
          setErrorMsg(err.message || "Error al conectar con el proveedor de mercado.");
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [currency],
  );

  // Carga automática inicial y actualización reactiva al cambiar la divisa base en Ajustes
  useEffect(() => {
    let isCancelled = false;

    getMarkets({
      perPage: 25,
      vsCurrency: currency.toLowerCase(),
      sparkline: true,
    })
      .then((data) => {
        if (!isCancelled) {
          setCoins(data);
          setLastUpdated(new Date().toISOString());
          setSelectedCoin(data[0] || null);
        }
      })
      .catch((err: Error) => {
        if (!isCancelled) {
          setErrorMsg(err.message || "Error al conectar con el proveedor de mercado.");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    getGlobalMarketData()
      .then((data) => {
        if (!isCancelled) {
          setGlobalData(data);
        }
      })
      .catch((err: Error) => {
        if (!isCancelled) {
          console.warn("No se pudieron cargar los datos globales del mercado:", err.message);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setGlobalLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currency]);

  // Refresco automático periódico gobernado por el ajuste de frecuencia de actualización
  useEffect(() => {
    if (!settings.autoRefreshInterval || settings.autoRefreshInterval <= 0) {
      return;
    }

    const timerId = setInterval(() => {
      fetchCoins(value);
      fetchGlobalData();
    }, settings.autoRefreshInterval * 1000);

    return () => {
      clearInterval(timerId);
    };
  }, [settings.autoRefreshInterval, value, fetchCoins, fetchGlobalData]);

  // Manejador del formulario de conteo de criptomonedas
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    fetchCoins(value);
  };

  const handleRefresh = () => {
    fetchCoins(value || "25", true);
    fetchGlobalData();
  };

  const handleSelectCoin = (coin: Cryptocurrency) => {
    setSelectedCoin(coin);
  };

  // Callback cuando el explorador de mercados actualiza o pagina el conjunto de activos
  const handleCoinsLoaded = useCallback((loadedCoins: CryptoList) => {
    setCoins(loadedCoins);
    setLastUpdated(new Date().toISOString());
    setSelectedCoin((prev) => {
      if (!prev) return loadedCoins[0] || null;
      const found = loadedCoins.find((c) => c.id === prev.id);
      return found || prev || loadedCoins[0] || null;
    });
  }, []);

  // Título y subtítulo dinámico según la sección activa y divisa configurada
  const sectionMeta: Record<NavSection, { title: string; subtitle: string }> = {
    overview: {
      title: "Market Overview",
      subtitle: `Monitorización en tiempo real y métricas clave del mercado cripto en ${currency}`,
    },
    markets: {
      title: "Mercados Globales",
      subtitle: `Exploración de activos, rankings y filtros avanzados en ${currency}`,
    },
    watchlist: {
      title: "Watchlist Personal",
      subtitle: `Seguimiento selectivo de tus activos favoritos en ${currency} con persistencia local`,
    },
    portfolio: {
      title: "Mi Cartera",
      subtitle: `Registro de transacciones, valor actual, coste medio y P&L en ${currency}`,
    },
    alerts: {
      title: "Alertas de Precio",
      subtitle: "Monitorización continua de umbrales técnicos y notificaciones en tiempo real",
    },
    ai: {
      title: "AI Crypto Analyst",
      subtitle: "Análisis descriptivo contextual, métricas explicadas y comparativas con Gemini API",
    },
    settings: {
      title: "Ajustes del Sistema",
      subtitle: "Preferencias de divisa base, proveedores de datos, caché y apariencia visual",
    },
  };

  return (
    <AppLayout
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      sectionTitle={sectionMeta[activeSection].title}
      sectionSubtitle={sectionMeta[activeSection].subtitle}
      numCryptos={value}
      onChangeNumCryptos={setValue}
      onSubmitNumCryptos={handleSubmit}
      onRefresh={handleRefresh}
      isLoading={loading || globalLoading}
      lastUpdated={lastUpdated}
      hasError={Boolean(errorMsg)}
    >
      {/* Vista Principal: Overview */}
      {activeSection === "overview" && (
        <div className="space-y-8 animate-fade-in">
          {/* Encabezado del Dashboard */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-crypto-border">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-crypto-text tracking-tight">
                  Market Overview
                </h2>
                <StatusBadge variant="live">En vivo</StatusBadge>
              </div>
              <p className="text-xs sm:text-sm text-crypto-text-secondary mt-1">
                Visualización técnica y datos consolidados del mercado de criptoactivos en {currency}.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono text-crypto-text-muted">
              <span>Fuente: CoinGecko v3</span>
              <span>•</span>
              <span>Orden: Cap. de Mercado</span>
            </div>
          </div>

          {/* Estado de Error */}
          {errorMsg && (
            <ErrorMessage
              message={errorMsg}
              onRetry={handleRefresh}
            />
          )}

          {/* Estado de Carga Inicial */}
          {loading && coins.length === 0 && (
            <div className="py-16">
              <LoadingSpinner message="Conectando con la API de CoinGecko..." size="lg" />
            </div>
          )}

          {/* Contenido con Datos */}
          {coins.length > 0 && (
            <>
              {/* Indicadores Principales */}
              <section aria-label="Indicadores Principales">
                <MarketMetricsRow
                  coins={coins}
                  globalData={globalData}
                  isLoading={loading || globalLoading}
                  currency={currency}
                />
              </section>

              {/* Zona Central de Análisis (Activo Seleccionado + Gráfico F5 + Movers) */}
              <section aria-label="Zona Central de Análisis">
                <AnalysisZone
                  selectedCoin={selectedCoin}
                  coins={coins}
                  onSelectCoin={handleSelectCoin}
                  onConfigureAlert={(coin) => {
                    setSelectedCoin(coin);
                    setActiveSection("alerts");
                  }}
                  currency={currency}
                />
              </section>

              {/* Tabla de Mercados */}
              <section aria-label="Tabla de Mercados">
                <MarketTable
                  selectedCoin={selectedCoin}
                  onSelectCoin={handleSelectCoin}
                  onCoinsLoaded={handleCoinsLoaded}
                  currency={currency}
                />
              </section>
            </>
          )}

          {/* Estado Vacío */}
          {!loading && !errorMsg && coins.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-crypto-text-secondary text-sm">
                No hay criptomonedas cargadas actualmente.
              </p>
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-crypto-primary text-white text-xs font-semibold rounded-lg hover:bg-crypto-primary-hover transition-colors"
              >
                Cargar Top 10
              </button>
            </div>
          )}
        </div>
      )}

      {/* Vista de Mercados Globales */}
      {activeSection === "markets" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-crypto-border">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-crypto-text tracking-tight">
                  Mercados Globales
                </h2>
                <StatusBadge variant="live">Explorador</StatusBadge>
              </div>
              <p className="text-xs sm:text-sm text-crypto-text-secondary mt-1">
                Explora el universo de criptomonedas, consulta tendencias de 7 días y filtra por capitalización y precio.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono text-crypto-text-muted">
              <span>Fuente: CoinGecko v3</span>
              <span>•</span>
              <span>Divisa: {currency}</span>
            </div>
          </div>

          <MarketTable
            selectedCoin={selectedCoin}
            onSelectCoin={handleSelectCoin}
            onCoinsLoaded={handleCoinsLoaded}
            currency={currency}
          />
        </div>
      )}

      {/* Vista de Watchlist Personal */}
      {activeSection === "watchlist" && (
        <WatchlistView
          selectedCoin={selectedCoin}
          onSelectCoin={handleSelectCoin}
          onNavigateToMarkets={() => setActiveSection("markets")}
          initialCoins={coins}
          currency={currency}
        />
      )}

      {/* Vista de Mi Cartera (Portfolio Engine) */}
      {activeSection === "portfolio" && (
        <PortfolioView onNavigateToMarkets={() => setActiveSection("markets")} />
      )}

      {/* Vista de Alertas de Precio */}
      {activeSection === "alerts" && (
        <AlertsView
          onNavigateToMarkets={() => setActiveSection("markets")}
          initialCoins={coins}
          preselectedCoin={selectedCoin}
          currency={currency}
        />
      )}

      {/* Vista de AI Crypto Analyst */}
      {activeSection === "ai" && (
        <AiAnalystView
          selectedCoin={selectedCoin}
          coins={coins}
          globalData={globalData}
          onSelectCoin={handleSelectCoin}
          onNavigateToMarkets={() => setActiveSection("markets")}
        />
      )}

      {/* Vista de Ajustes del Sistema (Fase 10) */}
      {activeSection === "settings" && <SettingsView />}

      {/* Contenedor flotante de notificaciones in-app de alertas cumplidas */}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        onNavigateToAlerts={() => setActiveSection("alerts")}
      />

      {/* Fallback de seguridad si no coincide ninguna sección conocida */}
      {activeSection !== "overview" &&
        activeSection !== "markets" &&
        activeSection !== "watchlist" &&
        activeSection !== "portfolio" &&
        activeSection !== "alerts" &&
        activeSection !== "ai" &&
        activeSection !== "settings" && (
          <div className="bg-crypto-surface border border-crypto-border rounded-xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-8">
            <h3 className="text-xl font-bold text-crypto-text mb-2">
              Sección no encontrada
            </h3>
            <button
              type="button"
              onClick={() => setActiveSection("overview")}
              className="mt-4 px-4 py-2 bg-crypto-surface-hover hover:bg-crypto-surface-raised text-crypto-text text-xs font-semibold rounded-lg border border-crypto-border transition-colors inline-flex items-center gap-2"
            >
              <span>← Volver a Market Overview</span>
            </button>
          </div>
        )}
    </AppLayout>
  );
};

// Componente raíz que envuelve la aplicación en el proveedor de preferencias
export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}
