// Gestor centralizado de peticiones HTTP: deduplicación en vuelo, caché en memoria y reintentos con backoff

import {
  RateLimitError,
  HttpError,
  NetworkError,
  UnexpectedDataError,
} from "./types.ts";
import type { CacheRecord } from "./types.ts";

export interface FetchOptions<T> {
  url: string;
  cacheKey: string;
  ttlMs: number;
  signal?: AbortSignal;
  passSignalObject?: boolean;
  ignoreCache?: boolean;
  maxRetries?: number;
  validator: (data: unknown) => data is T;
  errorMessagePrefix?: string;
}

export class RequestManager {
  // Caché en memoria de respuestas resueltas
  private cache = new Map<string, CacheRecord<unknown>>();

  // Registro de promesas en curso para evitar peticiones idénticas concurrentes (deduplicación)
  private inFlight = new Map<string, Promise<unknown>>();

  // Marca temporal de la última petición emitida para espaciar ráfagas
  private lastRequestTime = 0;

  // Comprueba si estamos en entorno de pruebas de forma segura en navegador y Node
  private isTestEnvironment(): boolean {
    const globalObj = globalThis as unknown as { process?: { env?: Record<string, string> } };
    return globalObj.process?.env?.NODE_ENV === "test";
  }

  // Espaciado mínimo en milisegundos entre solicitudes de red sucesivas (0 en tests para máxima velocidad)
  private getMinRequestSpacingMs(): number {
    return this.isTestEnvironment() ? 0 : 120;
  }

  // Número por defecto de reintentos
  getDefaultMaxRetries(): number {
    return this.isTestEnvironment() ? 0 : 2;
  }

  /**
   * Pausa la ejecución durante el número de milisegundos indicado.
   * Si se proporciona una señal de cancelación, se interrumpe inmediatamente.
   */
  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }

      const timer = setTimeout(() => {
        resolve();
      }, ms);

      if (signal) {
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      }
    });
  }

  /**
   * Espacia las peticiones para prevenir ráfagas concurrentes que activen rate limits de Cloudflare.
   */
  private async throttle(): Promise<void> {
    const spacing = this.getMinRequestSpacingMs();
    if (spacing <= 0) return;

    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTime;
    if (timeSinceLast < spacing) {
      await this.delay(spacing - timeSinceLast);
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Ejecuta una petición HTTP con soporte de deduplicación, caché y reintentos exponenciales.
   */
  async request<T>({
    url,
    cacheKey,
    ttlMs,
    signal,
    passSignalObject = false,
    ignoreCache = false,
    maxRetries,
    validator,
    errorMessagePrefix = "Error en la petición",
  }: FetchOptions<T>): Promise<T> {
    const retriesLimit = maxRetries !== undefined ? maxRetries : this.getDefaultMaxRetries();

    // 1. Comprueba si existen datos válidos y vigentes en caché
    if (!ignoreCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.data as T;
      }
    }

    // 2. Si ya existe una petición idéntica en curso, reutiliza la misma promesa (deduplicación)
    const existingPromise = this.inFlight.get(cacheKey);
    if (existingPromise) {
      return existingPromise as Promise<T>;
    }

    // 3. Orquesta la petición real con reintentos controlados
    const fetchPromise = (async (): Promise<T> => {
      let attempts = 0;

      while (attempts <= retriesLimit) {
        attempts++;

        try {
          // Espaciado sutil de peticiones
          await this.throttle();

          if (signal?.aborted) {
            throw new DOMException("Aborted", "AbortError");
          }

          const response = await (signal || passSignalObject ? fetch(url, { signal }) : fetch(url));

          // HTTP 429: Límite de peticiones alcanzado
          if (response.status === 429) {
            const retryHeader = response.headers?.get("retry-after");
            const retryAfterSec = retryHeader ? parseInt(retryHeader, 10) : null;

            // Si quedan intentos de reintento transitorio, esperamos con backoff exponencial
            if (attempts <= retriesLimit) {
              const waitMs =
                typeof retryAfterSec === "number" && !isNaN(retryAfterSec) && retryAfterSec > 0
                  ? Math.min(retryAfterSec * 1000, 8000)
                  : Math.min(1000 * Math.pow(2, attempts - 1) + Math.random() * 300, 5000);

              await this.delay(waitMs, signal);
              continue;
            }

            throw new RateLimitError(
              "Límite de peticiones alcanzado (HTTP 429). Espera un minuto antes de reintentar.",
              retryAfterSec,
            );
          }

          // HTTP 502, 503, 504: Errores transitorios del servidor
          if (response.status === 502 || response.status === 503 || response.status === 504) {
            if (attempts <= retriesLimit) {
              const waitMs = Math.min(800 * Math.pow(2, attempts - 1) + Math.random() * 200, 4000);
              await this.delay(waitMs, signal);
              continue;
            }
            throw new HttpError(response.status);
          }

          // Otros errores HTTP no reintentables (400, 401, 403, 404, etc.)
          if (!response.ok) {
            throw new HttpError(response.status);
          }

          // Procesa la respuesta JSON y valida su estructura en runtime
          let json: unknown;
          try {
            json = await response.json();
          } catch {
            throw new UnexpectedDataError("Error al procesar los datos de la respuesta.");
          }

          if (!validator(json)) {
            throw new UnexpectedDataError(
              "La respuesta del proveedor de mercado no tiene el formato esperado.",
            );
          }

          // Almacena en caché de memoria con expiración configurada
          this.cache.set(cacheKey, {
            data: json,
            expiresAt: Date.now() + ttlMs,
          });

          return json as T;
        } catch (error: unknown) {
          // Si fue cancelada expresamente por el componente, propaga la excepción original
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }

          // Propaga errores de dominio conocidos
          if (
            error instanceof RateLimitError ||
            error instanceof HttpError ||
            error instanceof UnexpectedDataError
          ) {
            throw error;
          }

          // Error de red (TypeError común de fetch al desconectarse o fallar DNS/CORS)
          if (error instanceof TypeError) {
            // Si el error es transitorio y quedan intentos
            if (attempts <= retriesLimit) {
              const waitMs = Math.min(500 * Math.pow(2, attempts - 1), 3000);
              await this.delay(waitMs, signal);
              continue;
            }
            throw new NetworkError();
          }

          if (error instanceof Error) {
            throw new NetworkError(`${errorMessagePrefix}: ${error.message}`);
          }

          throw new NetworkError();
        }
      }

      throw new NetworkError();
    })();

    // Registra la promesa para deduplicación
    this.inFlight.set(cacheKey, fetchPromise);

    try {
      return await fetchPromise;
    } finally {
      // Elimina la promesa una vez resuelta o rechazada
      this.inFlight.delete(cacheKey);
    }
  }

  // Permite obtener datos en caché aunque hayan expirado (stale data) para fallback ante fallos
  getStaleData<T>(cacheKey: string): T | null {
    const record = this.cache.get(cacheKey);
    return record ? (record.data as T) : null;
  }

  // Limpia entradas de caché que comiencen con el prefijo indicado o toda la caché
  clearCache(prefix?: string): void {
    if (!prefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

// Instancia única compartida del gestor de peticiones
export const requestManager = new RequestManager();
