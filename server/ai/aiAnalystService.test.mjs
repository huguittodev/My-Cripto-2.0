import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateAnalystRequest,
  processAnalystQuery,
  getAnalystStatus,
  resetAnalystServiceState,
  MAX_PROMPT_LENGTH,
} from './aiAnalystService.mjs';

describe('AI Analyst Service (Server Logic)', () => {
  beforeEach(() => {
    resetAnalystServiceState();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetAnalystServiceState();
  });

  describe('validateAnalystRequest', () => {
    it('valida con éxito un payload correcto', () => {
      const result = validateAnalystRequest({
        prompt: '  ¿Cómo está Bitcoin?  ',
        context: { asset: { id: 'bitcoin', name: 'Bitcoin' } },
        history: [{ role: 'user', text: 'Hola' }, { role: 'model', text: 'Buenas' }],
      });

      expect(result.prompt).toBe('¿Cómo está Bitcoin?');
      expect(result.context.asset.id).toBe('bitcoin');
      expect(result.history).toHaveLength(2);
    });

    it('rechaza consultas vacías o con solo espacios en blanco', () => {
      expect(() => validateAnalystRequest({ prompt: '   ' })).toThrow(/vacía/i);
      expect(() => validateAnalystRequest({ prompt: '' })).toThrow(/obligatorio/i);
      expect(() => validateAnalystRequest({})).toThrow(/obligatorio/i);
    });

    it('rechaza consultas que superen el límite máximo de longitud', () => {
      const longPrompt = 'a'.repeat(MAX_PROMPT_LENGTH + 1);
      expect(() => validateAnalystRequest({ prompt: longPrompt })).toThrow(/longitud máxima/i);
    });

    it('restringe el historial a un máximo de 6 turnos válidos', () => {
      const history = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'model',
        text: `Mensaje ${i}`,
      }));

      const result = validateAnalystRequest({
        prompt: 'Pregunta actual',
        history,
      });

      expect(result.history).toHaveLength(6);
      expect(result.history[5].text).toBe('Mensaje 9');
    });
  });

  describe('processAnalystQuery con Mock de Gemini', () => {
    const mockClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: 'Análisis sintetizado del mercado.',
        }),
      },
    };

    it('procesa una consulta válida y genera respuesta con metadatos contextuales', async () => {
      const response = await processAnalystQuery(
        {
          prompt: '¿Cómo ves el mercado?',
          context: {
            asset: { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', current_price: 85000 },
          },
        },
        { clientOverride: mockClient }
      );

      expect(response.text).toBe('Análisis sintetizado del mercado.');
      expect(response.isCached).toBe(false);
      expect(response.contextSummary.hasAssetData).toBe(true);
      expect(response.contextSummary.hasPortfolioData).toBe(false);
      expect(mockClient.models.generateContent).toHaveBeenCalledTimes(1);
    });

    it('reutiliza la caché en memoria para consultas idénticas inmediatas sin llamar al modelo', async () => {
      const payload = {
        prompt: '¿Cómo está Bitcoin?',
        context: {
          asset: { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', current_price: 85000 },
        },
      };

      // Primera consulta: llamada al modelo
      const res1 = await processAnalystQuery(payload, { clientOverride: mockClient });
      expect(res1.isCached).toBe(false);
      expect(mockClient.models.generateContent).toHaveBeenCalledTimes(1);

      // Segunda consulta idéntica: servida desde caché
      const res2 = await processAnalystQuery(payload, { clientOverride: mockClient });
      expect(res2.isCached).toBe(true);
      expect(res2.text).toBe(res1.text);
      // El cliente de Gemini no debe haberse invocado una segunda vez
      expect(mockClient.models.generateContent).toHaveBeenCalledTimes(1);
    });

    it('aplica limitación de tasa (rate limiting) al superar 15 consultas en la ventana de tiempo', async () => {
      const payload = { prompt: 'Consulta rápida' };

      // Ejecuta 15 consultas (el máximo permitido)
      for (let i = 0; i < 15; i++) {
        await processAnalystQuery(
          { prompt: `Consulta ${i}` },
          { clientOverride: mockClient }
        );
      }

      // La consulta número 16 debe ser rechazada con código 429
      await expect(
        processAnalystQuery({ prompt: 'Consulta 16' }, { clientOverride: mockClient })
      ).rejects.toMatchObject({
        statusCode: 429,
        code: 'LOCAL_RATE_LIMIT_EXCEEDED',
      });
    });
  });

  describe('getAnalystStatus y Seguridad de Claves', () => {
    const originalApiKey = process.env.GEMINI_API_KEY;

    afterEach(() => {
      process.env.GEMINI_API_KEY = originalApiKey;
    });

    it('informa correctamente cuando la clave no está configurada', () => {
      delete process.env.GEMINI_API_KEY;
      const status = getAnalystStatus();
      expect(status.isConfigured).toBe(false);
      // La clave nunca debe exponerse en el objeto de estado
      expect(status).not.toHaveProperty('apiKey');
      expect(status).not.toHaveProperty('key');
    });

    it('informa configurado cuando existe clave sin devolver el secreto', () => {
      process.env.GEMINI_API_KEY = 'secret_test_gemini_key_123';
      const status = getAnalystStatus();
      expect(status.isConfigured).toBe(true);
      expect(status.model).toBeDefined();
      expect(JSON.stringify(status)).not.toContain('secret_test_gemini_key_123');
    });
  });
});
