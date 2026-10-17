import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { PortfolioSummaryRow } from "./PortfolioSummaryRow.tsx";
import type { PortfolioSummary } from "../../types/crypto";

describe("PortfolioSummaryRow Component", () => {
  it("debe renderizar correctamente las 5 métricas clave de la cartera", () => {
    const mockSummary: PortfolioSummary = {
      totalCurrentValue: 125000.5,
      totalCostBasis: 100000,
      totalUnrealizedPnl: 25000.5,
      totalUnrealizedPnlPercentage: 25.0,
      totalRealizedPnl: 5000,
      totalFees: 35,
      hasUnavailablePrices: false,
      positionCount: 3,
      transactionCount: 5,
    };

    const html = renderToString(
      <PortfolioSummaryRow summary={mockSummary} isLoadingPrices={false} />,
    );

    // Debe incluir etiquetas de las 5 métricas
    expect(html).toContain("Valor Total de Cartera");
    expect(html).toContain("Coste de Adquisición");
    expect(html).toContain("P&amp;L No Realizado");
    expect(html).toContain("P&amp;L Realizado");
    expect(html).toContain("Comisiones Pagadas");

    // Debe contener el badge de ganancia cerrada
    expect(html).toContain("Ganancia cerrada");
  });

  it("debe mostrar indicación de precios no disponibles cuando corresponde", () => {
    const mockSummary: PortfolioSummary = {
      totalCurrentValue: 50000,
      totalCostBasis: 45000,
      totalUnrealizedPnl: 5000,
      totalUnrealizedPnlPercentage: 11.11,
      totalRealizedPnl: 0,
      totalFees: 10,
      hasUnavailablePrices: true,
      positionCount: 2,
      transactionCount: 2,
    };

    const html = renderToString(
      <PortfolioSummaryRow summary={mockSummary} isLoadingPrices={false} />,
    );

    expect(html).toContain("Excluye activos sin cotización actual");
  });
});
