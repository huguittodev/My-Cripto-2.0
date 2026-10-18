import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  askAiAnalyst,
  fetchAiStatus,
  AiAnalystError,
} from "./aiAnalystService.ts";
import type { AiMarketContext } from "../types/crypto";

describe("Frontend AI Analyst Client Service", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const mockContext: AiMarketContext = {
    asset: {
      id: "bitcoin",
      symbol: "btc",
      name: "Bitcoin",
      current_price: 85000,
      price_change_percentage_24h: 3.5,
      market_cap: 1600000000000,
      total_volume: 45000000000,
      high_24h: 86000,
      low_24h: 83000,
      last_updated: "2026-10-19T00:00:00.000Z",
      currency: "EUR",
      source: "CoinGecko API",
    },
  };

  it("envía una solicitud válida al backend y devuelve la respuesta formateada", async () => {
    const mockSuccessResponse = {
      ok: true,
      data: {
        text: "Bitcoin muestra una consolidación en torno a los 85.000€.",
        model: "gemini-2.5-flash",
        timestamp: 1770000000000,
        isCached: false,
        contextSummary: {
          hasAssetData: true,
          hasGlobalData: false,
          hasPortfolioData: false,
          comparedCount: 0,
        },
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSuccessResponse,
    } as unknown as Response);

    const result = await askAiAnalyst({
      prompt: "¿Cómo ves el precio de Bitcoin?",
      context: mockContext,
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/ai/analyst",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          prompt: "¿Cómo ves el precio de Bitcoin?",
          context: mockContext,
          history: [],
        }),
      })
    );
    expect(result.text).toBe("Bitcoin muestra una consolidación en torno a los 85.000€.");
    expect(result.model).toBe("gemini-2.5-flash");
    expect(result.contextSummary?.hasAssetData).toBe(true);
  });

  it("rechaza consultas vacías antes de emitir petición de red", async () => {
    await expect(askAiAnalyst({ prompt: "   " })).rejects.toThrow(AiAnalystError);
  });

  it("mapea errores HTTP 429 de cuota agotada como AiAnalystError reintentable", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        ok: false,
        error: "QUOTA_EXCEEDED",
        message: "Se ha alcanzado temporalmente el límite de peticiones de Gemini.",
        retryable: true,
      }),
    } as unknown as Response);

    await expect(
      askAiAnalyst({ prompt: "¿Qué volumen tiene BTC?" })
    ).rejects.toThrow(AiAnalystError);

    try {
      await askAiAnalyst({ prompt: "¿Qué volumen tiene BTC?" });
    } catch (err) {
      const aiErr = err as AiAnalystError;
      expect(aiErr.code).toBe("QUOTA_EXCEEDED");
      expect(aiErr.retryable).toBe(true);
      expect(aiErr.statusCode).toBe(429);
    }
  });

  it("mapea errores HTTP 503 cuando la API de Gemini no está configurada", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        ok: false,
        error: "GEMINI_NOT_CONFIGURED",
        message: "La clave GEMINI_API_KEY no está configurada en el servidor.",
        retryable: false,
      }),
    } as unknown as Response);

    try {
      await askAiAnalyst({ prompt: "Hola" });
      expect.fail("Debería haber lanzado un error");
    } catch (err) {
      const aiErr = err as AiAnalystError;
      expect(aiErr.code).toBe("GEMINI_NOT_CONFIGURED");
      expect(aiErr.retryable).toBe(false);
      expect(aiErr.statusCode).toBe(503);
    }
  });

  it("gestiona abortos o cancelaciones de solicitud de forma controlada", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";

    globalThis.fetch = vi.fn().mockRejectedValue(abortError);

    const controller = new AbortController();
    controller.abort();

    try {
      await askAiAnalyst({
        prompt: "Análisis largo",
        signal: controller.signal,
      });
      expect.fail("Debería haber lanzado error de aborto");
    } catch (err) {
      const aiErr = err as AiAnalystError;
      expect(aiErr.code).toBe("REQUEST_ABORTED");
    }
  });

  it("fetchAiStatus devuelve la configuración actual del servidor", async () => {
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

    const status = await fetchAiStatus();
    expect(status.isConfigured).toBe(true);
    expect(status.model).toBe("gemini-2.5-flash");
    expect(status.maxPromptLength).toBe(1000);
  });

  it("fetchAiStatus lanza AiAnalystError estructurado ante fallo de red", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Conexión rechazada"));

    await expect(fetchAiStatus()).rejects.toThrow(AiAnalystError);
  });

  it("seguridad: la clave de Gemini no se expone en variables de entorno cliente VITE_", () => {
    // Comprueba que no exista ninguna variable VITE_GEMINI_API_KEY en import.meta.env
    const envObj = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
    expect(envObj.VITE_GEMINI_API_KEY).toBeUndefined();
  });
});
