import { useRef, useCallback } from "react";
import type { FC, PointerEvent } from "react";
import type { ChartPoint, HistoricalPriceData } from "../../types/crypto";
import { formatCurrency, formatPercentage, formatDateTime, formatChartAxisDate } from "../../utils/formatters.ts";

interface InteractivePriceChartProps {
  data: HistoricalPriceData | null;
  isLoading: boolean;
  errorMsg: string | null;
  onRetry?: () => void;
  hoveredPoint: ChartPoint | null;
  onHoverPoint: (point: ChartPoint | null) => void;
}

const SVG_WIDTH = 800;
const SVG_HEIGHT = 220;
const PADDING_TOP = 15;
const PADDING_BOTTOM = 30;
const PADDING_LEFT = 10;
const PADDING_RIGHT = 10;

// Construye una curva suave SVG (Cubic Bezier) a partir de coordenadas cartesianas
function buildSmoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return "";
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

  let path = `M ${coords[0].x} ${coords[0].y}`;

  for (let i = 0; i < coords.length - 1; i++) {
    const current = coords[i];
    const next = coords[i + 1];
    const prev = coords[i - 1] || current;
    const nextNext = coords[i + 2] || next;

    // Puntos de control para interpolación Catmull-Rom a Bezier
    const tension = 0.2;
    const cp1x = current.x + (next.x - prev.x) * tension;
    const cp1y = current.y + (next.y - prev.y) * tension;
    const cp2x = next.x - (nextNext.x - current.x) * tension;
    const cp2y = next.y - (nextNext.y - current.y) * tension;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }

  return path;
}

export const InteractivePriceChart: FC<InteractivePriceChartProps> = ({
  data,
  isLoading,
  errorMsg,
  onRetry,
  hoveredPoint,
  onHoverPoint,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mapea la posición del puntero al punto más cercano en la serie temporal
  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!data || data.points.length < 2 || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const relativeX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const ratio = relativeX / rect.width;

      const points = data.points;
      const minTime = points[0].timestamp;
      const maxTime = points[points.length - 1].timestamp;
      const targetTime = minTime + ratio * (maxTime - minTime);

      // Búsqueda binaria para encontrar el punto temporal más cercano en O(log n)
      let low = 0;
      let high = points.length - 1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (points[mid].timestamp < targetTime) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      // Compara el punto antes y después para determinar el más próximo
      const idx1 = Math.max(0, Math.min(low, points.length - 1));
      const idx2 = Math.max(0, Math.min(high, points.length - 1));
      const diff1 = Math.abs(points[idx1].timestamp - targetTime);
      const diff2 = Math.abs(points[idx2].timestamp - targetTime);
      const closestPoint = diff1 < diff2 ? points[idx1] : points[idx2];

      onHoverPoint(closestPoint);
    },
    [data, onHoverPoint],
  );

  const handlePointerLeave = useCallback(() => {
    onHoverPoint(null);
  }, [onHoverPoint]);

  // Estado de carga con esqueleto visual interactivo
  if (isLoading) {
    return (
      <div className="relative w-full h-56 sm:h-64 rounded-xl bg-crypto-surface-hover/30 border border-crypto-border flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-crypto-surface-raised/40 to-transparent -translate-x-full animate-[shimmer_1.8s_infinite]" />
        <div className="flex flex-col items-center gap-2 text-crypto-text-muted z-10 font-mono text-xs">
          <div className="w-8 h-8 rounded-full border-2 border-crypto-primary/40 border-t-crypto-accent animate-spin" />
          <span>Sincronizando serie histórica desde CoinGecko...</span>
        </div>
      </div>
    );
  }

  // Estado de error amigable con opción de reintento
  if (errorMsg) {
    return (
      <div className="w-full h-56 sm:h-64 rounded-xl bg-crypto-negative-soft/20 border border-crypto-negative/30 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-full bg-crypto-negative-soft text-crypto-negative flex items-center justify-center mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h4 className="text-sm font-semibold text-crypto-text mb-1">
          No se pudo cargar la serie de precios
        </h4>
        <p className="text-xs text-crypto-text-secondary max-w-md mb-4 font-mono">
          {errorMsg}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-3.5 py-1.5 bg-crypto-surface-raised hover:bg-crypto-surface-hover text-crypto-accent text-xs font-semibold rounded-lg border border-crypto-border transition-colors cursor-pointer"
          >
            Reintentar consulta
          </button>
        )}
      </div>
    );
  }

  // Estado sin datos válidos
  if (!data || data.points.length === 0) {
    return (
      <div className="w-full h-56 sm:h-64 rounded-xl bg-crypto-surface-hover/20 border border-dashed border-crypto-border flex flex-col items-center justify-center p-6 text-center">
        <p className="text-xs text-crypto-text-muted font-mono">
          No hay datos históricos disponibles para el periodo seleccionado.
        </p>
      </div>
    );
  }

  const { points, minPrice, maxPrice, performance } = data;
  const isPositive = performance.isPositive;
  const strokeColor = isPositive ? "#22C55E" : "#F87171";
  const gradientId = `chart-gradient-${data.coinId}-${data.days}`;

  const minTime = points[0].timestamp;
  const maxTime = points[points.length - 1].timestamp;
  const timeSpan = maxTime - minTime || 1;
  const priceSpan = maxPrice - minPrice || 1;

  const usableWidth = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const usableHeight = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  // Calcula las coordenadas cartesianas de cada punto en el canvas SVG
  const coords = points.map((p) => {
    const x = PADDING_LEFT + ((p.timestamp - minTime) / timeSpan) * usableWidth;
    const y = PADDING_TOP + (1 - (p.price - minPrice) / priceSpan) * usableHeight;
    return { x, y };
  });

  const linePath = buildSmoothPath(coords);
  const firstX = coords[0].x;
  const lastX = coords[coords.length - 1].x;
  const bottomY = SVG_HEIGHT - PADDING_BOTTOM;
  const areaPath = `${linePath} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;

  // Coordenadas del punto interactivo bajo el cursor y porcentaje para el tooltip
  let hoverCoord: { x: number; y: number } | null = null;
  let tooltipPos: { xPercent: number; yPercent: number } | null = null;

  if (hoveredPoint) {
    const x = PADDING_LEFT + ((hoveredPoint.timestamp - minTime) / timeSpan) * usableWidth;
    const y = PADDING_TOP + (1 - (hoveredPoint.price - minPrice) / priceSpan) * usableHeight;
    hoverCoord = { x, y };

    const pointRatio = (hoveredPoint.timestamp - minTime) / (timeSpan || 1);
    const priceRatio = (hoveredPoint.price - minPrice) / (priceSpan || 1);
    tooltipPos = {
      xPercent: pointRatio * 100,
      yPercent: (1 - priceRatio) * 100,
    };
  }

  // Etiquetas del eje temporal (4 puntos representativos)
  const timeLabels = [
    points[0].timestamp,
    points[Math.floor(points.length * 0.33)].timestamp,
    points[Math.floor(points.length * 0.66)].timestamp,
    points[points.length - 1].timestamp,
  ];

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative w-full h-56 sm:h-64 select-none cursor-crosshair touch-none"
    >
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.28} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Guías horizontales de precios (Máximo, Medio, Mínimo) */}
        <line
          x1={PADDING_LEFT}
          y1={PADDING_TOP}
          x2={SVG_WIDTH - PADDING_RIGHT}
          y2={PADDING_TOP}
          stroke="#293750"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
        <text
          x={SVG_WIDTH - PADDING_RIGHT}
          y={PADDING_TOP - 4}
          textAnchor="end"
          fill="#77869F"
          fontSize="9"
          fontFamily="monospace"
        >
          Máx: {formatCurrency(maxPrice)}
        </text>

        <line
          x1={PADDING_LEFT}
          y1={PADDING_TOP + usableHeight / 2}
          x2={SVG_WIDTH - PADDING_RIGHT}
          y2={PADDING_TOP + usableHeight / 2}
          stroke="#1C2942"
          strokeDasharray="2 4"
          strokeWidth="1"
        />

        <line
          x1={PADDING_LEFT}
          y1={bottomY}
          x2={SVG_WIDTH - PADDING_RIGHT}
          y2={bottomY}
          stroke="#293750"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
        <text
          x={SVG_WIDTH - PADDING_RIGHT}
          y={bottomY + 14}
          textAnchor="end"
          fill="#77869F"
          fontSize="9"
          fontFamily="monospace"
        >
          Mín: {formatCurrency(minPrice)}
        </text>

        {/* Área rellena con degradado semántico */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Trazo continuo de la serie temporal */}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Elementos interactivos cuando el usuario pasa el cursor */}
        {hoverCoord && (
          <g>
            {/* Línea vertical de mira (crosshair) */}
            <line
              x1={hoverCoord.x}
              y1={PADDING_TOP}
              x2={hoverCoord.x}
              y2={bottomY}
              stroke="#60A5FA"
              strokeDasharray="3 3"
              strokeWidth="1.2"
              opacity="0.8"
            />

            {/* Círculo exterior con halo */}
            <circle
              cx={hoverCoord.x}
              cy={hoverCoord.y}
              r="6"
              fill={strokeColor}
              opacity="0.4"
            />

            {/* Punto central destacado */}
            <circle
              cx={hoverCoord.x}
              cy={hoverCoord.y}
              r="3.5"
              fill="#FFFFFF"
              stroke={strokeColor}
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Etiquetas del eje X inferior */}
      <div className="flex justify-between px-2 mt-1 text-[10px] font-mono text-crypto-text-muted">
        {timeLabels.map((ts, idx) => (
          <span key={`time-axis-${ts}-${idx}`}>
            {formatChartAxisDate(ts, data.days)}
          </span>
        ))}
      </div>

      {/* Tooltip flotante interactivo con fecha, precio y variación */}
      {hoveredPoint && tooltipPos && (
        <div
          style={{
            left: `${Math.max(12, Math.min(tooltipPos.xPercent, 88))}%`,
            top: `${Math.max(10, Math.min(tooltipPos.yPercent, 65))}%`,
          }}
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-full mb-3 z-30 transition-all duration-75"
        >
          <div className="bg-crypto-surface-raised/95 backdrop-blur border border-crypto-border px-3 py-2 rounded-lg shadow-xl text-left whitespace-nowrap min-w-[140px]">
            <div className="text-[10px] text-crypto-text-muted font-mono mb-0.5">
              {formatDateTime(hoveredPoint.timestamp)}
            </div>
            <div className="text-sm font-bold text-crypto-text font-mono tabular-nums">
              {formatCurrency(hoveredPoint.price)}
            </div>
            {performance.startPrice > 0 && (
              <div className="text-[10px] font-mono font-semibold mt-0.5 flex items-center gap-1">
                <span className="text-crypto-text-muted">vs inicio:</span>
                <span
                  className={
                    hoveredPoint.price >= performance.startPrice
                      ? "text-crypto-positive"
                      : "text-crypto-negative"
                  }
                >
                  {formatPercentage(
                    ((hoveredPoint.price / performance.startPrice) - 1) * 100,
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
