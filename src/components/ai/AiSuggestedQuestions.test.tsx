import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { AiSuggestedQuestions } from "./AiSuggestedQuestions.tsx";
import type { Cryptocurrency } from "../../types/crypto";

describe("AiSuggestedQuestions Component", () => {
  const mockCoin: Cryptocurrency = {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    current_price: 85000,
    market_cap_rank: 1,
    market_cap: 1600000000000,
    price_change_percentage_24h: 3.2,
    last_updated: "2026-10-19T00:00:00.000Z",
    total_volume: 40000000000,
  };

  it("renderiza sugerencias contextuales específicas cuando hay un activo seleccionado", () => {
    const onSelect = vi.fn();
    const html = renderToString(
      <AiSuggestedQuestions
        selectedCoin={mockCoin}
        onSelectQuestion={onSelect}
      />
    );

    expect(html).toContain("Sugerencias:");
    expect(html).toContain("Analiza el mercado actual de Bitcoin");
    expect(html).toContain("Explícame qué significa el volumen de negociación de este activo");
  });

  it("renderiza sugerencias de comparación cuando no hay activo seleccionado", () => {
    const onSelect = vi.fn();
    const html = renderToString(
      <AiSuggestedQuestions
        selectedCoin={null}
        onSelectQuestion={onSelect}
      />
    );

    expect(html).toContain("Sugerencias:");
    expect(html).toContain("Compara Bitcoin y Ethereum con los datos disponibles");
  });

  it("añade la sugerencia de cartera si hasPortfolio es true", () => {
    const onSelect = vi.fn();
    const html = renderToString(
      <AiSuggestedQuestions
        selectedCoin={mockCoin}
        onSelectQuestion={onSelect}
        hasPortfolio={true}
      />
    );

    expect(html).toContain("Analiza la distribución de mi cartera respecto al mercado");
  });

  it("aplica atributo disabled a los botones cuando disabled es true", () => {
    const onSelect = vi.fn();
    const html = renderToString(
      <AiSuggestedQuestions
        selectedCoin={mockCoin}
        onSelectQuestion={onSelect}
        disabled={true}
      />
    );

    expect(html).toContain("disabled");
  });

  it("aplica clases de desplazamiento horizontal y no-scrollbar para ahorrar espacio vertical en móvil", () => {
    const onSelect = vi.fn();
    const html = renderToString(
      <AiSuggestedQuestions
        selectedCoin={mockCoin}
        onSelectQuestion={onSelect}
      />
    );

    // Contenedor de una sola fila con scroll horizontal
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("no-scrollbar");
    // Chips sin salto de línea individual
    expect(html).toContain("whitespace-nowrap");
  });
});
