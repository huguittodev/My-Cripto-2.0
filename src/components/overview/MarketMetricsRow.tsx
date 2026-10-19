import type { FC } from "react";
import type { CryptoList, GlobalMarketData } from "../../types/crypto";
import { MetricCard } from "../ui/MetricCard.tsx";
import { VariationBadge } from "../ui/Badge.tsx";
import { formatCompactNumber, formatCurrency, formatPercentage } from "../../utils/formatters.ts";

interface MarketMetricsRowProps {
  coins: CryptoList;
  globalData: GlobalMarketData | null;
  isLoading: boolean;
  currency?: string;
}

export const MarketMetricsRow: FC<MarketMetricsRowProps> = ({
  coins,
  globalData,
  isLoading,
  currency = "EUR",
}) => {
  if (coins.length === 0 && !globalData && !isLoading) {
    return null;
  }

  // Fallbacks calculados a partir de la muestra en caso de que los datos globales no estén listos
  const totalMarketCapSample = coins.reduce(
    (acc, coin) => acc + (coin.market_cap || 0),
    0,
  );
  const leaderCoin = coins.find((c) => c.symbol.toLowerCase() === "btc") || coins[0];
  const avgChangeSample =
    coins.length > 0
      ? coins.reduce((acc, c) => acc + (c.price_change_percentage_24h || 0), 0) /
        coins.length
      : 0;

  // Distribución responsive adaptada al ancho disponible (evita compresión extrema en breakpoints con sidebar)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Métrica 1: Capitalización Total del Mercado */}
      <MetricCard
        label="Cap. Total Mercado"
        value={
          isLoading
            ? "Cargando..."
            : globalData
              ? formatCompactNumber(globalData.total_market_cap_eur, currency)
              : formatCompactNumber(totalMarketCapSample, currency)
        }
        subValue={
          <span className="text-[11px] text-crypto-text-muted">
            {globalData
              ? `Valor global del mercado en ${currency}`
              : `Muestra de los ${coins.length} activos cargados`}
          </span>
        }
        tooltip="Capitalización total acumulada de todas las criptomonedas del mercado (CoinGecko /global)"
        accentColor="primary"
      />

      {/* Métrica 2: Volumen de Negociación 24h */}
      <MetricCard
        label="Volumen Total (24h)"
        value={
          isLoading
            ? "Cargando..."
            : globalData
              ? formatCompactNumber(globalData.total_volume_eur, currency)
              : "—"
        }
        subValue={
          <span className="text-[11px] text-crypto-text-muted">
            {globalData
              ? "Volumen transaccionado en 24h"
              : "Pendiente de sincronización"}
          </span>
        }
        tooltip="Volumen global de transacciones en el mercado cripto en las últimas 24 horas"
        accentColor="default"
      />

      {/* Métrica 3: Dominancia de Bitcoin */}
      <MetricCard
        label="Dominancia Bitcoin"
        value={
          isLoading
            ? "Cargando..."
            : globalData
              ? formatPercentage(globalData.btc_dominance, false)
              : "—"
        }
        badge={
          leaderCoin && !isLoading ? (
            <span className="text-[11px] font-mono text-crypto-text-muted whitespace-nowrap">
              BTC: {formatCurrency(leaderCoin.current_price, currency)}
            </span>
          ) : undefined
        }
        subValue={
          <span className="text-[11px] text-crypto-text-muted">
            Cuota de mercado atribuida a BTC
          </span>
        }
        tooltip="Porcentaje de la capitalización total del mercado correspondiente a Bitcoin"
        accentColor="accent"
      />

      {/* Métrica 4: Variación Global del Mercado (24h) - Porcentaje indivisible en una única línea */}
      <MetricCard
        label="Variación Global (24h)"
        value={
          isLoading
            ? "—"
            : globalData
              ? formatPercentage(globalData.market_cap_change_percentage_24h, true)
              : formatPercentage(avgChangeSample, true)
        }
        badge={
          !isLoading && globalData ? (
            <VariationBadge
              value={globalData.market_cap_change_percentage_24h}
              size="sm"
            />
          ) : !isLoading && coins.length > 0 ? (
            <VariationBadge value={avgChangeSample} size="sm" />
          ) : undefined
        }
        subValue={
          <span className="text-[11px] text-crypto-text-muted">
            {globalData
              ? "Cambio consolidado del mercado (24h)"
              : `Media de la muestra (${coins.length} activos)`}
          </span>
        }
        tooltip="Variación porcentual de la capitalización total del mercado en las últimas 24 horas"
        accentColor="default"
      />
    </div>
  );
};
