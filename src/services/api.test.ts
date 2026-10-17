import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getTopCoins,
  getGlobalMarketData,
  getCoinMarketChart,
  clearChartCache,
  RateLimitError,
  HttpError,
  NetworkError,
  UnexpectedDataError,
} from "./api";
import type { CryptoList } from "../types/crypto";

describe("getTopCoins - API Service", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("debe retornar la lista de criptomonedas cuando la respuesta es exitosa (200 OK)", async () => {
    const mockCoins: CryptoList = [
      {
        id: "bitcoin",
        symbol: "btc",
        name: "Bitcoin",
        image: "https://example.com/btc.png",
        current_price: 65000,
        market_cap: 1200000000000,
        market_cap_rank: 1,
        price_change_percentage_24h: 2.5,
        last_updated: "2026-10-17T20:00:00.000Z",
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockCoins),
    } as unknown as Response);

    const result = await getTopCoins({ numCryptos: 1 });
    expect(result).toEqual(mockCoins);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("per_page=1"),
    );
  });

  it("debe lanzar RateLimitError cuando la API devuelve un código HTTP 429", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    } as unknown as Response);

    await expect(getTopCoins({ numCryptos: 10 })).rejects.toThrow(RateLimitError);
    await expect(getTopCoins({ numCryptos: 10 })).rejects.toThrow(
      /HTTP 429/,
    );
  });

  it("debe lanzar HttpError con el código de estado correspondiente cuando la API falla con 500", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    try {
      await getTopCoins({ numCryptos: 5 });
      expect.unreachable("Debería haber lanzado un HttpError");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(500);
      expect((error as HttpError).message).toContain("HTTP 500");
    }
  });

  it("debe lanzar HttpError cuando la API devuelve 404", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as unknown as Response);

    try {
      await getTopCoins({ numCryptos: 5 });
      expect.unreachable("Debería haber lanzado un HttpError");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(404);
    }
  });

  it("debe lanzar NetworkError cuando la petición falla por error de red o TypeError de fetch", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(getTopCoins({ numCryptos: 10 })).rejects.toThrow(NetworkError);
    await expect(getTopCoins({ numCryptos: 10 })).rejects.toThrow(
      /Error de red/,
    );
  });

  it("debe lanzar UnexpectedDataError cuando la respuesta JSON no es un array", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ status: "error", message: "Invalid key" }),
    } as unknown as Response);

    await expect(getTopCoins({ numCryptos: 10 })).rejects.toThrow(
      UnexpectedDataError,
    );
  });
});

describe("getGlobalMarketData - API Service", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("debe retornar los datos del mercado global cuando la respuesta es exitosa (200 OK)", async () => {
    const mockGlobalResponse = {
      data: {
        total_market_cap: {
          eur: 2450000000000,
          usd: 2750000000000,
        },
        total_volume: {
          eur: 160000000000,
          usd: 180000000000,
        },
        market_cap_percentage: {
          btc: 58.5,
          eth: 11.2,
        },
        market_cap_change_percentage_24h_usd: -2.35,
        updated_at: 1729200000,
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockGlobalResponse),
    } as unknown as Response);

    const result = await getGlobalMarketData();

    expect(result).toEqual({
      total_market_cap_eur: 2450000000000,
      total_volume_eur: 160000000000,
      btc_dominance: 58.5,
      market_cap_change_percentage_24h: -2.35,
      updated_at: 1729200000,
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/global"),
    );
  });

  it("debe lanzar RateLimitError si /global devuelve un código HTTP 429", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    } as unknown as Response);

    await expect(getGlobalMarketData()).rejects.toThrow(RateLimitError);
  });

  it("debe lanzar HttpError si /global falla con error 500", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    await expect(getGlobalMarketData()).rejects.toThrow(HttpError);
  });

  it("debe lanzar NetworkError si la petición a /global falla por caída de conexión", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(getGlobalMarketData()).rejects.toThrow(NetworkError);
  });

  it("debe lanzar UnexpectedDataError si la respuesta de /global no contiene el objeto data esperado", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ error: "Missing data" }),
    } as unknown as Response);

    await expect(getGlobalMarketData()).rejects.toThrow(UnexpectedDataError);
  });
});

describe("getCoinMarketChart - API Service", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearChartCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearChartCache();
  });

  it("debe retornar los datos históricos normalizados cuando la respuesta es válida (200 OK)", async () => {
    const mockChartResponse = {
      prices: [
        [1729200000000, 50000],
        [1729203600000, 55000],
        [1729207200000, 60000],
      ],
      market_caps: [[1729200000000, 1000000000]],
      total_volumes: [[1729200000000, 50000000]],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockChartResponse),
    } as unknown as Response);

    const result = await getCoinMarketChart({
      coinId: "bitcoin",
      days: 1,
    });

    expect(result.coinId).toBe("bitcoin");
    expect(result.days).toBe(1);
    expect(result.points).toHaveLength(3);
    expect(result.points[0]).toEqual({ timestamp: 1729200000000, price: 50000 });
    expect(result.points[2]).toEqual({ timestamp: 1729207200000, price: 60000 });
    expect(result.performance.isValid).toBe(true);
    expect(result.performance.startPrice).toBe(50000);
    expect(result.performance.endPrice).toBe(60000);
    expect(result.performance.absoluteChange).toBe(10000);
    expect(result.performance.percentageChange).toBe(20);
    expect(result.performance.isPositive).toBe(true);
    expect(result.minPrice).toBe(50000);
    expect(result.maxPrice).toBe(60000);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/coins/bitcoin/market_chart?vs_currency=eur&days=1"),
      expect.anything(),
    );
  });

  it("debe reutilizar la caché en memoria y no repetir la llamada fetch", async () => {
    const mockChartResponse = {
      prices: [
        [1729200000000, 2000],
        [1729203600000, 2100],
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockChartResponse),
    } as unknown as Response);

    // Primera llamada (acude a la red)
    const result1 = await getCoinMarketChart({ coinId: "ethereum", days: 7 });
    expect(result1.points).toHaveLength(2);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    // Segunda llamada idéntica (debe servirse desde caché)
    const result2 = await getCoinMarketChart({ coinId: "ethereum", days: 7 });
    expect(result2).toEqual(result1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1); // No vuelve a invocar fetch

    // Tercera llamada con ignoreCache: true (obliga a consultar de nuevo)
    await getCoinMarketChart({ coinId: "ethereum", days: 7, ignoreCache: true });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("debe lanzar RateLimitError si /market_chart responde con HTTP 429", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    } as unknown as Response);

    await expect(
      getCoinMarketChart({ coinId: "solana", days: 30 }),
    ).rejects.toThrow(RateLimitError);
  });

  it("debe lanzar HttpError si el servidor responde con 500", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    await expect(
      getCoinMarketChart({ coinId: "cardano", days: 90 }),
    ).rejects.toThrow(HttpError);
  });

  it("debe lanzar NetworkError si ocurre un error de conexión", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      getCoinMarketChart({ coinId: "ripple", days: 365 }),
    ).rejects.toThrow(NetworkError);
  });

  it("debe lanzar UnexpectedDataError si la respuesta no tiene la propiedad prices esperada", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ error: "Coin not found" }),
    } as unknown as Response);

    await expect(
      getCoinMarketChart({ coinId: "desconocido", days: 1 }),
    ).rejects.toThrow(UnexpectedDataError);
  });

  it("debe propagar AbortError cuando la petición es cancelada intencionalmente", async () => {
    const abortError = new DOMException("The user aborted a request.", "AbortError");
    globalThis.fetch = vi.fn().mockRejectedValue(abortError);

    await expect(
      getCoinMarketChart({ coinId: "bitcoin", days: 1 }),
    ).rejects.toThrow("The user aborted a request.");
  });

  it("debe rechazar llamadas con un identificador de activo vacío", async () => {
    await expect(
      getCoinMarketChart({ coinId: "", days: 1 }),
    ).rejects.toThrow("El identificador del activo es obligatorio.");
  });
});

