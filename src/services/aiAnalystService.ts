import type {
  AiAnalystResponse,
  AiAnalystStatus,
  AiChatMessage,
  AiMarketContext,
} from "../types/crypto";

export class AiAnalystError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;
  retryable?: boolean;

  constructor(message: string, code = "AI_ERROR", statusCode = 500, details?: unknown, retryable?: boolean) {
    super(message);
    this.name = "AiAnalystError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.retryable = retryable;
  }
}

/**
 * Consulta el estado del servicio de IA en el servidor (si la clave está configurada y el modelo activo).
 * No expone ninguna clave de API en el cliente.
 */
export async function fetchAiStatus(signal?: AbortSignal): Promise<AiAnalystStatus> {
  try {
    const res = await fetch("/api/ai/status", {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!res.ok) {
      throw new AiAnalystError(
        `Error al verificar el estado de la IA (HTTP ${res.status})`,
        "STATUS_CHECK_FAILED",
        res.status,
      );
    }

    const json = await res.json();
    if (!json.ok || !json.data) {
      throw new AiAnalystError("Respuesta de estado inválida del servidor.", "INVALID_STATUS_RESPONSE", 500);
    }

    return json.data as AiAnalystStatus;
  } catch (err) {
    if (err instanceof AiAnalystError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    throw new AiAnalystError(
      "No se pudo conectar con el endpoint de estado de la IA.",
      "NETWORK_ERROR",
      502,
      err instanceof Error ? err.message : String(err),
    );
  }
}

export interface AskAiAnalystParams {
  prompt: string;
  context?: AiMarketContext;
  history?: Array<Pick<AiChatMessage, "role" | "text">>;
  signal?: AbortSignal;
}

/**
 * Envía la consulta analítica al endpoint del servidor junto con los datos reales de mercado.
 * La clave de Gemini permanece exclusivamente en el servidor.
 */
export async function askAiAnalyst({
  prompt,
  context,
  history = [],
  signal,
}: AskAiAnalystParams): Promise<AiAnalystResponse> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new AiAnalystError("La consulta no puede estar vacía.", "EMPTY_PROMPT", 400);
  }

  try {
    const res = await fetch("/api/ai/analyst", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        prompt: trimmed,
        context: context || {},
        history: history.map((h) => ({ role: h.role, text: h.text })),
      }),
      signal,
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.ok) {
      const message = json.message || `Error del servidor al procesar consulta (HTTP ${res.status})`;
      const code = json.error || "API_ERROR";
      throw new AiAnalystError(message, code, res.status, json.details, json.retryable);
    }

    return json.data as AiAnalystResponse;
  } catch (err) {
    if (err instanceof AiAnalystError) throw err;
    if ((err instanceof Error && err.name === "AbortError") || (err instanceof DOMException && err.name === "AbortError")) {
      throw new AiAnalystError("Consulta cancelada por el usuario.", "REQUEST_ABORTED", 0, undefined, false);
    }
    throw new AiAnalystError(
      "Error de conexión con el servicio de análisis de IA.",
      "NETWORK_ERROR",
      502,
      err instanceof Error ? err.message : String(err),
    );
  }
}
