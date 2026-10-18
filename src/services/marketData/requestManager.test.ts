// Pruebas unitarias del RequestManager: deduplicación, caché, reintentos y stale data

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RequestManager } from "./requestManager.ts";
import { RateLimitError, HttpError, UnexpectedDataError } from "./types.ts";

describe("RequestManager - Control de Concurrencia, Caché y Reintentos", () => {
  const originalFetch = globalThis.fetch;
  let manager: RequestManager;

  beforeEach(() => {
    vi.restoreAllMocks();
    manager = new RequestManager();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("debe deduplicar peticiones idénticas en vuelo realizando una única llamada a fetch", async () => {
    const mockData = [{ id: "bitcoin", price: 65000 }];
    let fetchCallCount = 0;

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      fetchCallCount++;
      // Simulamos una latencia de 20ms
      await new Promise((r) => setTimeout(r, 20));
      return {
        ok: true,
        status: 200,
        json: async () => mockData,
      } as unknown as Response;
    });

    // Disparamos 3 peticiones idénticas concurrentemente antes de que la primera resuelva
    const p1 = manager.request({
      url: "https://api.example.com/coins",
      cacheKey: "test-dedup",
      ttlMs: 5000,
      validator: (d): d is typeof mockData => Array.isArray(d),
    });

    const p2 = manager.request({
      url: "https://api.example.com/coins",
      cacheKey: "test-dedup",
      ttlMs: 5000,
      validator: (d): d is typeof mockData => Array.isArray(d),
    });

    const p3 = manager.request({
      url: "https://api.example.com/coins",
      cacheKey: "test-dedup",
      ttlMs: 5000,
      validator: (d): d is typeof mockData => Array.isArray(d),
    });

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(r1).toEqual(mockData);
    expect(r2).toEqual(mockData);
    expect(r3).toEqual(mockData);
    // Solo una petición real de red debe haberse ejecutado
    expect(fetchCallCount).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("debe retornar datos desde la caché si aún están vigentes sin invocar fetch", async () => {
    const mockData = { btc: 65000 };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as unknown as Response);

    // Primera llamada puebla la caché
    const r1 = await manager.request({
      url: "https://api.example.com/price",
      cacheKey: "test-cache",
      ttlMs: 60000,
      validator: (d): d is typeof mockData => typeof d === "object" && d !== null,
    });

    // Segunda llamada dentro del TTL
    const r2 = await manager.request({
      url: "https://api.example.com/price",
      cacheKey: "test-cache",
      ttlMs: 60000,
      validator: (d): d is typeof mockData => typeof d === "object" && d !== null,
    });

    expect(r1).toEqual(mockData);
    expect(r2).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("debe ignorar la caché y consultar la red si se especifica ignoreCache: true", async () => {
    const mockData = { btc: 65000 };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as unknown as Response);

    await manager.request({
      url: "https://api.example.com/price",
      cacheKey: "test-ignore-cache",
      ttlMs: 60000,
      validator: (d): d is typeof mockData => typeof d === "object" && d !== null,
    });

    await manager.request({
      url: "https://api.example.com/price",
      cacheKey: "test-ignore-cache",
      ttlMs: 60000,
      ignoreCache: true,
      validator: (d): d is typeof mockData => typeof d === "object" && d !== null,
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("debe permitir recuperar datos stale después de haber sido cacheados", async () => {
    const mockData = [{ id: "solana", price: 150 }];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as unknown as Response);

    await manager.request({
      url: "https://api.example.com/sol",
      cacheKey: "test-stale",
      ttlMs: 1, // TTL mínimo que expira inmediatamente
      validator: (d): d is typeof mockData => Array.isArray(d),
    });

    // Esperamos 5ms para asegurar que el TTL expire
    await new Promise((r) => setTimeout(r, 5));

    // getStaleData debe conservar los últimos datos válidos
    const stale = manager.getStaleData<typeof mockData>("test-stale");
    expect(stale).toEqual(mockData);
  });

  it("debe extraer y conservar retryAfterSeconds si la respuesta 429 incluye cabecera Retry-After", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: {
        get: (h: string) => (h.toLowerCase() === "retry-after" ? "45" : null),
      },
    } as unknown as Response);

    try {
      await manager.request({
        url: "https://api.example.com/rate-limited",
        cacheKey: "test-429",
        ttlMs: 5000,
        maxRetries: 0,
        validator: (d: unknown): d is unknown => Boolean(d || true),
      });
      expect.unreachable("Debería haber lanzado RateLimitError");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterSeconds).toBe(45);
    }
  });

  it("debe lanzar HttpError inmediatamente para errores permanentes 404 sin reintentar", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as unknown as Response);

    await expect(
      manager.request({
        url: "https://api.example.com/not-found",
        cacheKey: "test-404",
        ttlMs: 5000,
        maxRetries: 2,
        validator: (d: unknown): d is unknown => Boolean(d || true),
      }),
    ).rejects.toThrow(HttpError);

    // No debe gastar reintentos en errores 404
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("debe lanzar UnexpectedDataError cuando el validador rechaza el formato del payload", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ unexpected: "payload" }),
    } as unknown as Response);

    await expect(
      manager.request({
        url: "https://api.example.com/invalid-data",
        cacheKey: "test-invalid-data",
        ttlMs: 5000,
        validator: (d): d is string[] => Array.isArray(d),
      }),
    ).rejects.toThrow(UnexpectedDataError);
  });
});
