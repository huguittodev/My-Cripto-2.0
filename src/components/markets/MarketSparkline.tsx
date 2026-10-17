import { useId } from "react";
import type { FC } from "react";

interface MarketSparklineProps {
  prices?: number[];
  coinName?: string;
  isPositive?: boolean;
  width?: number;
  height?: number;
}

// Genera una curva suave continua en SVG mediante interpolación de puntos
function buildSparklinePath(
  coords: { x: number; y: number }[],
): string {
  if (coords.length === 0) return "";
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

  let path = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;

  for (let i = 0; i < coords.length - 1; i++) {
    const current = coords[i];
    const next = coords[i + 1];
    const prev = coords[i - 1] || current;
    const nextNext = coords[i + 2] || next;

    // Tensión ligera para suavizar picos sin distorsionar la tendencia real
    const tension = 0.15;
    const cp1x = current.x + (next.x - prev.x) * tension;
    const cp1y = current.y + (next.y - prev.y) * tension;
    const cp2x = next.x - (nextNext.x - current.x) * tension;
    const cp2y = next.y - (nextNext.y - current.y) * tension;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }

  return path;
}

export const MarketSparkline: FC<MarketSparklineProps> = ({
  prices,
  coinName = "activo",
  isPositive,
  width = 110,
  height = 34,
}) => {
  const gradientId = useId();

  // Gestión explícita de ausencia de datos: nunca genera datos inventados
  if (!prices || prices.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-crypto-text-muted text-[11px] font-mono h-8 w-24 select-none"
        title="Historial de 7 días no disponible"
        aria-label={`Historial de 7 días no disponible para ${coinName}`}
      >
        <span className="opacity-50">—</span>
      </div>
    );
  }

  const startPrice = prices[0];
  const endPrice = prices[prices.length - 1];
  const positive = isPositive !== undefined ? isPositive : endPrice >= startPrice;
  const strokeColor = positive ? "#22C55E" : "#F87171";

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const paddingY = 3;
  const usableHeight = height - paddingY * 2;
  const stepX = width / (prices.length - 1);

  // Mapeo proporcional a coordenadas en pantalla
  const coords = prices.map((price, idx) => ({
    x: idx * stepX,
    y: paddingY + (1 - (price - minPrice) / priceRange) * usableHeight,
  }));

  const linePath = buildSparklinePath(coords);
  const lastX = coords[coords.length - 1].x;
  const firstX = coords[0].x;
  const bottomY = height;
  const areaPath = `${linePath} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;

  return (
    <div
      className="inline-flex items-center select-none"
      role="img"
      aria-label={`Evolución 7 días de ${coinName}: ${positive ? "tendencia alcista" : "tendencia bajista"}`}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Área bajo la curva con gradiente semántico suave */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Línea de cotización de 7 días */}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Punto representativo en el extremo final de la serie */}
        <circle
          cx={coords[coords.length - 1].x}
          cy={coords[coords.length - 1].y}
          r="2"
          fill={strokeColor}
        />
      </svg>
    </div>
  );
};
