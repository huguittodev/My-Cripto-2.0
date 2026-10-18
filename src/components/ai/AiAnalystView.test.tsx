import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { AiAnalystView } from "./AiAnalystView.tsx";
import type { Cryptocurrency, CryptoList } from "../../types/crypto";

describe("AiAnalystView Component", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: {
          isConfigured: true,
          model: "gemini-2.5-flash",
          maxPromptLength: 1000,
          maxHistoryTurns: 6,
        },
      }),
    } as unknown as Response);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const mockCoin: Cryptocurrency = {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    current_price: 85000,
    market_cap_rank: 1,
    market_cap: 1650000000000,
    price_change_percentage_24h: 2.5,
    last_updated: "2026-10-19T00:00:00.000Z",
    total_volume: 41000000000,
  };

  const mockCoins: CryptoList = [
    mockCoin,
    {
      id: "ethereum",
      symbol: "eth",
      name: "Ethereum",
      image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
      current_price: 3300,
      market_cap_rank: 2,
      market_cap: 390000000000,
      price_change_percentage_24h: -1.2,
      last_updated: "2026-10-19T00:00:00.000Z",
      total_volume: 18000000000,
    },
  ];

  it("renderiza la estructura principal de la terminal AI Crypto Analyst", () => {
    const html = renderToString(
      <AiAnalystView
        selectedCoin={mockCoin}
        coins={mockCoins}
        onSelectCoin={vi.fn()}
      />
    );

    // Encabezado
    expect(html).toContain("AI Crypto Analyst");
    expect(html).toContain("gemini-2.5-flash");
    // Activo seleccionado
    expect(html).toContain("Bitcoin");
    expect(html).toContain("btc");
    // Toggle de cartera (inactivo por defecto)
    expect(html).toContain("Incluir resumen de mi cartera");
    // Preguntas sugeridas
    expect(html).toContain("Sugerencias:");
    // Aviso de responsabilidad financiera
    expect(html).toContain("No es asesoramiento de inversión");
  });

  it("renderiza el botón de limpiar conversación", () => {
    const html = renderToString(
      <AiAnalystView
        selectedCoin={mockCoin}
        coins={mockCoins}
        onSelectCoin={vi.fn()}
      />
    );

    expect(html).toContain("Nueva Conversación");
  });

  it("renderiza el selector para alternar entre criptomonedas activas", () => {
    const html = renderToString(
      <AiAnalystView
        selectedCoin={mockCoin}
        coins={mockCoins}
        onSelectCoin={vi.fn()}
      />
    );

    expect(html).toContain("Bitcoin (BTC)");
    expect(html).toContain("Ethereum (ETH)");
  });
});
