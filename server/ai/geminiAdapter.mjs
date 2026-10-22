// Adaptador para el SDK oficial de Google Gen AI (@google/genai)
// Gestiona autenticación en servidor, llamadas al modelo, control de tiempos, reintentos y mapeo de errores

import { SYSTEM_INSTRUCTION } from './promptBuilder.mjs';
import {
  createGenAIClient as createProviderClient,
  callGeminiApi,
  classifyGeminiError,
  PRIMARY_DEFAULT_MODEL,
  FALLBACK_MODELS,
  DEFAULT_TIMEOUT_MS,
} from './providers/geminiProvider.mjs';
import {
  AiProviderError,
  executeWithRetry,
} from './providers/aiProviderInterface.mjs';

export const DEFAULT_MODEL = PRIMARY_DEFAULT_MODEL;
export const REQUEST_TIMEOUT_MS = DEFAULT_TIMEOUT_MS;

// Alias para preservar compatibilidad con imports preexistentes
export const GeminiAdapterError = AiProviderError;

/**
 * Instancia o recupera el cliente de Google Gen AI a partir de las variables de entorno.
 */
export function createGenAIClient(apiKey = process.env.GEMINI_API_KEY) {
  return createProviderClient(apiKey);
}

/**
 * Ejecuta una consulta al modelo Gemini con el contexto de mercado y el historial proporcionado.
 * Implementa timeout de seguridad, reintentos limitados con backoff y mapea errores a códigos inteligibles.
 */
export async function generateAnalystResponse({
  prompt,
  marketContextText,
  conversationHistory = [],
  modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL,
  clientOverride = null,
  timeoutMs = REQUEST_TIMEOUT_MS,
  signal,
  allowModelFallback = true,
}) {
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new GeminiAdapterError('El prompt de usuario no puede estar vacío.', 'INVALID_PROMPT', 400, false);
  }

  const client = clientOverride || createGenAIClient();

  // Construye el contenido del mensaje final enriquecido con el contexto de mercado
  const userContentParts = [
    `[CONTEXTO DE DATOS DE MERCADO VERIFICADOS]:\n${marketContextText}\n`,
    `[CONSULTA DEL USUARIO]:\n${prompt.trim()}`,
  ].join('\n');

  // Transforma el historial de conversación al formato esperado por el SDK
  const contents = [];

  for (const msg of conversationHistory) {
    if (!msg || !msg.text) continue;
    const role = msg.role === 'user' ? 'user' : 'model';
    contents.push({
      role,
      parts: [{ text: String(msg.text).slice(0, 1500) }],
    });
  }

  // Añade el turno actual
  contents.push({
    role: 'user',
    parts: [{ text: userContentParts }],
  });

  // Lista de modelos a probar: modelo preferido primero, seguido de alternativas si falla por deprecación o cuota diaria
  const modelsToTry = [modelName];
  if (allowModelFallback && !clientOverride) {
    for (const fb of FALLBACK_MODELS) {
      if (!modelsToTry.includes(fb)) {
        modelsToTry.push(fb);
      }
    }
  }

  let lastError = null;

  for (const currentModel of modelsToTry) {
    try {
      // Ejecuta la llamada con hasta 1 reintento limitado para errores transitorios (5xx / timeout)
      const result = await executeWithRetry(
        () =>
          callGeminiApi({
            client,
            modelName: currentModel,
            contents,
            systemInstruction: SYSTEM_INSTRUCTION,
            timeoutMs,
            signal,
          }),
        {
          maxRetries: 1, // Máximo 1 reintento para evitar esperas excesivas en la UI
          baseDelayMs: 600,
          isRetryable: (err) => err instanceof AiProviderError && err.retryable,
        }
      );

      return result;
    } catch (err) {
      lastError = err instanceof AiProviderError ? err : classifyGeminiError(err);

      // Si el error es de autenticación (401/403) o cancelación, NO reintentar con otro modelo
      if (lastError.statusCode === 401 || lastError.statusCode === 403 || lastError.code === 'REQUEST_ABORTED') {
        throw lastError;
      }

      // Si es un error de cliente (400) que no sea por incompatibilidad de modelo, lanzar de inmediato
      if (lastError.statusCode === 400 && lastError.code !== 'MODEL_NOT_FOUND') {
        throw lastError;
      }

      // Si no se permite fallback entre modelos o hay un cliente mock inyectado, lanzar de inmediato
      if (!allowModelFallback || clientOverride) {
        throw lastError;
      }

      // Si el modelo falló por:
      // - Modelo no encontrado o no soportado (404 / MODEL_NOT_FOUND)
      // - Cuota agotada (429 / QUOTA_EXCEEDED)
      // - Timeout de solicitud (504 / REQUEST_TIMEOUT)
      // - Error transitorio de servidor / falta de capacidad (500, 502, 503 / SERVER_ERROR)
      // Se permite probar el siguiente modelo de la lista de fallbacks
      const canTryNextModel =
        lastError.code === 'MODEL_NOT_FOUND' ||
        lastError.code === 'QUOTA_EXCEEDED' ||
        lastError.code === 'REQUEST_TIMEOUT' ||
        lastError.code === 'SERVER_ERROR' ||
        lastError.statusCode === 503 ||
        lastError.statusCode === 502 ||
        lastError.statusCode === 500;

      if (!canTryNextModel) {
        throw lastError;
      }
    }
  }

  throw lastError || new GeminiAdapterError('No se pudo obtener respuesta de ningún modelo disponible.', 'ALL_MODELS_FAILED', 502, false);
}
