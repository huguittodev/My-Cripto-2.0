import { describe, it, expect } from "vitest";
import {
  filterCoins,
  sortCoins,
  countActiveFilters,
  INITIAL_MARKET_FILTERS,
  LARGE_CAP_THRESHOLD,
  MID_CAP_THRESHOLD,
} from "./marketFilters";
import type { CryptoList, MarketFilters } from "../types/crypto";

const mockCoins: CryptoList = [
  {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: "https://example.com/btc.png",
    current_price: 60000,
    market_cap: 1200000000000, // 1.2T (Large)
    market_cap_rank: 1,
    price_change_percentage_24h: 3.5,
    total_volume: 30000000000,
    last_updated: "2026-10-17T20:00:00.000Z",
  },
  {
    id: "ethereum",
    symbol: "eth",
    name: "Ethereum",
    image: "https://example.com/eth.png",
    current_price: 3000,
    market_cap: 350000000000, // 350B (Large)
    market_cap_rank: 2,
    price_change_percentage_24h: -1.8,
    total_volume: 15000000000,
    last_updated: "2026-10-17T20:00:00.000Z",
  },
  {
    id: "near",
    symbol: "near",
    name: "NEAR Protocol",
    image: "https://example.com/near.png",
    current_price: 5.5,
    market_cap: 6000000000, // 6B (Mid)
    market_cap_rank: 22,
    price_change_percentage_24h: 8.2,
    total_volume: 500000000,
    last_updated: "2026-10-17T20:00:00.000Z",
  },
  {
    id: "pepe",
    symbol: "pepe",
    name: "Pepe",
    image: "https://example.com/pepe.png",
    current_price: 0.000008,
    market_cap: 800000000, // 800M (Small)
    market_cap_rank: 95,
    price_change_percentage_24h: -5.4,
    total_volume: 120000000,
    last_updated: "2026-10-17T20:00:00.000Z",
  },
];

describe("marketFilters utils", () => {
  describe("countActiveFilters", () => {
    it("debe retornar 0 para los filtros iniciales", () => {
      expect(countActiveFilters(INITIAL_MARKET_FILTERS)).toBe(0);
    });

    it("debe contar correctamente cada filtro no predeterminado", () => {
      const filters: MarketFilters = {
        performance: "gainers",
        capCategory: "large",
        minPrice: 10,
        maxPrice: 50000,
      };
      expect(countActiveFilters(filters)).toBe(4);
    });
  });

  describe("filterCoins - Búsqueda", () => {
    it("debe filtrar por nombre de activo (case-insensitive)", () => {
      const result = filterCoins(mockCoins, INITIAL_MARKET_FILTERS, "bit");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("bitcoin");
    });

    it("debe filtrar por símbolo", () => {
      const result = filterCoins(mockCoins, INITIAL_MARKET_FILTERS, "ETH");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("ethereum");
    });

    it("debe filtrar por identificador CoinGecko", () => {
      const result = filterCoins(mockCoins, INITIAL_MARKET_FILTERS, "near");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("near");
    });

    it("debe ignorar espacios al inicio y al final en la búsqueda", () => {
      const result = filterCoins(mockCoins, INITIAL_MARKET_FILTERS, "  pepe  ");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("pepe");
    });
  });

  describe("filterCoins - Rendimiento 24h", () => {
    it("debe filtrar solo activos ganadores (+24h)", () => {
      const filters: MarketFilters = {
        ...INITIAL_MARKET_FILTERS,
        performance: "gainers",
      };
      const result = filterCoins(mockCoins, filters, "");
      expect(result.map((c) => c.id)).toEqual(["bitcoin", "near"]);
    });

    it("debe filtrar solo activos perdedores (-24h)", () => {
      const filters: MarketFilters = {
        ...INITIAL_MARKET_FILTERS,
        performance: "losers",
      };
      const result = filterCoins(mockCoins, filters, "");
      expect(result.map((c) => c.id)).toEqual(["ethereum", "pepe"]);
    });
  });

  describe("filterCoins - Capitalización", () => {
    it("debe filtrar Large Caps (>= 10B €)", () => {
      const filters: MarketFilters = {
        ...INITIAL_MARKET_FILTERS,
        capCategory: "large",
      };
      const result = filterCoins(mockCoins, filters, "");
      expect(result.map((c) => c.id)).toEqual(["bitcoin", "ethereum"]);
      expect(result.every((c) => c.market_cap >= LARGE_CAP_THRESHOLD)).toBe(true);
    });

    it("debe filtrar Mid Caps (1B € a 10B €)", () => {
      const filters: MarketFilters = {
        ...INITIAL_MARKET_FILTERS,
        capCategory: "mid",
      };
      const result = filterCoins(mockCoins, filters, "");
      expect(result.map((c) => c.id)).toEqual(["near"]);
      expect(
        result.every(
          (c) => c.market_cap >= MID_CAP_THRESHOLD && c.market_cap < LARGE_CAP_THRESHOLD,
        ),
      ).toBe(true);
    });

    it("debe filtrar Small Caps (< 1B €)", () => {
      const filters: MarketFilters = {
        ...INITIAL_MARKET_FILTERS,
        capCategory: "small",
      };
      const result = filterCoins(mockCoins, filters, "");
      expect(result.map((c) => c.id)).toEqual(["pepe"]);
      expect(result.every((c) => c.market_cap < MID_CAP_THRESHOLD)).toBe(true);
    });
  });

  describe("filterCoins - Rango de precio", () => {
    it("debe aplicar precio mínimo", () => {
      const filters: MarketFilters = {
        ...INITIAL_MARKET_FILTERS,
        minPrice: 1000,
      };
      const result = filterCoins(mockCoins, filters, "");
      expect(result.map((c) => c.id)).toEqual(["bitcoin", "ethereum"]);
    });

    it("debe aplicar precio máximo", () => {
      const filters: MarketFilters = {
        ...INITIAL_MARKET_FILTERS,
        maxPrice: 10,
      };
      const result = filterCoins(mockCoins, filters, "");
      expect(result.map((c) => c.id)).toEqual(["near", "pepe"]);
    });

    it("debe combinar precio mínimo y máximo", () => {
      const filters: MarketFilters = {
        ...INITIAL_MARKET_FILTERS,
        minPrice: 1,
        maxPrice: 10,
      };
      const result = filterCoins(mockCoins, filters, "");
      expect(result.map((c) => c.id)).toEqual(["near"]);
    });
  });

  describe("sortCoins", () => {
    it("debe ordenar por rank ascendente y descendente", () => {
      const asc = sortCoins(mockCoins, "rank", "asc");
      expect(asc[0].id).toBe("bitcoin");
      expect(asc[asc.length - 1].id).toBe("pepe");

      const desc = sortCoins(mockCoins, "rank", "desc");
      expect(desc[0].id).toBe("pepe");
      expect(desc[desc.length - 1].id).toBe("bitcoin");
    });

    it("debe ordenar alfabéticamente por nombre", () => {
      const asc = sortCoins(mockCoins, "name", "asc");
      expect(asc.map((c) => c.name)).toEqual([
        "Bitcoin",
        "Ethereum",
        "NEAR Protocol",
        "Pepe",
      ]);

      const desc = sortCoins(mockCoins, "name", "desc");
      expect(desc.map((c) => c.name)).toEqual([
        "Pepe",
        "NEAR Protocol",
        "Ethereum",
        "Bitcoin",
      ]);
    });

    it("debe ordenar por precio", () => {
      const asc = sortCoins(mockCoins, "price", "asc");
      expect(asc[0].id).toBe("pepe");
      expect(asc[asc.length - 1].id).toBe("bitcoin");

      const desc = sortCoins(mockCoins, "price", "desc");
      expect(desc[0].id).toBe("bitcoin");
      expect(desc[desc.length - 1].id).toBe("pepe");
    });

    it("debe ordenar por variación de 24 horas", () => {
      const desc = sortCoins(mockCoins, "change", "desc");
      expect(desc[0].id).toBe("near"); // +8.2%
      expect(desc[desc.length - 1].id).toBe("pepe"); // -5.4%
    });

    it("debe ordenar por volumen", () => {
      const desc = sortCoins(mockCoins, "volume", "desc");
      expect(desc[0].id).toBe("bitcoin");
      expect(desc[desc.length - 1].id).toBe("pepe");
    });

    it("no debe mutar el array original", () => {
      const copy = [...mockCoins];
      sortCoins(mockCoins, "price", "asc");
      expect(mockCoins).toEqual(copy);
    });
  });
});
