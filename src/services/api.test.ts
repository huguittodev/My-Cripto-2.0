import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getTopCoins,
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
