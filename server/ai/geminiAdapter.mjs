// Adaptador para el SDK oficial de Google Gen AI (@google/genai)
// Gestiona autenticación en servidor, llamadas al modelo, control de tiempos y mapeo de errores

import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION } from './promptBuilder.mjs';

export const DEFAULT_MODEL = 'gemini-2.5-flash';
export const REQUEST_TIMEOUT_MS = 25000;

export class GeminiAdapterError extends Error {
  constructor(message, code, statusCode = 500, details = null) {
    super(message);
    this.name = 'GeminiAdapterError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Instancia o recupera el cliente de Google Gen AI a partir de las variables de entorno.
 */
export function createGenAIClient(apiKey = process.env.GEMINI_API_KEY) {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new GeminiAdapterError(
      'La variable GEMINI_API_KEY no está configurada en el servidor. Configura tu clave en el archivo .env.',
      'GEMINI_NOT_CONFIGURED',
      503
    );
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

/**
 * Ejecuta una consulta al modelo Gemini con el contexto de mercado y el historial proporcionado.
 * Implementa timeout de seguridad y mapea los errores de API y cuota a códigos inteligibles.
 */
export async function generateAnalystResponse({
  prompt,
  marketContextText,
  conversationHistory = [],
  modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL,
  clientOverride = null,
  timeoutMs = REQUEST_TIMEOUT_MS,
}) {
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new GeminiAdapterError('El prompt de usuario no puede estar vacío.', 'INVALID_PROMPT', 400);
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

  const generatePromise = client.models.generateContent({
    model: modelName,
    contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      maxOutputTokens: 1200,
      temperature: 0.2, // Baja temperatura para favorecer precisión factual y coherencia matemática
    },
  });

  // Temporizador de cancelación para evitar solicitudes colgadas
  let timerId;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      reject(
        new GeminiAdapterError(
          'Tiempo de espera agotado al conectar con el servicio de Gemini.',
          'REQUEST_TIMEOUT',
          504
        )
      );
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([generatePromise, timeoutPromise]);
    clearTimeout(timerId);

    const candidate = response.candidates?.[0];
    const text = response.text || candidate?.content?.parts?.[0]?.text || '';

    if (!text) {
      throw new GeminiAdapterError(
        'El modelo no devolvió texto en su respuesta.',
        'EMPTY_RESPONSE',
        502
      );
    }

    return {
      text,
      model: modelName,
      finishReason: candidate?.finishReason || 'STOP',
      usage: response.usageMetadata || null,
      timestamp: Date.now(),
    };
  } catch (err) {
    clearTimeout(timerId);

    if (err instanceof GeminiAdapterError) {
      throw err;
    }

    const message = err?.message || String(err);
    const status = err?.status || err?.statusCode || 500;

    // Detección de errores de cuota / rate limits (HTTP 429)
    if (status === 429 || message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
      throw new GeminiAdapterError(
        'Se ha superado la cuota de solicitudes gratuitas de la API de Gemini (Rate Limit). Por favor, espera unos segundos antes de volver a preguntar.',
        'QUOTA_EXCEEDED',
        429,
        message
      );
    }

    // Detección de clave no válida o permisos denegados
    if (status === 401 || status === 403 || message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED')) {
      throw new GeminiAdapterError(
        'La clave de API de Gemini no es válida o no dispone de permisos suficientes. Verifica tu GEMINI_API_KEY en .env.',
        'INVALID_API_KEY',
        401,
        message
      );
    }

    // Fallo de conexión o red
    if (message.includes('fetch failed') || message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
      throw new GeminiAdapterError(
        'No se pudo establecer conexión de red con los servidores de Google Gemini.',
        'NETWORK_ERROR',
        502,
        message
      );
    }

    throw new GeminiAdapterError(
      `Error al procesar la respuesta de Gemini: ${message}`,
      'GEMINI_ERROR',
      status >= 400 && status < 600 ? status : 500,
      message
    );
  }
}
