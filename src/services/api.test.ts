import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getTopCoins,
  getGlobalMarketData,
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
