import { describe, it, expect, vi } from 'vitest';
import {
  classifyGeminiError,
  extractRetryAfterSeconds,
  callGeminiApi,
} from './geminiProvider.mjs';
import {
  AiProviderError,
  executeWithRetry,
  calculateBackoffWithJitter,
} from './aiProviderInterface.mjs';
import { generateDegradedResponse } from './degradedModeProvider.mjs';

describe('Gemini Provider & Resilience Architecture', () => {
  describe('Clasificación precisa de errores (classifyGeminiError)', () => {
    it('clasifica errores 401/403 como INVALID_API_KEY no reintentables', () => {
      const authErr = new Error('API_KEY_INVALID: Key not valid');
      authErr.status = 401;

      const classified = classifyGeminiError(authErr);
      expect(classified.code).toBe('INVALID_API_KEY');
      expect(classified.statusCode).toBe(401);
      expect(classified.retryable).toBe(false);
    });

    it('clasifica errores 429 RESOURCE_EXHAUSTED como límite de uso / cuota', () => {
      const quotaErr = new Error('RESOURCE_EXHAUSTED: Rate limit exceeded');
      quotaErr.status = 429;
      quotaErr.details = [
        {
          '@type': 'type.googleapis.com/google.rpc.RetryInfo',
          retryDelay: '5s',
        },
      ];

      const classified = classifyGeminiError(quotaErr);
      expect(classified.code).toBe('QUOTA_EXCEEDED');
      expect(classified.statusCode).toBe(429);
      expect(classified.retryAfterSeconds).toBe(5);
      expect(classified.retryable).toBe(true);
    });

    it('clasifica cuota diaria agotada (> 60s) como no reintentable para evitar bucles', () => {
      const dailyQuotaErr = new Error('RESOURCE_EXHAUSTED: Daily quota exceeded');
      dailyQuotaErr.status = 429;
      dailyQuotaErr.details = [
        {
          '@type': 'type.googleapis.com/google.rpc.RetryInfo',
          retryDelay: '86400s',
        },
      ];

      const classified = classifyGeminiError(dailyQuotaErr);
      expect(classified.code).toBe('QUOTA_EXCEEDED');
      expect(classified.retryable).toBe(false);
      expect(classified.retryAfterSeconds).toBe(86400);
    });

    it('clasifica timeout como REQUEST_TIMEOUT con código 504 reintentable', () => {
      const timeoutErr = new Error('The operation was aborted due to timeout');
      timeoutErr.code = 'REQUEST_TIMEOUT';

      const classified = classifyGeminiError(timeoutErr);
      expect(classified.code).toBe('REQUEST_TIMEOUT');
      expect(classified.statusCode).toBe(504);
      expect(classified.retryable).toBe(true);
    });

    it('clasifica errores 500/503 del servidor como transitorios reintentables', () => {
      const serverErr = new Error('Internal error at Google');
      serverErr.status = 503;

      const classified = classifyGeminiError(serverErr);
      expect(classified.code).toBe('SERVER_ERROR');
      expect(classified.statusCode).toBe(503);
      expect(classified.retryable).toBe(true);
    });
  });

  describe('extractRetryAfterSeconds', () => {
    it('extrae segundos desde objeto RetryInfo de Google RPC', () => {
      const err = {
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.RetryInfo',
            retryDelay: '12s',
          },
        ],
      };
      expect(extractRetryAfterSeconds(err)).toBe(12);
    });

    it('devuelve null si no existe información de reintento', () => {
      expect(extractRetryAfterSeconds(new Error('Simple error'))).toBeNull();
      expect(extractRetryAfterSeconds(null)).toBeNull();
    });
  });

  describe('executeWithRetry (Backoff con jitter y límite de intentos)', () => {
    it('devuelve el resultado inmediatamente si el primer intento tiene éxito', async () => {
      const mockFn = vi.fn().mockResolvedValue('exitoso');
      const sleepMock = vi.fn();

      const result = await executeWithRetry(mockFn, {
        maxRetries: 2,
        sleepFn: sleepMock,
      });

      expect(result).toBe('exitoso');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(sleepMock).not.toHaveBeenCalled();
    });

    it('activa reintentos limitados ante errores transitorios y se recupera', async () => {
      const transientErr = new AiProviderError('Fallo 503', 'SERVER_ERROR', 503, true);
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(transientErr)
        .mockResolvedValueOnce('recuperado');

      const sleepMock = vi.fn().mockResolvedValue(undefined);

      const result = await executeWithRetry(mockFn, {
        maxRetries: 2,
        baseDelayMs: 200,
        sleepFn: sleepMock,
      });

      expect(result).toBe('recuperado');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(sleepMock).toHaveBeenCalledTimes(1);
    });

    it('NO reintenta ante errores no reintentables (ej. 401 autenticación)', async () => {
      const authErr = new AiProviderError('Clave inválida', 'INVALID_API_KEY', 401, false);
      const mockFn = vi.fn().mockRejectedValue(authErr);
      const sleepMock = vi.fn();

      await expect(
        executeWithRetry(mockFn, {
          maxRetries: 3,
          sleepFn: sleepMock,
        })
      ).rejects.toThrow('Clave inválida');

      // Se ejecuta una única vez y no reintenta
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(sleepMock).not.toHaveBeenCalled();
    });

    it('se detiene y lanza el error tras agotar el máximo de reintentos', async () => {
      const transientErr = new AiProviderError('Error 504', 'REQUEST_TIMEOUT', 504, true);
      const mockFn = vi.fn().mockRejectedValue(transientErr);
      const sleepMock = vi.fn().mockResolvedValue(undefined);

      await expect(
        executeWithRetry(mockFn, {
          maxRetries: 2,
          sleepFn: sleepMock,
        })
      ).rejects.toThrow('Error 504');

      // 1 intento inicial + 2 reintentos = 3 llamadas en total
      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(sleepMock).toHaveBeenCalledTimes(2);
    });

    it('calculateBackoffWithJitter calcula tiempos crecientes dentro de límites', () => {
      const delay0 = calculateBackoffWithJitter(0, 500, 4000);
      const delay1 = calculateBackoffWithJitter(1, 500, 4000);

      expect(delay0).toBeGreaterThanOrEqual(100);
      expect(delay0).toBeLessThanOrEqual(1000);
      expect(delay1).toBeGreaterThanOrEqual(200);
      expect(delay1).toBeLessThanOrEqual(2000);
    });
  });

  describe('callGeminiApi (Validación de respuestas)', () => {
    it('detecta y gestiona respuestas vacías con código 502', async () => {
      const mockClient = {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: '',
            candidates: [],
          }),
        },
      };

      await expect(
        callGeminiApi({
          client: mockClient,
          modelName: 'gemini-flash-lite-latest',
          contents: [{ parts: [{ text: 'Hola' }] }],
          systemInstruction: 'Test',
          timeoutMs: 5000,
        })
      ).rejects.toMatchObject({
        code: 'EMPTY_RESPONSE',
        statusCode: 502,
        retryable: false,
      });
    });
  });

  describe('Modo Degradado Determinista (generateDegradedResponse)', () => {
    it('genera una respuesta determinista con datos verificados y bandera isDegraded', () => {
      const result = generateDegradedResponse({
        prompt: '¿Cómo está Bitcoin?',
        context: {
          asset: {
            id: 'bitcoin',
            name: 'Bitcoin',
            symbol: 'btc',
            current_price: 85200,
            price_change_percentage_24h: 3.4,
            market_cap: 1650000000000,
            total_volume: 42000000000,
            currency: 'EUR',
          },
        },
        reason: 'Límite de cuota',
      });

      expect(result.isDegraded).toBe(true);
      expect(result.model).toBe('deterministic-fallback');
      expect(result.text).toContain('Modo Degradado');
      expect(result.text).toContain('85200 EUR');
      expect(result.text).toContain('+3.4%');
      expect(result.text).toContain('No constituye asesoramiento financiero');
    });

    it('desmitifica preguntas del tipo "Quiero ser rico donde invierto?" con educación financiera', () => {
      const result = generateDegradedResponse({
        prompt: 'Quiero ser rico donde invierto?',
        context: {},
        reason: 'Gemini no responde',
      });

      expect(result.isDegraded).toBe(true);
      expect(result.text).toContain('Principios Fundamentales de Educación Financiera');
      expect(result.text).toContain('Sin garantías de enriquecimiento');
      expect(result.text).toContain('Horizonte temporal y perfil de riesgo');
      expect(result.text).toContain('fondo de emergencia');
    });
  });
});
