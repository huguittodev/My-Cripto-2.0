import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { InteractivePriceChart } from "./InteractivePriceChart";
import { TimeframeSelector } from "./TimeframeSelector";
import { AssetPerformanceHeader } from "./AssetPerformanceHeader";
import type { HistoricalPriceData, ChartPoint } from "../../types/crypto";

describe("InteractivePriceChart - Estados de la interfaz", () => {
  const mockChartData: HistoricalPriceData = {
    coinId: "bitcoin",
    days: 7,
    points: [
      { timestamp: 1729200000000, price: 60000 },
      { timestamp: 1729203600000, price: 62000 },
      { timestamp: 1729207200000, price: 66000 },
    ],
    performance: {
      startPrice: 60000,
      endPrice: 66000,
      absoluteChange: 6000,
      percentageChange: 10,
      isPositive: true,
      isValid: true,
    },
    minPrice: 60000,
    maxPrice: 66000,
  };

  it("debe renderizar el estado de carga (skeleton animado)", () => {
    const html = renderToString(
      <InteractivePriceChart
        data={null}
        isLoading={true}
        errorMsg={null}
        hoveredPoint={null}
        onHoverPoint={() => {}}
      />,
    );

    expect(html).toContain("Sincronizando serie histórica desde CoinGecko...");
    expect(html).toContain("animate-spin");
  });

  it("debe renderizar el gráfico con datos válidos correctamente", () => {
    const html = renderToString(
      <InteractivePriceChart
        data={mockChartData}
        isLoading={false}
        errorMsg={null}
        hoveredPoint={null}
        onHoverPoint={() => {}}
      />,
    );

    // Debe contener el elemento SVG y la curva
    expect(html).toContain("<svg");
    expect(html).toContain("<path");
    // Al ser rendimiento positivo (10%), debe usar el color verde crypto-positive (#22C55E)
    expect(html).toContain("#22C55E");
    // Debe mostrar las cotizaciones máxima y mínima de guía
    expect(html).toContain("Máx:");
    expect(html).toContain("Mín:");
  });

  it("debe renderizar el color negativo cuando el rendimiento sea bajista", () => {
    const bearishData: HistoricalPriceData = {
      ...mockChartData,
      performance: {
        startPrice: 60000,
        endPrice: 54000,
        absoluteChange: -6000,
        percentageChange: -10,
        isPositive: false,
        isValid: true,
      },
      minPrice: 54000,
      maxPrice: 60000,
    };

    const html = renderToString(
      <InteractivePriceChart
        data={bearishData}
        isLoading={false}
        errorMsg={null}
        hoveredPoint={null}
        onHoverPoint={() => {}}
      />,
    );

    // Debe aplicar el color rojo semántico (#F87171)
    expect(html).toContain("#F87171");
  });

  it("debe renderizar el estado de error con mensaje explicativo y botón de reintento", () => {
    const html = renderToString(
      <InteractivePriceChart
        data={null}
        isLoading={false}
        errorMsg="Límite de peticiones alcanzado (HTTP 429)."
        onRetry={() => {}}
        hoveredPoint={null}
        onHoverPoint={() => {}}
      />,
    );

    expect(html).toContain("No se pudo cargar la serie de precios");
    expect(html).toContain("HTTP 429");
    expect(html).toContain("Reintentar consulta");
  });

  it("debe renderizar el estado de ausencia de datos cuando points esté vacío", () => {
    const emptyData: HistoricalPriceData = {
      ...mockChartData,
      points: [],
    };

    const html = renderToString(
      <InteractivePriceChart
        data={emptyData}
        isLoading={false}
        errorMsg={null}
        hoveredPoint={null}
        onHoverPoint={() => {}}
      />,
    );

    expect(html).toContain("No hay datos históricos disponibles");
  });

  it("debe renderizar el punto inspeccionado cuando hoveredPoint esté activo", () => {
    const hoveredPoint: ChartPoint = {
      timestamp: 1729203600000,
      price: 62000,
    };

    const html = renderToString(
      <InteractivePriceChart
        data={mockChartData}
        isLoading={false}
        errorMsg={null}
        hoveredPoint={hoveredPoint}
        onHoverPoint={() => {}}
      />,
    );

    // Debe renderizar la línea de mira vertical y el tooltip
    expect(html).toContain("stroke=\"#60A5FA\"");
    expect(html).toContain("vs inicio:");
  });
});

describe("TimeframeSelector", () => {
  it("debe renderizar los 5 rangos temporales admitidos (24H, 7D, 30D, 90D, 1A)", () => {
    const html = renderToString(
      <TimeframeSelector selectedDays={7} onSelectDays={() => {}} />,
    );

    expect(html).toContain("24H");
    expect(html).toContain("7D");
    expect(html).toContain("30D");
    expect(html).toContain("90D");
    expect(html).toContain("1A");
  });

  it("debe marcar como activo (aria-pressed='true') el periodo seleccionado", () => {
    const html = renderToString(
      <TimeframeSelector selectedDays={30} onSelectDays={() => {}} />,
    );

    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("bg-crypto-primary");
  });
});

describe("AssetPerformanceHeader", () => {
  it("debe renderizar la variación del periodo y el precio final", () => {
    const html = renderToString(
      <AssetPerformanceHeader
        days={7}
        performance={{
          startPrice: 50000,
          endPrice: 55000,
          absoluteChange: 5000,
          percentageChange: 10,
          isPositive: true,
          isValid: true,
        }}
        hoveredPoint={null}
        isLoading={false}
      />,
    );

    expect(html).toContain("Rendimiento");
    expect(html).toContain("7 Días");
    expect(html).toContain("+10,00 %");
    expect(html).toContain("55.000,00");
  });

  it("debe mostrar el esqueleto de carga cuando isLoading sea true", () => {
    const html = renderToString(
      <AssetPerformanceHeader
        days={1}
        performance={null}
        hoveredPoint={null}
        isLoading={true}
      />,
    );

    expect(html).toContain("animate-pulse");
  });
});
