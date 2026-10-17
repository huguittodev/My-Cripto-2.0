import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { MarketPagination } from "../markets/MarketPagination";
import { MarketFiltersBar } from "../markets/MarketFiltersBar";
import { MarketTable } from "./MarketTable";
import { INITIAL_MARKET_FILTERS } from "../../utils/marketFilters";
import type { Cryptocurrency } from "../../types/crypto";

describe("MarketPagination Component", () => {
  it("debe renderizar la página actual y el conteo de elementos visibles", () => {
    const html = renderToString(
      <MarketPagination
        page={2}
        onChangePage={() => {}}
        hasMore={true}
        isLoading={false}
        visibleCount={25}
        totalLoadedCount={25}
      />,
    );

    expect(html).toContain("Pág.");
    expect(html).toContain("2");
    expect(html).toContain("Mostrando");
    expect(html).toContain("25");
    expect(html).toContain("Paginación en servidor CoinGecko");
  });

  it("debe deshabilitar el botón Anterior en la página 1", () => {
    const html = renderToString(
      <MarketPagination
        page={1}
        onChangePage={() => {}}
        hasMore={true}
        isLoading={false}
        visibleCount={10}
        totalLoadedCount={10}
      />,
    );

    expect(html).toContain('aria-label="Página anterior"');
    expect(html).toContain('disabled=""');
  });

  it("debe deshabilitar el botón Siguiente cuando hasMore es false", () => {
    const html = renderToString(
      <MarketPagination
        page={3}
        onChangePage={() => {}}
        hasMore={false}
        isLoading={false}
        visibleCount={5}
        totalLoadedCount={5}
      />,
    );

    expect(html).toContain('aria-label="Página siguiente"');
    expect(html).toContain('disabled=""');
  });
});

describe("MarketFiltersBar Component", () => {
  it("debe renderizar los botones de rendimiento y selectores de capitalización", () => {
    const html = renderToString(
      <MarketFiltersBar
        filters={INITIAL_MARKET_FILTERS}
        onChangeFilters={() => {}}
        onResetFilters={() => {}}
        searchTerm=""
        onClearSearch={() => {}}
        perPage={25}
        onChangePerPage={() => {}}
        viewMode="table"
        onChangeViewMode={() => {}}
      />,
    );

    expect(html).toContain("Todos");
    expect(html).toContain("Ganadoras");
    expect(html).toContain("Perdedoras");
    expect(html).toContain("Todas las capitalizaciones");
    expect(html).toContain("Grandes (≥ 10.000 M €)");
    expect(html).toContain("Rango Precio:");
  });

  it("debe mostrar el badge de filtros activos y el botón Limpiar filtros cuando hay filtros aplicados", () => {
    const html = renderToString(
      <MarketFiltersBar
        filters={{
          performance: "gainers",
          capCategory: "large",
          minPrice: 100,
          maxPrice: null,
        }}
        onChangeFilters={() => {}}
        onResetFilters={() => {}}
        searchTerm="btc"
        onClearSearch={() => {}}
        perPage={25}
        onChangePerPage={() => {}}
        viewMode="table"
        onChangeViewMode={() => {}}
      />,
    );

    expect(html).toContain("filtros activos");
    expect(html).toContain("Limpiar filtros");
  });
});

describe("MarketTable Component", () => {
  const mockSelectedCoin: Cryptocurrency = {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: "https://example.com/btc.png",
    current_price: 65000,
    market_cap: 1200000000000,
    market_cap_rank: 1,
    price_change_percentage_24h: 2.5,
    total_volume: 30000000000,
    last_updated: "2026-10-17T20:00:00.000Z",
    sparkline_in_7d: {
      price: [62000, 63000, 65000],
    },
  };

  it("debe renderizar la cabecera del explorador y la barra de búsqueda", () => {
    const html = renderToString(
      <MarketTable
        selectedCoin={mockSelectedCoin}
        onSelectCoin={vi.fn()}
      />,
    );

    expect(html).toContain("Explorador de Mercados");
    expect(html).toContain("Buscar por nombre, símbolo o ID...");
    expect(html).toContain("Ordenación");
  });
});
