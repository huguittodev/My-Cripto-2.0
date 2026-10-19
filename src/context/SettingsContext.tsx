/**
 * Contexto y proveedor global de ajustes del sistema para My Crypto 2.0.
 * Gestiona el ciclo de vida de divisa base, apariencia y sincronización reactiva.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { FC, ReactNode } from "react";
import type {
  AppSettings,
  BaseCurrency,
  ThemeMode,
  ResolvedTheme,
  CurrencyConfig,
  LocalStorageStats,
} from "../types/settings.ts";
import {
  DEFAULT_SETTINGS,
  SUPPORTED_CURRENCIES,
} from "../types/settings.ts";
import {
  getStoredSettings,
  updateStoredSettings,
  resetStoredSettings,
  clearAllStoredData,
  getLocalStorageStats,
  SETTINGS_UPDATED_EVENT,
} from "../services/settingsStorage.ts";
import { formatCurrency, formatCompactNumber } from "../utils/formatters.ts";

export interface SettingsContextValue {
  settings: AppSettings;
  currency: BaseCurrency;
  currencyConfig: CurrencyConfig;
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  storageStats: LocalStorageStats;
  setCurrency: (currency: BaseCurrency) => void;
  setTheme: (theme: ThemeMode) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
  clearAllData: () => void;
  refreshStorageStats: () => void;
  formatMoney: (value: number | null | undefined, fixedDecimals?: number) => string;
  formatCompact: (value: number | null | undefined) => string;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

// Determina el tema del sistema operativo mediante matchMedia
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

// Aplica las clases CSS globales en el elemento <html>
const applyThemeToDOM = (resolved: ResolvedTheme): void => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (resolved === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  } else {
    root.classList.add("dark");
    root.classList.remove("light");
    root.setAttribute("data-theme", "dark");
  }
};

export interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => getStoredSettings());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());
  const [storageStats, setStorageStats] = useState<LocalStorageStats>(() => getLocalStorageStats());

  // Calcula el tema resuelto reactivamente
  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (settings.theme === "system") {
      return systemTheme;
    }
    return settings.theme;
  }, [settings.theme, systemTheme]);

  // Aplica el tema activo al DOM
  useEffect(() => {
    applyThemeToDOM(resolvedTheme);
  }, [resolvedTheme]);

  // Escucha cambios en las preferencias del sistema operativo cuando el modo es "system"
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      // Compatibilidad con navegadores antiguos
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Recarga las preferencias y métricas locales
  const reloadSettings = useCallback(() => {
    setSettings(getStoredSettings());
    setStorageStats(getLocalStorageStats());
  }, []);

  // Escucha eventos custom de la misma pestaña y storage events entre pestañas
  useEffect(() => {
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === null || e.key.includes("my-crypto")) {
        reloadSettings();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(SETTINGS_UPDATED_EVENT, reloadSettings);
      window.addEventListener("storage", handleStorageEvent);
      window.addEventListener("mycrypto:portfolio_updated", reloadSettings);
      window.addEventListener("mycrypto:watchlist_updated", reloadSettings);
      window.addEventListener("mycrypto:alerts_updated", reloadSettings);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(SETTINGS_UPDATED_EVENT, reloadSettings);
        window.removeEventListener("storage", handleStorageEvent);
        window.removeEventListener("mycrypto:portfolio_updated", reloadSettings);
        window.removeEventListener("mycrypto:watchlist_updated", reloadSettings);
        window.removeEventListener("mycrypto:alerts_updated", reloadSettings);
      }
    };
  }, [reloadSettings]);

  // Modifica la divisa base y persiste el cambio
  const handleSetCurrency = useCallback((newCurrency: BaseCurrency) => {
    const updated = updateStoredSettings({ currency: newCurrency });
    setSettings(updated);
    setStorageStats(getLocalStorageStats());
  }, []);

  // Modifica el modo de tema y persiste el cambio
  const handleSetTheme = useCallback((newTheme: ThemeMode) => {
    const updated = updateStoredSettings({ theme: newTheme });
    setSettings(updated);
    setStorageStats(getLocalStorageStats());
  }, []);

  // Actualización parcial genérica
  const handleUpdateSettings = useCallback((partial: Partial<AppSettings>) => {
    const updated = updateStoredSettings(partial);
    setSettings(updated);
    setStorageStats(getLocalStorageStats());
  }, []);

  // Restablece ajustes a valores por defecto (preservando datos de usuario)
  const handleResetSettings = useCallback(() => {
    const defaults = resetStoredSettings();
    setSettings(defaults);
    setStorageStats(getLocalStorageStats());
  }, []);

  // Limpieza total destructiva autorizada explícitamente por el usuario
  const handleClearAllData = useCallback(() => {
    clearAllStoredData();
    setSettings({ ...DEFAULT_SETTINGS });
    setStorageStats(getLocalStorageStats());
  }, []);

  const refreshStorageStats = useCallback(() => {
    setStorageStats(getLocalStorageStats());
  }, []);

  // Formateador monetario centralizado vinculado a la divisa activa
  const formatMoney = useCallback(
    (value: number | null | undefined, fixedDecimals?: number): string => {
      return formatCurrency(value, settings.currency, fixedDecimals);
    },
    [settings.currency],
  );

  // Formateador compacto vinculado al símbolo de la divisa activa
  const currencyConfig = SUPPORTED_CURRENCIES[settings.currency] || SUPPORTED_CURRENCIES.EUR;

  const formatCompact = useCallback(
    (value: number | null | undefined): string => {
      return formatCompactNumber(value, currencyConfig.symbol);
    },
    [currencyConfig.symbol],
  );

  const contextValue: SettingsContextValue = useMemo(
    () => ({
      settings,
      currency: settings.currency,
      currencyConfig,
      theme: settings.theme,
      resolvedTheme,
      storageStats,
      setCurrency: handleSetCurrency,
      setTheme: handleSetTheme,
      updateSettings: handleUpdateSettings,
      resetSettings: handleResetSettings,
      clearAllData: handleClearAllData,
      refreshStorageStats,
      formatMoney,
      formatCompact,
    }),
    [
      settings,
      currencyConfig,
      resolvedTheme,
      storageStats,
      handleSetCurrency,
      handleSetTheme,
      handleUpdateSettings,
      handleResetSettings,
      handleClearAllData,
      refreshStorageStats,
      formatMoney,
      formatCompact,
    ],
  );

  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
};

// Valor de respaldo seguro si se invoca fuera de un <SettingsProvider> (ej. pruebas unitarias aisladas)
const createDefaultSettingsContext = (): SettingsContextValue => {
  const stored = getStoredSettings();
  const currencyMeta = SUPPORTED_CURRENCIES[stored.currency] || SUPPORTED_CURRENCIES.EUR;
  return {
    settings: stored,
    currency: stored.currency,
    currencyConfig: currencyMeta,
    theme: stored.theme,
    resolvedTheme: stored.theme === "system" ? "dark" : stored.theme,
    storageStats: getLocalStorageStats(),
    setCurrency: (c) => updateStoredSettings({ currency: c }),
    setTheme: (t) => updateStoredSettings({ theme: t }),
    updateSettings: (p) => updateStoredSettings(p),
    resetSettings: () => resetStoredSettings(),
    clearAllData: () => clearAllStoredData(),
    refreshStorageStats: () => {},
    formatMoney: (val, fixed) => formatCurrency(val, stored.currency, fixed),
    formatCompact: (val) => formatCompactNumber(val, currencyMeta.symbol),
  };
};

// Hook de acceso directo a los ajustes del sistema con respaldo transparente
// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (!context) {
    return createDefaultSettingsContext();
  }
  return context;
};
