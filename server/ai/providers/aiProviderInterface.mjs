// Interfaz y tipos de error estándar para proveedores de Inteligencia Artificial
// Desacopla la lógica de negocio de implementaciones concretas (Gemini, fallback determinista u otros)

/**
 * Clase de error unificada para proveedores de IA.
 * Facilita la clasificación precisa entre errores transitorios (reintentables) y permanentes.
 */
export class AiProviderError extends Error {
  /**
   * @param {string} message - Mensaje descriptivo para el usuario o sistema
   * @param {string} code - Código legible (ej. INVALID_API_KEY, QUOTA_EXCEEDED, REQUEST_TIMEOUT)
   * @param {number} statusCode - Código de estado HTTP representativo (400, 401, 429, 502, 504, etc.)
   * @param {boolean} retryable - Indica si es seguro y adecuado reintentar la operación
   * @param {number|null} retryAfterSeconds - Tiempo de espera sugerido por el proveedor si aplica
   * @param {unknown} details - Información técnica adicional sin exponer secretos
   */
  constructor(
    message,
    code = 'AI_PROVIDER_ERROR',
    statusCode = 500,
    retryable = false,
    retryAfterSeconds = null,
    details = null
  ) {
    super(message);
    this.name = 'AiProviderError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.retryAfterSeconds = retryAfterSeconds;
    this.details = details;
  }
}

/**
 * Función auxiliar para calcular pausas con retroceso exponencial y variación aleatoria (jitter).
 * Evita el problema del "thundering herd" en reintentos concurrentes.
 * 
 * @param {number} attempt - Número de reintento actual (0-indexed)
 * @param {number} baseDelayMs - Tiempo base en milisegundos (por defecto 800ms)
 * @param {number} maxDelayMs - Límite máximo de espera en milisegundos (por defecto 5000ms)
 * @returns {number} Tiempo en milisegundos a esperar
 */
export function calculateBackoffWithJitter(attempt, baseDelayMs = 800, maxDelayMs = 5000) {
  const exponential = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
  // Jitter aleatorio de +/- 25% para dispersar el tráfico de reintento
  const jitterRange = exponential * 0.25;
  const jitter = (Math.random() * 2 - 1) * jitterRange;
  return Math.max(100, Math.floor(exponential + jitter));
}

/**
 * Ejecutor de operaciones asíncronas con reintentos controlados para errores recuperables.
 * 
 * @template T
 * @param {() => Promise<T>} fn - Función que realiza la llamada al proveedor
 * @param {object} options - Opciones de configuración de reintentos
 * @param {number} [options.maxRetries=2] - Número máximo de reintentos
 * @param {number} [options.baseDelayMs=600] - Tiempo base de espera
 * @param {(err: unknown) => boolean} [options.isRetryable] - Validador de reintentabilidad
 * @param {(ms: number) => Promise<void>} [options.sleepFn] - Inyector de función de espera para testing
 * @returns {Promise<T>}
 */
export async function executeWithRetry(
  fn,
  {
    maxRetries = 2,
    baseDelayMs = 600,
    isRetryable = (err) => (err instanceof AiProviderError ? err.retryable : false),
    sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = {}
) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const canRetry = attempt < maxRetries && isRetryable(err);
      if (!canRetry) {
        throw err;
      }

      // Si el error especifica un tiempo Retry-After, lo respeta (con tope razonable de 10s)
      const suggestedWaitMs =
        err instanceof AiProviderError && err.retryAfterSeconds
          ? Math.min(10000, err.retryAfterSeconds * 1000)
          : calculateBackoffWithJitter(attempt, baseDelayMs);

      attempt++;
      await sleepFn(suggestedWaitMs);
    }
  }
}
