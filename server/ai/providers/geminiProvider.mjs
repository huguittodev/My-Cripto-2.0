// Adaptador robusto de Gemini compatible con @google/genai oficial
// Implementa timeouts precisos, rotación de modelos, clasificación de errores y soporte de cancelación

import { GoogleGenAI } from '@google/genai';
import { AiProviderError } from './aiProviderInterface.mjs';

// Modelos por defecto validados y activos para el SDK oficial
export const PRIMARY_DEFAULT_MODEL = 'gemini-3.5-flash';
export const FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
];
export const DEFAULT_TIMEOUT_MS = 14000;

/**
 * Crea o valida la instancia del cliente de Google Gen AI.
 * 
 * @param {string} [apiKey] - Clave de API provista o extraída del entorno
 * @returns {GoogleGenAI}
 */
export function createGenAIClient(apiKey = process.env.GEMINI_API_KEY) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new AiProviderError(
      'La variable GEMINI_API_KEY no está configurada en el servidor. Configura tu clave en el archivo .env.',
      'GEMINI_NOT_CONFIGURED',
      503,
      false
    );
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

/**
 * Parsea el tiempo sugerido de Retry-After de errores de Google Gen AI o HTTP.
 * 
 * @param {unknown} err
 * @returns {number|null} Segundos a esperar o null si no se especifica
 */
export function extractRetryAfterSeconds(err) {
  if (!err || typeof err !== 'object') return null;

  // Busca en los detalles de QuotaFailure / RetryInfo de Google RPC
  let details = err.details || err.errorDetails;

  // Si el mensaje es una cadena JSON devuelta por el SDK de Google GenAI
  if (!details && typeof err.message === 'string' && err.message.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(err.message);
      if (parsed?.error?.details) {
        details = parsed.error.details;
      }
    } catch {
      // Ignora fallos de parseo si no es JSON válido
    }
  }

  if (Array.isArray(details)) {
    for (const item of details) {
      if (item && item['@type']?.includes('RetryInfo') && item.retryDelay) {
        const seconds = parseInt(String(item.retryDelay).replace('s', ''), 10);
        if (!isNaN(seconds)) return seconds;
      }
    }
  }

  // Busca en cabeceras HTTP si están disponibles
  if (err.headers && typeof err.headers.get === 'function') {
    const headerVal = err.headers.get('retry-after');
    if (headerVal) {
      const parsed = parseInt(headerVal, 10);
      if (!isNaN(parsed)) return parsed;
    }
  }

  return null;
}

/**
 * Clasifica cualquier error originado en la API o SDK de Google en un AiProviderError estructurado.
 * 
 * @param {unknown} err - Error capturado
 * @returns {AiProviderError}
 */
export function classifyGeminiError(err) {
  if (err instanceof AiProviderError) {
    return err;
  }

  let message = err?.message || String(err);
  let status = Number(err?.status || err?.statusCode || 500);

  // Parsea el payload de error si @google/genai encapsuló la respuesta en formato JSON
  if (typeof message === 'string' && message.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(message);
      if (parsed?.error) {
        if (parsed.error.code) status = Number(parsed.error.code);
        if (parsed.error.message) message = parsed.error.message;
      }
    } catch {
      // Mantiene los valores de fallback si el JSON es defectuoso
    }
  }

  const retryAfter = extractRetryAfterSeconds(err);

  // 1. Timeout de solicitud
  if (err?.code === 'REQUEST_TIMEOUT' || message.includes('aborted') || message.includes('timeout')) {
    return new AiProviderError(
      'Tiempo de espera agotado al conectar con el servicio de Gemini.',
      'REQUEST_TIMEOUT',
      504,
      true,
      null,
      message
    );
  }

  // 2. Errores de autenticación o permisos denegados (No reintentables)
  if (
    status === 401 ||
    status === 403 ||
    message.includes('API_KEY_INVALID') ||
    message.includes('PERMISSION_DENIED') ||
    message.includes('unregistered project')
  ) {
    return new AiProviderError(
      'La clave de API de Gemini no es válida o no dispone de permisos suficientes. Verifica tu GEMINI_API_KEY en .env.',
      'INVALID_API_KEY',
      401,
      false,
      null,
      message
    );
  }

  // 3. Cuota agotada o limitación de tasa (Rate Limit / Quota)
  if (
    status === 429 ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('quota') ||
    message.includes('Quota exceeded')
  ) {
    // Si la espera es mayor a 60 segundos o es cuota diaria por proyecto/modelo, se marca como no reintentable en el mismo modelo
    const isDailyQuotaExhausted =
      (retryAfter !== null && retryAfter > 60) ||
      message.includes('GenerateRequestsPerDay') ||
      message.includes('FreeTier');

    return new AiProviderError(
      isDailyQuotaExhausted
        ? 'Se ha agotado la cuota diaria del modelo en la API de Gemini (Free Tier). Por favor, intenta más tarde o utiliza un modelo alternativo.'
        : 'Se ha alcanzado el límite temporal de consultas en la API de Gemini (Rate Limit). Espera unos segundos antes de reintentar.',
      'QUOTA_EXCEEDED',
      429,
      !isDailyQuotaExhausted, // Solo reintentable en el mismo modelo si es rate limit de corta duración
      retryAfter,
      message
    );
  }

  // 4. Modelo no disponible, no encontrado o incompatible con generateContent (404 / incompatibilidad de streaming)
  if (
    status === 404 ||
    message.includes('not found') ||
    message.includes('no longer available') ||
    message.includes('only supports real-time bidirectional') ||
    message.includes('not supported for generateContent')
  ) {
    return new AiProviderError(
      'El modelo especificado de Gemini no está disponible, ha sido deprecado o no admite consultas de texto estándar.',
      'MODEL_NOT_FOUND',
      404,
      false,
      null,
      message
    );
  }

  // 5. Errores de red o conexión de socket
  if (
    message.includes('fetch failed') ||
    message.includes('ENOTFOUND') ||
    message.includes('ECONNREFUSED') ||
    message.includes('socket hang up')
  ) {
    return new AiProviderError(
      'No se pudo establecer conexión de red con los servidores de Google Gemini.',
      'NETWORK_ERROR',
      502,
      true,
      null,
      message
    );
  }

  // 6. Errores de servidor de Google (500, 502, 503, sin capacidad en modelo - Reintentables)
  if (
    (status >= 500 && status < 600) ||
    message.includes('UNAVAILABLE') ||
    message.includes('No capacity available') ||
    message.includes('overloaded')
  ) {
    const effectiveStatus = status >= 500 && status < 600 ? status : 503;
    return new AiProviderError(
      `Los servidores de Google Gemini experimentan dificultades temporales (HTTP ${effectiveStatus}).`,
      'SERVER_ERROR',
      effectiveStatus,
      true,
      retryAfter,
      message
    );
  }

  return new AiProviderError(
    `Error al procesar la respuesta de Gemini: ${message}`,
    'GEMINI_ERROR',
    status >= 400 && status < 600 ? status : 500,
    false,
    null,
    message
  );
}

/**
 * Ejecuta una llamada atómica a Gemini con timeout específico y soporte de aborto.
 * 
 * @param {object} params
 * @param {GoogleGenAI} params.client - Instancia de GoogleGenAI
 * @param {string} params.modelName - Nombre del modelo a consultar
 * @param {Array} params.contents - Contenidos formateados para el SDK
 * @param {string} params.systemInstruction - Instrucción de sistema
 * @param {number} [params.timeoutMs=DEFAULT_TIMEOUT_MS] - Tiempo límite
 * @param {AbortSignal} [params.signal] - Señal de cancelación
 * @returns {Promise<object>}
 */
export async function callGeminiApi({
  client,
  modelName,
  contents,
  systemInstruction,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal,
}) {
  if (signal?.aborted) {
    throw new AiProviderError('Consulta cancelada por el usuario.', 'REQUEST_ABORTED', 0, false);
  }

  let timerId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      reject(
        new AiProviderError(
          'Tiempo de espera agotado al conectar con el servicio de Gemini.',
          'REQUEST_TIMEOUT',
          504,
          true
        )
      );
    }, timeoutMs);
  });

  const generatePromise = client.models.generateContent({
    model: modelName,
    contents,
    config: {
      systemInstruction,
      maxOutputTokens: 1200,
      temperature: 0.2,
    },
  });

  try {
    const response = await Promise.race([generatePromise, timeoutPromise]);
    clearTimeout(timerId);

    const candidate = response.candidates?.[0];
    const text = response.text || candidate?.content?.parts?.[0]?.text || '';

    if (!text || text.trim().length === 0) {
      throw new AiProviderError(
        'El modelo devolvió una respuesta vacía.',
        'EMPTY_RESPONSE',
        502,
        false
      );
    }

    return {
      text: text.trim(),
      model: modelName,
      provider: 'gemini',
      finishReason: candidate?.finishReason || 'STOP',
      usage: response.usageMetadata || null,
      timestamp: Date.now(),
      isDegraded: false,
    };
  } catch (err) {
    clearTimeout(timerId);
    throw classifyGeminiError(err);
  }
}
