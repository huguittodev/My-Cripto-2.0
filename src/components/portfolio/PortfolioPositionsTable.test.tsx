import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { PortfolioPositionsTable } from "./PortfolioPositionsTable.tsx";
import type { PortfolioPosition } from "../../types/crypto";

describe("PortfolioPositionsTable Component", () => {
  it("debe retornar null cuando no existen posiciones", () => {
    const html = renderToString(
      <PortfolioPositionsTable positions={[]} onOpenTrade={vi.fn()} isLoadingPrices={false} />,
    );
    expect(html).toBe("");
  });

  it("debe renderizar filas de posiciones con activos y formato financiero", () => {
    const mockPositions: PortfolioPosition[] = [
      {
        coinId: "bitcoin",
        coinName: "Bitcoin",
        coinSymbol: "BTC",
        coinImage: "https://example.com/btc.png",
        amount: 1.5,
        totalCostBasis: 60000,
        averageBuyPrice: 40000,
        currentPrice: 65000,
        currentValue: 97500,
        unrealizedPnl: 37500,
        unrealizedPnlPercentage: 62.5,
        realizedPnl: 0,
        totalFees: 15,
        allocationPercentage: 100,
      },
    ];

    const html = renderToString(
      <PortfolioPositionsTable
        positions={mockPositions}
        onOpenTrade={vi.fn()}
        isLoadingPrices={false}
      />,
    );

    expect(html).toContain("Bitcoin");
    expect(html).toContain("BTC");
    expect(html).toContain("Posiciones en Cartera");
    expect(html).toContain("+ Compra");
    expect(html).toContain("- Venta");
  });

  it("debe mostrar etiqueta de 'No disponible' cuando el precio actual es null", () => {
    const mockPositions: PortfolioPosition[] = [
      {
        coinId: "token-x",
        coinName: "Token X",
        coinSymbol: "TKX",
        amount: 100,
        totalCostBasis: 500,
        averageBuyPrice: 5,
        currentPrice: null,
        currentValue: null,
        unrealizedPnl: null,
        unrealizedPnlPercentage: null,
        realizedPnl: 0,
        totalFees: 0,
        allocationPercentage: 0,
      },
    ];

    const html = renderToString(
      <PortfolioPositionsTable
        positions={mockPositions}
        onOpenTrade={vi.fn()}
        isLoadingPrices={false}
      />,
    );

    expect(html).toContain("No disponible");
  });
});
