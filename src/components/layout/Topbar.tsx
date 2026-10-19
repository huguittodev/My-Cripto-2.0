import type { FC, FormEvent } from "react";
import { StatusBadge } from "../ui/Badge.tsx";
import { formatDateTime } from "../../utils/formatters.ts";
import { useSettings } from "../../context/SettingsContext.tsx";
import { SUPPORTED_CURRENCIES } from "../../types/settings.ts";

interface TopbarProps {
  onOpenMobileMenu: () => void;
  sectionTitle: string;
  sectionSubtitle: string;
  numCryptos: string;
  onChangeNumCryptos: (value: string) => void;
  onSubmitNumCryptos: (e: FormEvent) => void;
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdated: string | null;
  hasError: boolean;
}

export const Topbar: FC<TopbarProps> = ({
  onOpenMobileMenu,
  sectionTitle,
  sectionSubtitle,
  numCryptos,
  onChangeNumCryptos,
  onSubmitNumCryptos,
  onRefresh,
  isLoading,
  lastUpdated,
  hasError,
}) => {
  const { currency } = useSettings();
  const currencyMeta = SUPPORTED_CURRENCIES[currency] || { symbol: "€", label: "EUR" };
  return (
    <header className="h-16 lg:h-20 bg-crypto-surface/85 backdrop-blur-md border-b border-crypto-border sticky top-0 z-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Section Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-crypto-text-secondary hover:text-crypto-text hover:bg-crypto-surface-hover border border-crypto-border"
          aria-label="Abrir menú"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-crypto-text truncate">
              {sectionTitle}
            </h1>
            <div className="hidden sm:inline-flex">
              {hasError ? (
                <StatusBadge variant="neutral">Desconectado</StatusBadge>
              ) : (
                <StatusBadge variant="live">CoinGecko v3</StatusBadge>
              )}
            </div>
          </div>
          <p className="hidden md:block text-xs text-crypto-text-muted truncate">
            {sectionSubtitle}
          </p>
        </div>
      </div>

      {/* Right: API Controls & Data Feed Info */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Base Currency Badge (Real: CoinGecko vs_currency) */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-crypto-surface-raised border border-crypto-border text-xs font-mono text-crypto-text-secondary whitespace-nowrap flex-shrink-0">
          <span className="text-crypto-text-muted">Moneda:</span>
          <span className="font-semibold text-crypto-text">{currency} ({currencyMeta.symbol})</span>
        </div>

        {/* Last updated indicator */}
        {lastUpdated && (
          <div className="hidden lg:flex flex-col text-right whitespace-nowrap flex-shrink-0">
            <span className="text-[10px] text-crypto-text-muted uppercase font-mono tracking-wider whitespace-nowrap">
              Última sinc.
            </span>
            <span className="text-xs font-mono text-crypto-text-secondary whitespace-nowrap">
              {formatDateTime(lastUpdated)}
            </span>
          </div>
        )}

        {/* Cryptos Count Form (Preserves previous interaction) */}
        <form
          onSubmit={onSubmitNumCryptos}
          className="flex items-center bg-crypto-surface-raised rounded-lg border border-crypto-border focus-within:border-crypto-primary transition-colors"
        >
          <div className="flex items-center pl-2.5 text-xs text-crypto-text-muted font-mono">
            <span>Top</span>
          </div>
          <input
            type="number"
            min="1"
            max="250"
            value={numCryptos}
            onChange={(e) => onChangeNumCryptos(e.target.value)}
            placeholder="10"
            className="w-12 sm:w-14 bg-transparent text-crypto-text text-xs sm:text-sm font-mono font-bold px-2 py-1.5 focus:outline-none text-center"
            title="Número de criptomonedas a consultar en la API"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-2.5 sm:px-3 py-1.5 bg-crypto-surface-hover hover:bg-crypto-primary hover:text-white text-crypto-text-secondary text-xs font-semibold rounded-r-lg transition-colors border-l border-crypto-border disabled:opacity-50"
          >
            {isLoading ? "..." : "Cargar"}
          </button>
        </form>

        {/* Refresh button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-crypto-surface-hover hover:bg-crypto-surface-raised text-crypto-text-secondary hover:text-crypto-text border border-crypto-border transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
          title="Actualizar datos desde la API"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-4 h-4 ${isLoading ? "animate-spin text-crypto-accent" : ""}`}
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
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>
    </header>
  );
};
