import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import { getTopCoins, getGlobalMarketData } from "./services/api.ts";
import type { Cryptocurrency, CryptoList, GlobalMarketData } from "./types/crypto";
import { AppLayout } from "./components/layout/AppLayout.tsx";
import type { NavSection } from "./components/layout/Sidebar.tsx";
import { MarketMetricsRow } from "./components/overview/MarketMetricsRow.tsx";
import { AnalysisZone } from "./components/overview/AnalysisZone.tsx";
import { MarketTable } from "./components/overview/MarketTable.tsx";
import { LoadingSpinner } from "./components/common/LoadingSpinner.tsx";
import { ErrorMessage } from "./components/common/ErrorMessage.tsx";
import { StatusBadge } from "./components/ui/Badge.tsx";

function App() {
  const [coins, setCoins] = useState<CryptoList>([]);
  const [globalData, setGlobalData] = useState<GlobalMarketData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [value, setValue] = useState<string>("10");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<Cryptocurrency | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>("overview");

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

  // Función centralizada para cargar datos desde CoinGecko
  const fetchCoins = useCallback((countStr: string) => {
    const num = parseInt(countStr, 10);
    if (isNaN(num) || num <= 0) {
      alert("Por favor, introduce un número entero mayor que 0.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    getTopCoins({ numCryptos: num })
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
        setErrorMsg(err.message || "Error al conectar con CoinGecko.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Carga inicial automática al montar el componente (top 10 por defecto e indicadores globales)
  useEffect(() => {
    let isCancelled = false;

    getTopCoins({ numCryptos: 10 })
      .then((data) => {
        if (!isCancelled) {
          setCoins(data);
          setLastUpdated(new Date().toISOString());
          setSelectedCoin(data[0] || null);
        }
      })
      .catch((err: Error) => {
        if (!isCancelled) {
          setErrorMsg(err.message || "Error al conectar con CoinGecko.");
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
  }, []);

  // Manejador del formulario de conteo de criptomonedas (conserva interacción previa)
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    fetchCoins(value);
  };

  const handleRefresh = () => {
    fetchCoins(value || "10");
    fetchGlobalData();
  };

  const handleSelectCoin = (coin: Cryptocurrency) => {
    setSelectedCoin(coin);
  };

  // Título y subtítulo dinámico según la sección activa
  const sectionMeta: Record<NavSection, { title: string; subtitle: string }> = {
    overview: {
      title: "Market Overview",
      subtitle: "Monitorización en tiempo real y métricas clave del mercado cripto en EUR",
    },
    markets: {
      title: "Mercados Globales",
      subtitle: "Exploración de activos, rankings y filtros avanzados",
    },
    watchlist: {
      title: "Watchlist Personal",
      subtitle: "Seguimiento selectivo de tus activos favoritos con persistencia local",
    },
    portfolio: {
      title: "Mi Cartera",
      subtitle: "Registro de transacciones, valor actual, coste medio y P&L realizado",
    },
    alerts: {
      title: "Alertas de Precio",
      subtitle: "Notificaciones y umbrales técnicos configurables",
    },
    ai: {
      title: "AI Market Analyst",
      subtitle: "Informes contextuales, resúmenes de mercado y análisis asistido",
    },
    settings: {
      title: "Ajustes del Sistema",
      subtitle: "Preferencias de divisa base, proveedores de datos y apariencia",
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
          {/* Sección 1: Encabezado del Dashboard */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-crypto-border">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-crypto-text tracking-tight">
                  Market Overview
                </h2>
                <StatusBadge variant="live">En vivo</StatusBadge>
              </div>
              <p className="text-xs sm:text-sm text-crypto-text-secondary mt-1">
                Visualización técnica y datos consolidados del mercado de criptoactivos en euros (EUR).
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
              {/* Sección 2: Indicadores Principales */}
              <section aria-label="Indicadores Principales">
                <MarketMetricsRow
                  coins={coins}
                  globalData={globalData}
                  isLoading={loading || globalLoading}
                />
              </section>

              {/* Sección 3: Zona Central de Análisis (Activo Seleccionado + Gráfico F5 + Movers) */}
              <section aria-label="Zona Central de Análisis">
                <AnalysisZone
                  selectedCoin={selectedCoin}
                  coins={coins}
                  onSelectCoin={handleSelectCoin}
                />
              </section>

              {/* Sección 4: Tabla de Mercados */}
              <section aria-label="Tabla de Mercados">
                <MarketTable
                  coins={coins}
                  selectedCoin={selectedCoin}
                  onSelectCoin={handleSelectCoin}
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

      {/* Secciones Futuras: Estado Preparado / En Desarrollo */}
      {activeSection !== "overview" && (
        <div className="bg-crypto-surface border border-crypto-border rounded-xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-8">
          <div className="w-12 h-12 rounded-xl bg-crypto-primary-soft border border-crypto-primary/30 flex items-center justify-center mx-auto mb-4 text-crypto-accent">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>

          <div className="inline-block mb-3">
            <StatusBadge variant="upcoming">Próxima Fase de Desarrollo</StatusBadge>
          </div>

          <h3 className="text-xl font-bold text-crypto-text mb-2">
            {sectionMeta[activeSection].title}
          </h3>

          <p className="text-sm text-crypto-text-secondary mb-6 leading-relaxed">
            {sectionMeta[activeSection].subtitle}. Esta funcionalidad está planificada en el roadmap de My Crypto 2.0 y se implementará de forma modular en su fase correspondiente.
          </p>

          <button
            type="button"
            onClick={() => setActiveSection("overview")}
            className="px-4 py-2 bg-crypto-surface-hover hover:bg-crypto-surface-raised text-crypto-text text-xs font-semibold rounded-lg border border-crypto-border transition-colors inline-flex items-center gap-2"
          >
            <span>←</span>
            <span>Volver a Market Overview</span>
          </button>
        </div>
      )}
    </AppLayout>
  );
}

export default App;
