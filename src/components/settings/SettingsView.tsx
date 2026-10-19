import { useState, useEffect, useCallback } from "react";
import type { FC } from "react";
import { useSettings } from "../../context/SettingsContext.tsx";
import type { BaseCurrency, ThemeMode } from "../../types/settings.ts";
import { SUPPORTED_CURRENCIES } from "../../types/settings.ts";
import {
  checkMarketProviderConnection,
  clearAllMarketCache,
  getMarketProvider,
} from "../../services/api.ts";
import { fetchAiStatus } from "../../services/aiAnalystService.ts";
import type { AiAnalystStatus } from "../../types/crypto";
import { formatCurrency, formatCompactNumber, formatPercentage } from "../../utils/formatters.ts";
import { StatusBadge } from "../ui/Badge.tsx";

// Frecuencias de refresco disponibles
const REFRESH_OPTIONS = [
  { value: 0, label: "Manual (Sin refresco automático)" },
  { value: 30, label: "Cada 30 segundos" },
  { value: 60, label: "Cada 1 minuto (Recomendado)" },
  { value: 120, label: "Cada 2 minutos" },
  { value: 300, label: "Cada 5 minutos" },
];

export const SettingsView: FC = () => {
  const {
    settings,
    currency,
    theme,
    resolvedTheme,
    storageStats,
    setCurrency,
    setTheme,
    updateSettings,
    resetSettings,
    clearAllData,
    refreshStorageStats,
  } = useSettings();

  // Estados locales para pruebas de conectividad y feedback interactivo
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    ok: boolean;
    latencyMs: number;
    message: string;
  } | null>(null);

  const [cacheClearedNotice, setCacheClearedNotice] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [isDangerModalOpen, setIsDangerModalOpen] = useState(false);

  // Estado del servicio de IA obtenido del servidor
  const [aiStatus, setAiStatus] = useState<AiAnalystStatus | null>(null);
  const [isLoadingAiStatus, setIsLoadingAiStatus] = useState(false);

  // Consulta el estado del analista de IA al montar la vista
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingAiStatus(true);

    fetchAiStatus()
      .then((status) => {
        if (!isCancelled) {
          setAiStatus(status);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn("No se pudo consultar el estado del servicio de IA:", err);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingAiStatus(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Muestra una notificación temporal de guardado
  const triggerSavedNotice = useCallback((msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => {
      setSavedNotice(null);
    }, 2800);
  }, []);

  // Comprueba la conectividad real con CoinGecko
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await checkMarketProviderConnection();
      setConnectionResult(res);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Limpia la caché en memoria de mercado
  const handleClearCache = () => {
    clearAllMarketCache();
    setCacheClearedNotice("Caché en memoria limpiada correctamente.");
    setTimeout(() => {
      setCacheClearedNotice(null);
    }, 2800);
  };

  // Cambia la divisa base con feedback
  const handleCurrencyChange = (newCurr: BaseCurrency) => {
    setCurrency(newCurr);
    triggerSavedNotice(`Divisa base cambiada a ${newCurr}.`);
  };

  // Cambia el modo de apariencia con feedback
  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    triggerSavedNotice(
      `Tema cambiado a ${newTheme === "system" ? "del sistema" : newTheme === "dark" ? "oscuro" : "claro"}.`,
    );
  };

  // Restablece solo ajustes con feedback
  const handleResetDefaults = () => {
    resetSettings();
    triggerSavedNotice("Ajustes restaurados a valores predeterminados.");
  };

  // Ejecuta la limpieza de todos los datos locales tras confirmación
  const handleConfirmClearAll = () => {
    clearAllData();
    setIsDangerModalOpen(false);
    triggerSavedNotice("Todos los datos locales han sido eliminados.");
  };

  const activeProvider = getMarketProvider();

  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-5xl mx-auto">
      {/* 1. Encabezado de la Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-crypto-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-crypto-text tracking-tight flex items-center gap-2">
              <span className="text-crypto-primary">⚙</span>
              Ajustes del Sistema
            </h2>
            <StatusBadge variant="live">Fase 10 Activa</StatusBadge>
          </div>
          <p className="text-xs sm:text-sm text-crypto-text-secondary mt-1">
            Configura tus preferencias globales de divisa base, apariencia visual, conectividad de mercado y privacidad local.
          </p>
        </div>

        {/* Notificación flotante de confirmación de cambio */}
        {savedNotice && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-crypto-positive-soft border border-crypto-positive/30 text-crypto-positive text-xs font-semibold animate-fade-in">
            <span>✓</span>
            <span>{savedNotice}</span>
          </div>
        )}
      </div>

      {/* 2. Sección: General */}
      <section className="bg-crypto-surface border border-crypto-border rounded-xl p-5 sm:p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-crypto-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🌐</span>
            <div>
              <h3 className="text-base font-bold text-crypto-text">General</h3>
              <p className="text-xs text-crypto-text-muted">
                Comportamiento de actualización y configuración regional de la terminal.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Idioma de la interfaz */}
          <div className="p-4 rounded-lg bg-crypto-surface-raised border border-crypto-border/70 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-crypto-text">Idioma de la Interfaz</label>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-crypto-primary-soft text-crypto-accent border border-crypto-accent/20">
                Nativo
              </span>
            </div>
            <p className="text-xs text-crypto-text-muted">
              Español (España) — Todas las descripciones, etiquetas financieras y métricas se presentan en español.
            </p>
          </div>

          {/* Frecuencia de actualización automática */}
          <div className="p-4 rounded-lg bg-crypto-surface-raised border border-crypto-border/70 space-y-2">
            <label htmlFor="refresh-select" className="block text-xs font-semibold text-crypto-text">
              Intervalo de Refresco en Vivo
            </label>
            <select
              id="refresh-select"
              value={settings.autoRefreshInterval}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                updateSettings({ autoRefreshInterval: val });
                triggerSavedNotice("Intervalo de refresco actualizado.");
              }}
              className="w-full bg-crypto-surface border border-crypto-border rounded-lg px-3 py-2 text-xs font-mono text-crypto-text focus:outline-none focus:border-crypto-primary"
            >
              {REFRESH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-crypto-text-muted">
              Regula las solicitudes automáticas al proveedor para no saturar los límites de cuota gratuita.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Sección: Divisa Base y Formato Regional */}
      <section className="bg-crypto-surface border border-crypto-border rounded-xl p-5 sm:p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-crypto-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">💱</span>
            <div>
              <h3 className="text-base font-bold text-crypto-text">Divisa Base y Formato Financiero</h3>
              <p className="text-xs text-crypto-text-muted">
                Selecciona la moneda principal en la que deseas valorar cotizaciones, gráficos y carteras.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-crypto-accent">
            Activa: {currency}
          </span>
        </div>

        {/* Selector de divisa */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(SUPPORTED_CURRENCIES) as BaseCurrency[]).map((code) => {
            const conf = SUPPORTED_CURRENCIES[code];
            const isSelected = currency === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => handleCurrencyChange(code)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-28 ${
                  isSelected
                    ? "bg-crypto-primary-soft/40 border-crypto-primary shadow-sm shadow-crypto-primary/20"
                    : "bg-crypto-surface-raised hover:bg-crypto-surface-hover border-crypto-border/70"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xl font-bold font-mono text-crypto-text">
                    {conf.symbol}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-crypto-primary text-white font-bold">
                      Seleccionada
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-bold text-sm text-crypto-text">{code}</div>
                  <div className="text-xs text-crypto-text-muted">{conf.name}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Explicación de integridad financiera */}
        <div className="p-4 rounded-lg bg-crypto-surface-raised/60 border border-crypto-border/60 text-xs text-crypto-text-secondary space-y-2">
          <div className="flex items-center gap-2 text-crypto-accent font-semibold">
            <span>🛡</span>
            <span>Integridad de cotización sin conversiones sintéticas</span>
          </div>
          <p className="leading-relaxed">
            My Crypto 2.0 consulta directamente a CoinGecko con el parámetro nativo{" "}
            <code className="text-crypto-accent font-mono">vs_currency={currency.toLowerCase()}</code>.
            Las cotizaciones de mercado, rankings, volúmenes y series históricas provienen de las órdenes de mercado reales en esa divisa. Los registros de compra/venta de tu cartera conservan su coste original de adquisición.
          </p>
        </div>

        {/* Vista previa en vivo de formateo */}
        <div className="p-4 rounded-lg bg-crypto-bg border border-crypto-border space-y-3">
          <span className="text-[11px] font-mono uppercase tracking-wider text-crypto-text-muted block">
            Vista previa en vivo del formateador centralizado ({currency}):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2.5 rounded bg-crypto-surface border border-crypto-border/50">
              <span className="text-[10px] text-crypto-text-muted block mb-1">Precio Estándar</span>
              <span className="font-mono font-bold text-xs text-crypto-text">
                {formatCurrency(64850.25, currency)}
              </span>
            </div>
            <div className="p-2.5 rounded bg-crypto-surface border border-crypto-border/50">
              <span className="text-[10px] text-crypto-text-muted block mb-1">Micro-precio (8 dec)</span>
              <span className="font-mono font-bold text-xs text-crypto-text">
                {formatCurrency(0.00003456, currency)}
              </span>
            </div>
            <div className="p-2.5 rounded bg-crypto-surface border border-crypto-border/50">
              <span className="text-[10px] text-crypto-text-muted block mb-1">Cifra Compacta</span>
              <span className="font-mono font-bold text-xs text-crypto-text">
                {formatCompactNumber(1250000000, SUPPORTED_CURRENCIES[currency].symbol)}
              </span>
            </div>
            <div className="p-2.5 rounded bg-crypto-surface border border-crypto-border/50">
              <span className="text-[10px] text-crypto-text-muted block mb-1">Variación 24h</span>
              <span className="font-mono font-bold text-xs text-crypto-positive">
                {formatPercentage(5.42, true)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Sección: Apariencia Visual */}
      <section className="bg-crypto-surface border border-crypto-border rounded-xl p-5 sm:p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-crypto-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🎨</span>
            <div>
              <h3 className="text-base font-bold text-crypto-text">Apariencia y Modo de Color</h3>
              <p className="text-xs text-crypto-text-muted">
                Elige entre el tema oscuro técnico o el modo claro diurno de alta legibilidad.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-crypto-text-muted">
            Modo activo: <strong className="text-crypto-text capitalize">{resolvedTheme}</strong>
          </span>
        </div>

        {/* Selector de Tema */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Modo Oscuro */}
          <button
            type="button"
            onClick={() => handleThemeChange("dark")}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-28 ${
              theme === "dark"
                ? "bg-crypto-primary-soft/40 border-crypto-primary shadow-sm shadow-crypto-primary/20"
                : "bg-crypto-surface-raised hover:bg-crypto-surface-hover border-crypto-border/70"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xl">🌙</span>
              {theme === "dark" && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-crypto-primary text-white font-bold">
                  Activo
                </span>
              )}
            </div>
            <div>
              <div className="font-bold text-sm text-crypto-text">Oscuro (Dark)</div>
              <div className="text-xs text-crypto-text-muted">Terminal SaaS azul profundo</div>
            </div>
          </button>

          {/* Modo Claro */}
          <button
            type="button"
            onClick={() => handleThemeChange("light")}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-28 ${
              theme === "light"
                ? "bg-crypto-primary-soft/40 border-crypto-primary shadow-sm shadow-crypto-primary/20"
                : "bg-crypto-surface-raised hover:bg-crypto-surface-hover border-crypto-border/70"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xl">☀️</span>
              {theme === "light" && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-crypto-primary text-white font-bold">
                  Activo
                </span>
              )}
            </div>
            <div>
              <div className="font-bold text-sm text-crypto-text">Claro (Light)</div>
              <div className="text-xs text-crypto-text-muted">Superficies nítidas y alto contraste</div>
            </div>
          </button>

          {/* Modo Sistema */}
          <button
            type="button"
            onClick={() => handleThemeChange("system")}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-28 ${
              theme === "system"
                ? "bg-crypto-primary-soft/40 border-crypto-primary shadow-sm shadow-crypto-primary/20"
                : "bg-crypto-surface-raised hover:bg-crypto-surface-hover border-crypto-border/70"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xl">💻</span>
              {theme === "system" && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-crypto-primary text-white font-bold">
                  Activo ({resolvedTheme})
                </span>
              )}
            </div>
            <div>
              <div className="font-bold text-sm text-crypto-text">Sistema (Auto)</div>
              <div className="text-xs text-crypto-text-muted">Sigue las preferencias de tu SO</div>
            </div>
          </button>
        </div>

        {/* Muestra de la paleta activa */}
        <div className="p-4 rounded-lg bg-crypto-bg border border-crypto-border space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-crypto-text-muted block">
            Paleta de tokens activos (SaaS Azul):
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <div className="p-2 rounded bg-crypto-bg border border-crypto-border text-center">
              <span className="text-[10px] text-crypto-text-muted block">bg</span>
              <span className="text-xs font-mono font-bold text-crypto-text">Fondo</span>
            </div>
            <div className="p-2 rounded bg-crypto-surface border border-crypto-border text-center">
              <span className="text-[10px] text-crypto-text-muted block">surface</span>
              <span className="text-xs font-mono font-bold text-crypto-text">Superficie</span>
            </div>
            <div className="p-2 rounded bg-crypto-primary text-white text-center">
              <span className="text-[10px] opacity-80 block">primary</span>
              <span className="text-xs font-mono font-bold">Marca</span>
            </div>
            <div className="p-2 rounded bg-crypto-surface border border-crypto-border text-center">
              <span className="text-[10px] text-crypto-text-muted block">accent</span>
              <span className="text-xs font-mono font-bold text-crypto-accent">Detalle</span>
            </div>
            <div className="p-2 rounded bg-crypto-positive-soft border border-crypto-positive/30 text-center">
              <span className="text-[10px] text-crypto-positive block">positive</span>
              <span className="text-xs font-mono font-bold text-crypto-positive">+Rentable</span>
            </div>
            <div className="p-2 rounded bg-crypto-negative-soft border border-crypto-negative/30 text-center">
              <span className="text-[10px] text-crypto-negative block">negative</span>
              <span className="text-xs font-mono font-bold text-crypto-negative">-Pérdida</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Sección: Datos de Mercado y Conectividad */}
      <section className="bg-crypto-surface border border-crypto-border rounded-xl p-5 sm:p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-crypto-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">📡</span>
            <div>
              <h3 className="text-base font-bold text-crypto-text">Proveedor de Datos y Conectividad</h3>
              <p className="text-xs text-crypto-text-muted">
                Inspección del adaptador de mercado activo, latencia y gestión de caché en memoria.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-crypto-positive-soft text-crypto-positive border border-crypto-positive/30 font-semibold">
            Activo: {activeProvider.name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ficha técnica del proveedor */}
          <div className="p-4 rounded-lg bg-crypto-surface-raised border border-crypto-border/70 space-y-2.5">
            <div className="text-xs font-semibold text-crypto-text">Detalles del Proveedor</div>
            <div className="space-y-1 text-xs font-mono text-crypto-text-secondary">
              <div className="flex justify-between">
                <span className="text-crypto-text-muted">Nombre:</span>
                <span>{activeProvider.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crypto-text-muted">Ruta Base:</span>
                <span className="text-crypto-accent">/api/coingecko</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crypto-text-muted">Cuota Pública:</span>
                <span>10 - 30 req / minuto</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crypto-text-muted">Caché Adaptativa:</span>
                <span>60s (mercados) / 300s (gráficos)</span>
              </div>
            </div>
          </div>

          {/* Prueba de conexión interactiva */}
          <div className="p-4 rounded-lg bg-crypto-surface-raised border border-crypto-border/70 flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-crypto-text mb-1">
                Comprobación de Conectividad en Tiempo Real
              </div>
              <p className="text-xs text-crypto-text-muted">
                Envía una solicitud de diagnóstico al endpoint para comprobar disponibilidad y medir la latencia del canal.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                className="px-3.5 py-2 rounded-lg bg-crypto-primary hover:bg-crypto-primary-hover disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
              >
                {isTestingConnection ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Comprobar conexión</span>
                  </>
                )}
              </button>

              {connectionResult && (
                <div
                  className={`text-xs font-mono px-2.5 py-1 rounded flex items-center gap-1.5 ${
                    connectionResult.ok
                      ? "bg-crypto-positive-soft text-crypto-positive border border-crypto-positive/30"
                      : "bg-crypto-negative-soft text-crypto-negative border border-crypto-negative/30"
                  }`}
                >
                  <span>{connectionResult.ok ? "●" : "⚠"}</span>
                  <span>
                    {connectionResult.ok
                      ? `En línea (${connectionResult.latencyMs} ms)`
                      : "Error de conexión"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gestión de caché en memoria y aviso de futuros proveedores */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-lg bg-crypto-bg border border-crypto-border">
          <div>
            <div className="text-xs font-semibold text-crypto-text">Caché en Memoria</div>
            <p className="text-xs text-crypto-text-muted">
              Si experimentas datos desfasados tras una reconexión, puedes purgar la memoria intermedia de forma segura.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {cacheClearedNotice && (
              <span className="text-xs text-crypto-positive font-mono">
                {cacheClearedNotice}
              </span>
            )}
            <button
              type="button"
              onClick={handleClearCache}
              className="px-3 py-1.5 rounded-lg bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-text text-xs font-semibold border border-crypto-border transition-colors cursor-pointer flex-shrink-0"
            >
              Limpiar caché en memoria
            </button>
          </div>
        </div>

        <div className="text-[11px] text-crypto-text-muted flex items-start gap-2">
          <span>ℹ</span>
          <span>
            Otros proveedores (ej. Binance, CoinMarketCap) no están disponibles en esta versión porque la terminal prioriza la trazabilidad y la integridad de las llamadas a través de una arquitectura limpia y sin secretos en el cliente.
          </span>
        </div>
      </section>

      {/* 6. Sección: Privacidad y Gestión de Datos Locales */}
      <section className="bg-crypto-surface border border-crypto-border rounded-xl p-5 sm:p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-crypto-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🔒</span>
            <div>
              <h3 className="text-base font-bold text-crypto-text">Privacidad y Gestión de Datos Locales</h3>
              <p className="text-xs text-crypto-text-muted">
                Control sobre el almacenamiento en el navegador de transacciones, watchlist y alertas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshStorageStats}
            className="text-xs text-crypto-accent hover:underline cursor-pointer"
          >
            Actualizar métricas
          </button>
        </div>

        {/* Diagnóstico de ocupación local */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-lg bg-crypto-surface-raised border border-crypto-border/60">
            <span className="text-[10px] text-crypto-text-muted block">Espacio Utilizado</span>
            <span className="font-mono font-bold text-sm text-crypto-text">
              {storageStats.formattedSize}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-crypto-surface-raised border border-crypto-border/60">
            <span className="text-[10px] text-crypto-text-muted block">En Watchlist</span>
            <span className="font-mono font-bold text-sm text-crypto-text">
              {storageStats.itemCounts.watchlist} activos
            </span>
          </div>
          <div className="p-3 rounded-lg bg-crypto-surface-raised border border-crypto-border/60">
            <span className="text-[10px] text-crypto-text-muted block">Transacciones Cartera</span>
            <span className="font-mono font-bold text-sm text-crypto-text">
              {storageStats.itemCounts.portfolioTransactions} regs
            </span>
          </div>
          <div className="p-3 rounded-lg bg-crypto-surface-raised border border-crypto-border/60">
            <span className="text-[10px] text-crypto-text-muted block">Alertas Creadas</span>
            <span className="font-mono font-bold text-sm text-crypto-text">
              {storageStats.itemCounts.alerts} alertas
            </span>
          </div>
        </div>

        {/* Acciones de gestión */}
        <div className="space-y-3 pt-2">
          {/* Acción Segura: Restablecer Ajustes */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-crypto-surface-raised border border-crypto-border/60">
            <div>
              <div className="text-xs font-semibold text-crypto-text">
                Restablecer Ajustes a Valores Predeterminados
              </div>
              <p className="text-xs text-crypto-text-muted mt-0.5">
                Restaura divisa a EUR, tema oscuro e intervalo de 60s.{" "}
                <strong className="text-crypto-text font-semibold">
                  No borra tu cartera, alertas ni watchlist.
                </strong>
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-lg bg-crypto-surface hover:bg-crypto-surface-hover text-crypto-text text-xs font-semibold border border-crypto-border transition-colors cursor-pointer flex-shrink-0"
            >
              Restaurar ajustes
            </button>
          </div>

          {/* Acción Peligrosa: Limpieza Total */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-crypto-negative-soft/10 border border-crypto-negative/30">
            <div>
              <div className="text-xs font-semibold text-crypto-negative flex items-center gap-1.5">
                <span>⚠</span>
                <span>Zona de Peligro: Borrar Todos los Datos Locales</span>
              </div>
              <p className="text-xs text-crypto-text-muted mt-0.5">
                Elimina permanentemente de este navegador todas las transacciones de cartera, listas de favoritos, alertas y preferencias.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDangerModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-crypto-negative-soft hover:bg-crypto-negative/20 text-crypto-negative border border-crypto-negative/40 text-xs font-bold transition-colors cursor-pointer flex-shrink-0"
            >
              Borrar todos los datos...
            </button>
          </div>
        </div>
      </section>

      {/* 7. Sección: Información de la Aplicación */}
      <section className="bg-crypto-surface border border-crypto-border rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-crypto-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">ℹ</span>
            <div>
              <h3 className="text-base font-bold text-crypto-text">Información de la Aplicación</h3>
              <p className="text-xs text-crypto-text-muted">
                Versión del software, estado de integraciones de IA y documentación técnica.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-crypto-accent">
            v2.0.0
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-crypto-surface-raised border border-crypto-border/60">
            <span className="text-crypto-text-muted block text-[10px] uppercase">Producto</span>
            <span className="text-crypto-text font-bold text-sm">My Crypto 2.0</span>
            <span className="text-crypto-text-muted block text-[11px] mt-0.5">
              Terminal Financiera Web
            </span>
          </div>

          <div className="p-3 rounded-lg bg-crypto-surface-raised border border-crypto-border/60">
            <span className="text-crypto-text-muted block text-[10px] uppercase">AI Crypto Analyst</span>
            <span className="text-crypto-text font-bold text-sm">
              {isLoadingAiStatus
                ? "Consultando..."
                : aiStatus?.isConfigured
                  ? "Disponible (Gemini)"
                  : "Servidor Activo"}
            </span>
            <span className="text-crypto-text-muted block text-[11px] mt-0.5">
              {aiStatus?.model || "gemini-2.5-flash"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-crypto-surface-raised border border-crypto-border/60">
            <span className="text-crypto-text-muted block text-[10px] uppercase">Custodia</span>
            <span className="text-crypto-positive font-bold text-sm">No Custodial (100% Local)</span>
            <span className="text-crypto-text-muted block text-[11px] mt-0.5">
              Sin claves ni datos en la nube
            </span>
          </div>
        </div>

        {/* Descargo de responsabilidad financiera */}
        <div className="p-3 rounded-lg bg-crypto-bg border border-crypto-border text-[11px] text-crypto-text-muted leading-relaxed">
          <strong>Aviso de Exención de Responsabilidad:</strong> My Crypto 2.0 es una terminal interactiva de análisis e investigación para inversores particulares. No realiza recomendaciones financieras personalizadas ni gestiona órdenes bursátiles. Las métricas de rentabilidad calculadas por método FIFO son estrictamente informativas y no constituyen asesoramiento fiscal ni legal.
        </div>
      </section>

      {/* Modal de Confirmación para Borrado Total */}
      {isDangerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-crypto-surface border border-crypto-negative/40 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-crypto-negative">
              <span className="text-2xl">⚠</span>
              <h3 className="text-lg font-bold text-crypto-text">¿Borrar todos los datos locales?</h3>
            </div>

            <p className="text-xs text-crypto-text-secondary leading-relaxed">
              Esta acción es irreversible y eliminará definitivamente del navegador:
            </p>

            <ul className="text-xs font-mono space-y-1.5 p-3 rounded-lg bg-crypto-bg border border-crypto-border text-crypto-text">
              <li>• <strong className="text-crypto-accent">my-crypto-portfolio-v1:</strong> Todas tus transacciones registradas</li>
              <li>• <strong className="text-crypto-accent">my-crypto-watchlist-v1:</strong> Tu lista de criptomonedas favoritas</li>
              <li>• <strong className="text-crypto-accent">my-crypto-alerts-v1:</strong> Todas las alertas de precio configuradas</li>
              <li>• <strong className="text-crypto-accent">my-crypto-settings-v1:</strong> Tus preferencias de tema y divisa</li>
            </ul>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDangerModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-text-secondary hover:text-crypto-text text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="px-4 py-2 rounded-lg bg-crypto-negative hover:opacity-90 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Sí, borrar todos los datos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
