import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { FC } from "react";
import type { Cryptocurrency, CryptoList } from "../../types/crypto";
import { getMarkets } from "../../services/api.ts";
import { useWatchlist } from "../../hooks/useWatchlist.ts";
import { formatCurrency, formatCompactNumber, formatRank } from "../../utils/formatters.ts";
import { VariationBadge } from "../ui/Badge.tsx";
import { CoinCard } from "../CoinCard.tsx";
import { FavoriteButton } from "../common/FavoriteButton.tsx";
import { LoadingSpinner } from "../common/LoadingSpinner.tsx";
import { ErrorMessage } from "../common/ErrorMessage.tsx";
import { MarketSparkline } from "../markets/MarketSparkline.tsx";

interface WatchlistViewProps {
  selectedCoin: Cryptocurrency | null;
  onSelectCoin: (coin: Cryptocurrency) => void;
  onNavigateToMarkets?: () => void;
  initialCoins?: CryptoList;
  currency?: string;
}

export interface WatchlistItem {
  coin: Cryptocurrency;
  hasMarketData: boolean;
}

export const WatchlistView: FC<WatchlistViewProps> = ({
  selectedCoin,
  onSelectCoin,
  onNavigateToMarkets,
  initialCoins,
  currency = "EUR",
}) => {
  const { watchlistIds, isFavorite, toggleFavorite, isStorageAvailable } = useWatchlist();

  // Registro en memoria de cotizaciones cargadas para resiliencia ante cortes o rate limits
  const [coinsMap, setCoinsMap] = useState<Map<string, Cryptocurrency>>(() => {
    const map = new Map<string, Cryptocurrency>();
    if (initialCoins && initialCoins.length > 0) {
      for (const coin of initialCoins) {
        map.set(coin.id.toLowerCase(), coin);
      }
    }
    return map;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const abortControllerRef = useRef<AbortController | null>(null);

  // Consulta los datos de mercado en tiempo real para todos los identificadores guardados
  const fetchWatchlistCoins = useCallback(async (ids: string[], ignoreCache = false) => {
    if (ids.length === 0) {
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await getMarkets({
        ids,
        vsCurrency: currency.toLowerCase(),
        sparkline: true,
        signal: controller.signal,
        ignoreCache,
      });

      if (controller.signal.aborted) {
        return;
      }

      setCoinsMap((prev) => {
        const next = new Map(prev);
        for (const coin of data) {
          next.set(coin.id.toLowerCase(), coin);
        }
        return next;
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      if (controller.signal.aborted) {
        return;
      }
      const message = err instanceof Error ? err.message : "Error al cargar datos de favoritos.";
      setErrorMsg(message);
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, [currency]);

  // Carga inicial y actualización automática al modificarse los favoritos guardados
  useEffect(() => {
    fetchWatchlistCoins(watchlistIds);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [watchlistIds, fetchWatchlistCoins]);

  const handleRetry = () => {
    fetchWatchlistCoins(watchlistIds, true);
  };

  // Construye la lista de elementos visible a partir de los IDs guardados en la watchlist
  const items: WatchlistItem[] = useMemo(() => {
    return watchlistIds.map((id) => {
      const normalizedId = id.trim().toLowerCase();
      const loaded = coinsMap.get(normalizedId);
      if (loaded) {
        return { coin: loaded, hasMarketData: true };
      }
      return {
        coin: {
          id: normalizedId,
          symbol: normalizedId.slice(0, 5).toUpperCase(),
          name: normalizedId.charAt(0).toUpperCase() + normalizedId.slice(1).replace(/-/g, " "),
          image: "",
          current_price: 0,
          market_cap: 0,
          market_cap_rank: 0,
          price_change_percentage_24h: 0,
          last_updated: "",
        },
        hasMarketData: false,
      };
    });
  }, [watchlistIds, coinsMap]);

  // Cantidad de activos guardados que no disponen de cotización en vivo
  const missingCount = useMemo(() => {
    return items.filter((item) => !item.hasMarketData).length;
  }, [items]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado de la Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-crypto-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-crypto-text tracking-tight">
              Mi Watchlist
            </h2>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-crypto-primary-soft text-crypto-accent border border-crypto-accent/30">
              {`${watchlistIds.length} ${watchlistIds.length === 1 ? "activo" : "activos"}`}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-crypto-text-secondary mt-1">
            Seguimiento selectivo de tus criptomonedas favoritas con cotizaciones en tiempo real en {currency}.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto text-xs font-mono text-crypto-text-muted">
          <span>Persistencia: {isStorageAvailable ? "LocalStorage" : "Memoria (restringido)"}</span>
          <span>•</span>
          <span>Fuente: CoinGecko v3</span>
        </div>
      </div>

      {/* Estado de Error */}
      {errorMsg && (
        <ErrorMessage
          message={errorMsg}
          onRetry={handleRetry}
        />
      )}

      {/* Estado de Carga Completa (solo cuando no hay cotizaciones previas) */}
      {isLoading && items.length > 0 && items.every((i) => !i.hasMarketData) && (
        <div className="py-16">
          <LoadingSpinner message="Consultando cotizaciones de tu watchlist en CoinGecko..." size="lg" />
        </div>
      )}

      {/* Estado Vacío Diseñado para Nuevos Usuarios */}
      {!isLoading && watchlistIds.length === 0 && (
        <div className="bg-crypto-surface rounded-xl border border-crypto-border p-8 sm:p-12 text-center max-w-xl mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-crypto-primary-soft border border-crypto-primary/40 text-crypto-warning flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-7 h-7"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-crypto-text mb-2 tracking-tight">
            Tu watchlist está vacía
          </h3>

          <p className="text-sm text-crypto-text-secondary mb-6 leading-relaxed">
            Personaliza tu seguimiento marcando cualquier criptomoneda con la estrella (★) desde el explorador de mercados o el panel de análisis.
          </p>

          <div className="p-3 mb-6 rounded-lg bg-crypto-surface-raised border border-crypto-border/60 text-xs text-crypto-text-muted font-mono text-left space-y-1">
            <div className="flex items-center gap-2 text-crypto-text">
              <span className="text-crypto-accent">ℹ</span>
              <span className="font-semibold">Almacenamiento local del navegador</span>
            </div>
            <p>
              Tus favoritos se conservan de forma privada en este navegador sin necesidad de registro ni sincronización externa.
            </p>
          </div>

          {onNavigateToMarkets && (
            <button
              type="button"
              onClick={onNavigateToMarkets}
              className="px-5 py-2.5 bg-crypto-primary hover:bg-crypto-primary-hover text-white text-xs font-semibold rounded-lg shadow-md shadow-crypto-primary/20 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>Explorar Mercados</span>
              <span>→</span>
            </button>
          )}
        </div>
      )}

      {/* Contenido con Datos de Favoritos (se muestra siempre que haya IDs, protegiendo contra errores de red) */}
      {items.length > 0 && (!isLoading || items.some((i) => i.hasMarketData)) && (
        <div className="bg-crypto-surface rounded-xl border border-crypto-border overflow-hidden shadow-lg">
          {/* Barra Superior con Controles de Vista */}
          <div className="p-4 sm:p-5 border-b border-crypto-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-crypto-text tracking-tight">
                Activos en Seguimiento
              </h3>
              <p className="text-xs text-crypto-text-muted mt-0.5 font-mono">
                {`${items.length} ${items.length === 1 ? "criptomoneda guardada" : "criptomonedas guardadas"}`}
                {missingCount > 0 ? ` (${items.length - missingCount} con cotización en vivo)` : " con cotización en vivo"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Aviso si algún activo guardado no devolvió datos */}
              {missingCount > 0 && (
                <span className="text-xs text-crypto-warning font-mono">
                  {`⚠ ${missingCount} ${missingCount === 1 ? "activo sin cotización" : "activos sin cotización"}`}
                </span>
              )}

              {/* Selector de Vista: Tabla / Tarjetas */}
              <div className="flex items-center bg-crypto-surface-raised rounded-lg p-0.5 border border-crypto-border">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  aria-label="Vista en tabla"
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "table"
                      ? "bg-crypto-surface-hover text-crypto-text shadow-sm"
                      : "text-crypto-text-muted hover:text-crypto-text"
                  }`}
                  title="Vista en tabla"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  aria-label="Vista en tarjetas"
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "cards"
                      ? "bg-crypto-surface-hover text-crypto-text shadow-sm"
                      : "text-crypto-text-muted hover:text-crypto-text"
                  }`}
                  title="Vista en tarjetas"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Vista en Tarjetas */}
          {viewMode === "cards" && (
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map(({ coin, hasMarketData }) => (
                <div key={coin.id} className="relative group">
                  <CoinCard
                    coin={coin}
                    isSelected={selectedCoin?.id === coin.id}
                    onSelect={onSelectCoin}
                    isFavorite={isFavorite(coin.id)}
                    onToggleFavorite={toggleFavorite}
                    currency={currency}
                  />
                  {!hasMarketData && (
                    <div className="absolute top-2 right-12 z-10">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-crypto-warning/20 text-crypto-warning border border-crypto-warning/40">
                        Sin cotización
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Vista en Tabla Financiera */}
          {viewMode === "table" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-crypto-surface-raised/80 border-b border-crypto-border text-[11px] font-mono uppercase tracking-wider text-crypto-text-muted select-none">
                  <tr>
                    <th className="py-3 px-3 text-center w-10">★</th>
                    <th className="py-3 px-3 sm:px-4 text-center w-12">#</th>
                    <th className="py-3 px-3 sm:px-4">Activo</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Precio</th>
                    <th className="py-3 px-3 sm:px-4 text-right">24 h</th>
                    <th className="hidden sm:table-cell py-3 px-3 sm:px-4 text-right">Capitalización</th>
                    <th className="hidden md:table-cell py-3 px-3 sm:px-4 text-right">Volumen 24 h</th>
                    <th className="hidden lg:table-cell py-3 px-3 sm:px-4 text-center">Últimos 7 días</th>
                    <th className="py-3 px-3 sm:px-4 text-center">Acción</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-crypto-border/50">
                  {items.map(({ coin, hasMarketData }) => {
                    const isSelected = selectedCoin?.id === coin.id;
                    return (
                      <tr
                        key={coin.id}
                        onClick={() => onSelectCoin(coin)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-crypto-primary-soft/40 font-medium border-l-2 border-crypto-primary"
                            : "hover:bg-crypto-surface-hover/60"
                        }`}
                      >
                        {/* Botón de Favorito */}
                        <td className="py-3.5 px-3 text-center">
                          <FavoriteButton
                            coinId={coin.id}
                            coinName={coin.name}
                            isFavorite={isFavorite(coin.id)}
                            onToggle={toggleFavorite}
                            size="sm"
                          />
                        </td>

                        {/* Ranking */}
                        <td className="py-3.5 px-3 sm:px-4 text-center font-mono text-xs text-crypto-text-muted">
                          {hasMarketData && coin.market_cap_rank ? formatRank(coin.market_cap_rank) : "—"}
                        </td>

                        {/* Activo: Icono + Nombre + Símbolo */}
                        <td className="py-3.5 px-3 sm:px-4">
                          <div className="flex items-center gap-3">
                            {coin.image ? (
                              <img
                                src={coin.image}
                                alt={coin.name}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-crypto-surface-raised p-0.5 object-contain flex-shrink-0"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-crypto-surface-raised border border-crypto-border flex items-center justify-center font-mono font-bold text-xs text-crypto-text-muted flex-shrink-0">
                                {coin.symbol.slice(0, 2)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-crypto-text text-xs sm:text-sm truncate">
                                {coin.name}
                              </div>
                              <span className="text-[11px] text-crypto-text-muted uppercase font-mono font-medium">
                                {coin.symbol.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Precio Actual */}
                        <td className="py-3.5 px-3 sm:px-4 text-right font-mono font-bold text-crypto-text tabular-nums">
                          {hasMarketData ? (
                            formatCurrency(coin.current_price, currency)
                          ) : (
                            <span className="text-crypto-text-muted font-normal text-xs font-mono">—</span>
                          )}
                        </td>

                        {/* Variación 24h */}
                        <td className="py-3.5 px-3 sm:px-4 text-right">
                          {hasMarketData ? (
                            <VariationBadge value={coin.price_change_percentage_24h} size="sm" />
                          ) : (
                            <span className="text-[10px] font-mono text-crypto-text-muted px-1.5 py-0.5 rounded bg-crypto-surface-raised border border-crypto-border/50">
                              No disponible
                            </span>
                          )}
                        </td>

                        {/* Capitalización */}
                        <td className="hidden sm:table-cell py-3.5 px-3 sm:px-4 text-right font-mono text-crypto-text-secondary tabular-nums">
                          {hasMarketData && coin.market_cap ? formatCompactNumber(coin.market_cap, currency) : "—"}
                        </td>

                        {/* Volumen 24h */}
                        <td className="hidden md:table-cell py-3.5 px-3 sm:px-4 text-right font-mono text-crypto-text-secondary tabular-nums">
                          {hasMarketData && coin.total_volume ? formatCompactNumber(coin.total_volume, currency) : "—"}
                        </td>

                        {/* Minigráfico de 7 días */}
                        <td className="hidden lg:table-cell py-3 px-3 sm:px-4 text-center">
                          {hasMarketData && coin.sparkline_in_7d?.price ? (
                            <MarketSparkline
                              prices={coin.sparkline_in_7d?.price}
                              coinName={coin.name}
                              width={110}
                              height={32}
                            />
                          ) : (
                            <span className="text-crypto-text-muted font-mono text-xs">—</span>
                          )}
                        </td>

                        {/* Acción: Seleccionar activo */}
                        <td className="py-3.5 px-3 sm:px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCoin(coin);
                            }}
                            className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-crypto-primary text-white shadow-sm shadow-crypto-primary/30"
                                : "bg-crypto-surface-hover text-crypto-text-secondary hover:text-crypto-text hover:bg-crypto-surface-raised border border-crypto-border"
                            }`}
                          >
                            {isSelected ? "Activo" : "Detalle"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
