// Servicio orquestador del AI Crypto Analyst
// Aplica validaciones de entrada, control de concurrencia, caché en memoria, límites de cuota y fallback

import crypto from 'node:crypto';
import { buildMarketContextString } from './promptBuilder.mjs';
import { generateAnalystResponse, GeminiAdapterError } from './geminiAdapter.mjs';
import { generateDegradedResponse } from './providers/degradedModeProvider.mjs';
import { PRIMARY_DEFAULT_MODEL } from './providers/geminiProvider.mjs';
import { AiProviderError } from './providers/aiProviderInterface.mjs';

export const MAX_PROMPT_LENGTH = 1000;
export const MAX_HISTORY_TURNS = 6;
export const MAX_CONCURRENT_REQUESTS = 2;
export const RATE_LIMIT_WINDOW_MS = 60000;
export const RATE_LIMIT_MAX_REQUESTS = 15;
export const CACHE_TTL_MS = 45000;

// Estado en memoria para control de cuota y concurrencia
let activeRequestsCount = 0;
const requestTimestamps = [];
const responseCache = new Map();

/**
 * Limpia entradas caducadas de la caché de respuestas.
 */
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (now - entry.createdAt > CACHE_TTL_MS) {
      responseCache.delete(key);
    }
  }
}

/**
 * Comprueba el límite de solicitudes por ventana de tiempo (Rate Limiting en memoria).
 */
function checkRateLimit() {
  const now = Date.now();
  // Elimina marcas anteriores a la ventana actual
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] > RATE_LIMIT_WINDOW_MS) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    throw new GeminiAdapterError(
      'Has alcanzado el límite de consultas permitidas por minuto (15 req/min). Por favor, espera unos segundos.',
      'LOCAL_RATE_LIMIT_EXCEEDED',
      429,
      true
    );
  }

  requestTimestamps.push(now);
}

/**
 * Genera una clave hash reproducible para la caché de consultas idénticas.
 */
function computeCacheKey(prompt, context) {
  const payload = JSON.stringify({
    p: prompt.trim().toLowerCase(),
    a: context.asset ? `${context.asset.id}-${context.asset.current_price}` : null,
    g: context.global ? `${context.global.updated_at}` : null,
    c: context.compareAssets ? context.compareAssets.map((x) => `${x.id}-${x.current_price}`).join('|') : null,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Valida minuciosamente el payload recibido del cliente.
 */
export function validateAnalystRequest(body) {
  if (!body || typeof body !== 'object') {
    throw new GeminiAdapterError('El cuerpo de la petición debe ser un objeto JSON válido.', 'BAD_REQUEST', 400, false);
  }

  const { prompt, history, context, fallbackToDegraded } = body;

  if (!prompt || typeof prompt !== 'string') {
    throw new GeminiAdapterError('El campo "prompt" es obligatorio y debe ser una cadena de texto.', 'INVALID_PROMPT', 400, false);
  }

  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    throw new GeminiAdapterError('La consulta no puede estar vacía.', 'INVALID_PROMPT', 400, false);
  }

  if (trimmed.length > MAX_PROMPT_LENGTH) {
    throw new GeminiAdapterError(
      `La consulta supera la longitud máxima permitida (${MAX_PROMPT_LENGTH} caracteres).`,
      'PROMPT_TOO_LONG',
      400,
      false
    );
  }

  // Validación del historial
  let sanitizedHistory = [];
  if (Array.isArray(history)) {
    // Conserva únicamente los últimos N turnos
    sanitizedHistory = history
      .slice(-MAX_HISTORY_TURNS)
      .filter((item) => item && typeof item.text === 'string' && (item.role === 'user' || item.role === 'model'))
      .map((item) => ({
        role: item.role,
        text: String(item.text).slice(0, 1500),
      }));
  }

  // Validación del contexto de mercado
  const sanitizedContext = typeof context === 'object' && context !== null ? context : {};

  return {
    prompt: trimmed,
    history: sanitizedHistory,
    context: sanitizedContext,
    fallbackToDegraded: Boolean(fallbackToDegraded),
  };
}

/**
 * Verifica si un proveedor secundario está formalmente configurado y disponible.
 * Regla: NUNCA se intenta invocar un proveedor alternativo si su clave o configuración no existe.
 */
export function isSecondaryProviderConfigured() {
  const secondaryKey = process.env.SECONDARY_AI_KEY || '';
  return secondaryKey.trim().length > 0;
}

/**
 * Procesa la consulta analítica ejecutando las políticas de seguridad, caché, Gemini y fallback controlado.
 */
export async function processAnalystQuery(rawBody, options = {}) {
  // 1. Validación de entradas
  const { prompt, history, context, fallbackToDegraded } = validateAnalystRequest(rawBody);

  // Si se solicita directamente modo degradado determinista sin invocar proveedores
  if (fallbackToDegraded) {
    return generateDegradedResponse({
      prompt,
      context,
      reason: 'Solicitado explícitamente por el usuario',
    });
  }

  // 2. Control de concurrencia
  if (activeRequestsCount >= MAX_CONCURRENT_REQUESTS) {
    throw new GeminiAdapterError(
      'Hay demasiadas consultas analizándose simultáneamente. Por favor, reintenta en un instante.',
      'CONCURRENT_LIMIT_EXCEEDED',
      429,
      true
    );
  }

  // 3. Control de cuota local (rate limiting)
  checkRateLimit();

  // 4. Verificación de caché para consultas idénticas inmediatas
  cleanupCache();
  const cacheKey = computeCacheKey(prompt, context);
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return {
      ...cached.data,
      isCached: true,
    };
  }

  // 5. Construcción del texto de contexto de mercado verificado
  const marketContextText = buildMarketContextString(context);

  // 6. Invocación al proveedor primario (Gemini)
  activeRequestsCount++;
  try {
    const result = await generateAnalystResponse({
      prompt,
      marketContextText,
      conversationHistory: history,
      clientOverride: options.clientOverride,
      timeoutMs: options.timeoutMs,
      signal: options.signal,
    });

    const responsePayload = {
      ...result,
      isCached: false,
      isDegraded: false,
      contextSummary: {
        hasAssetData: Boolean(context.asset),
        hasGlobalData: Boolean(context.global),
        hasPortfolioData: Boolean(context.portfolio),
        comparedCount: Array.isArray(context.compareAssets) ? context.compareAssets.length : 0,
      },
    };

    // Almacena en caché de corta duración
    responseCache.set(cacheKey, {
      createdAt: Date.now(),
      data: responsePayload,
    });

    return responsePayload;
  } catch (primaryErr) {
    // Si el error fue por cancelación del usuario, no ejecutar fallbacks
    if (primaryErr?.code === 'REQUEST_ABORTED') {
      throw primaryErr;
    }

    // Comprobar proveedor secundario si estuviese configurado
    if (isSecondaryProviderConfigured() && typeof options.secondaryProviderFn === 'function') {
      try {
        const secondaryResult = await options.secondaryProviderFn({
          prompt,
          marketContextText,
          conversationHistory: history,
        });
        return {
          ...secondaryResult,
          isCached: false,
          isDegraded: false,
        };
      } catch {
        // El proveedor secundario también falló; continúa hacia el modo degradado o propagación
      }
    }

    // Si las opciones autorizan fallback automático a modo degradado ante fallos de proveedor
    if (options.autoFallbackToDegraded) {
      return generateDegradedResponse({
        prompt,
        context,
        reason: primaryErr.message || 'Fallo de conectividad con Gemini',
      });
    }

    // Re-lanza el error tipado para que el cliente maneje el reintento o informe con precisión
    if (primaryErr instanceof AiProviderError) {
      throw primaryErr;
    }
    throw new GeminiAdapterError(
      primaryErr?.message || 'Error inesperado al procesar la consulta con el proveedor de IA.',
      'AI_PROVIDER_ERROR',
      primaryErr?.statusCode || 500,
      Boolean(primaryErr?.retryable)
    );
  } finally {
    activeRequestsCount = Math.max(0, activeRequestsCount - 1);
  }
}

/**
 * Devuelve el estado actual de la configuración de IA sin exponer ningún secreto.
 */
export function getAnalystStatus() {
  const apiKey = process.env.GEMINI_API_KEY || '';
  const isConfigured = apiKey.trim().length > 0;
  const model = process.env.GEMINI_MODEL || PRIMARY_DEFAULT_MODEL;

  return {
    isConfigured,
    model,
    maxPromptLength: MAX_PROMPT_LENGTH,
    maxHistoryTurns: MAX_HISTORY_TURNS,
    secondaryConfigured: isSecondaryProviderConfigured(),
  };
}

/**
 * Limpia completamente el estado en memoria (para uso en pruebas).
 */
export function resetAnalystServiceState() {
  activeRequestsCount = 0;
  requestTimestamps.length = 0;
  responseCache.clear();
}
