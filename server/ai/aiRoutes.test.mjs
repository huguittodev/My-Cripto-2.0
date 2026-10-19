// Pruebas para los enrutadores de endpoints de IA y compatibilidad con Vercel Functions
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleStatusRequest, handleAiRequest } from './aiRoutes.mjs';

describe('AI Routes & Vercel Functions Compatibility', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function createMockHttp(options = {}) {
    const req = {
      method: options.method || 'GET',
      url: options.url || '/api/ai/status',
      body: options.body,
      headers: options.headers || {},
      on: vi.fn(),
      destroy: vi.fn(),
    };

    const res = {
      statusCode: 200,
      headers: {},
      body: '',
      writeHead: vi.fn((statusCode, headers) => {
        res.statusCode = statusCode;
        res.headers = { ...res.headers, ...headers };
        return res;
      }),
      end: vi.fn((data) => {
        if (data) {
          res.body = Buffer.isBuffer(data) ? data.toString('utf-8') : String(data);
        }
        return res;
      }),
    };

    return { req, res };
  }

  describe('handleStatusRequest (/api/ai/status)', () => {
    it('informa isConfigured: true cuando GEMINI_API_KEY está configurada en process.env sin filtrar la clave', () => {
      process.env.GEMINI_API_KEY = 'AIzaSySecretApiKeyForGemini123';
      process.env.GEMINI_MODEL = 'gemini-flash-lite-latest';

      const { req, res } = createMockHttp({ method: 'GET', url: '/api/ai/status' });
      handleStatusRequest(req, res);

      expect(res.statusCode).toBe(200);
      const parsed = JSON.parse(res.body);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.isConfigured).toBe(true);
      expect(parsed.data.model).toBe('gemini-flash-lite-latest');
      // Verificación estricta: nunca debe exponer la clave secreta
      expect(res.body).not.toContain('AIzaSySecretApiKeyForGemini123');
    });

    it('informa isConfigured: false cuando GEMINI_API_KEY no existe o está vacía', () => {
      delete process.env.GEMINI_API_KEY;

      const { req, res } = createMockHttp({ method: 'GET', url: '/api/ai/status' });
      handleStatusRequest(req, res);

      expect(res.statusCode).toBe(200);
      const parsed = JSON.parse(res.body);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.isConfigured).toBe(false);
    });
  });

  describe('handleAiRequest (/api/ai/analyst)', () => {
    it('procesa correctamente cuerpos pre-parseados provistos por Vercel (req.body)', async () => {
      delete process.env.GEMINI_API_KEY; // Sin clave, rechazará por configuración antes de llamar a Google

      const { req, res } = createMockHttp({
        method: 'POST',
        url: '/api/ai/analyst',
        body: {
          prompt: '¿Cómo ves el mercado hoy?',
          context: {},
        },
      });

      await handleAiRequest(req, res);

      // Con GEMINI_API_KEY ausente, debe responder con código de error controlado (no colgarse esperando stream)
      expect(res.writeHead).toHaveBeenCalled();
      const parsed = JSON.parse(res.body);
      expect(parsed.ok).toBe(false);
      expect(parsed.error).toBeDefined();
    });

    it('rechaza con código 400 cuando el prompt está vacío en el body pre-parseado', async () => {
      const { req, res } = createMockHttp({
        method: 'POST',
        url: '/api/ai/analyst',
        body: {
          prompt: '   ',
        },
      });

      await handleAiRequest(req, res);

      expect(res.statusCode).toBe(400);
      const parsed = JSON.parse(res.body);
      expect(parsed.ok).toBe(false);
      expect(parsed.error).toBe('INVALID_PROMPT');
    });
  });
});
