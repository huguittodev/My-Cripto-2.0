import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { WatchlistView } from "./WatchlistView";
import { clearWatchlistStorage, saveStoredWatchlist } from "../../services/watchlistStorage";
import type { Cryptocurrency } from "../../types/crypto";

describe("WatchlistView Component", () => {
  let memoryStore: Record<string, string> = {};

  const mockBtc: Cryptocurrency = {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: "https://example.com/btc.png",
    current_price: 65000,
    market_cap: 1200000000000,
    market_cap_rank: 1,
    price_change_percentage_24h: 2.5,
    total_volume: 30000000000,
    last_updated: "2026-10-18T00:00:00.000Z",
    sparkline_in_7d: {
      price: [63000, 64000, 65000],
    },
  };

  beforeEach(() => {
    memoryStore = {};
    const mockStorage: Storage = {
      getItem: vi.fn((key: string) => memoryStore[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        memoryStore[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete memoryStore[key];
      }),
      clear: vi.fn(() => {
        memoryStore = {};
      }),
      key: vi.fn((idx: number) => Object.keys(memoryStore)[idx] || null),
      get length() {
        return Object.keys(memoryStore).length;
      },
    };

    vi.restoreAllMocks();
    Object.defineProperty(globalThis, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
    clearWatchlistStorage();
  });

  afterEach(() => {
    clearWatchlistStorage();
  });

  it("debe renderizar el estado vacío con mensaje explicativo y botón hacia explorador", () => {
    const onNavigateMock = vi.fn();
    const html = renderToString(
      <WatchlistView
        selectedCoin={null}
        onSelectCoin={vi.fn()}
        onNavigateToMarkets={onNavigateMock}
      />,
    );

    expect(html).toContain("Mi Watchlist");
    expect(html).toContain("Tu watchlist está vacía");
    expect(html).toContain("Personaliza tu seguimiento");
    expect(html).toContain("Almacenamiento local del navegador");
    expect(html).toContain("Explorar Mercados");
  });

  it("debe renderizar los activos favoritos con sus cotizaciones cuando se proporcionan datos", () => {
    saveStoredWatchlist(["bitcoin"]);

    const html = renderToString(
      <WatchlistView
        selectedCoin={null}
        onSelectCoin={vi.fn()}
        initialCoins={[mockBtc]}
      />,
    );

    expect(html).toContain("Mi Watchlist");
    expect(html).toContain("1 activo");
    expect(html).toContain("Bitcoin");
    expect(html).toContain("BTC");
    expect(html).toContain("65.000");
    expect(html).toContain("Activos en Seguimiento");
  });

  it("debe mantener visibles los activos favoritos aunque no haya cotización en vivo disponible (sin inventar precios)", () => {
    // Usuario tiene guardado "solana" y "cardano", pero la API no ha devuelto cotizaciones
    saveStoredWatchlist(["solana", "cardano"]);

    const html = renderToString(
      <WatchlistView
        selectedCoin={null}
        onSelectCoin={vi.fn()}
      />,
    );

    // Debe mostrar la cabecera con el recuento real de favoritos
    expect(html).toContain("2 activos");
    expect(html).toContain("Activos en Seguimiento");
    // Los activos deben aparecer listados por su nombre/id
    expect(html).toContain("Solana");
    expect(html).toContain("Cardano");
    // Aviso de cotización no disponible presente sin ocultar la lista
    expect(html).toContain("activos sin cotización");
    // No debe inventar cotizaciones: muestra guion
    expect(html).toContain("—");
  });

  it("debe renderizar el botón de favorito para cada activo en seguimiento", () => {
    saveStoredWatchlist(["bitcoin"]);

    const html = renderToString(
      <WatchlistView
        selectedCoin={null}
        onSelectCoin={vi.fn()}
        initialCoins={[mockBtc]}
      />,
    );

    // Comprueba el aria-label del botón de favorito
    expect(html).toContain('aria-label="Eliminar Bitcoin de favoritos"');
    expect(html).toContain('aria-pressed="true"');
  });

  it("debe tolerar datos corruptos en almacenamiento local inicializando con estado vacío seguro", () => {
    // Inyecta JSON corrupto en el almacenamiento simulado
    memoryStore["my-crypto-watchlist-v1"] = "{corrupt_data:";

    const html = renderToString(
      <WatchlistView
        selectedCoin={null}
        onSelectCoin={vi.fn()}
      />,
    );

    // No debe lanzar excepciones y debe mostrar el estado vacío
    expect(html).toContain("Tu watchlist está vacía");
  });
});
