import type { CryptoList } from "../types/crypto";

const BASE_URL = "https://api.coingecko.com/api/v3";

export class RateLimitError extends Error {
  constructor(
    message = "Límite de peticiones alcanzado (HTTP 429). Espera un minuto antes de reintentar.",
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Error en la solicitud a CoinGecko (HTTP ${status}).`);
    this.name = "HttpError";
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor(
    message = "Error de red: No se pudo conectar con el servidor. Revisa tu conexión a internet.",
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export class UnexpectedDataError extends Error {
  constructor(
    message = "La respuesta del proveedor de mercado no tiene el formato esperado.",
  ) {
    super(message);
    this.name = "UnexpectedDataError";
  }
}

export const getTopCoins = async ({
  numCryptos,
}: {
  numCryptos: number;
}): Promise<CryptoList> => {
  let response: Response;

  try {
    response = await fetch(
      `${BASE_URL}/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=${numCryptos}&page=1&sparkline=false`,
    );
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      throw new NetworkError();
    }
    if (error instanceof Error) {
      throw new NetworkError(`Error al realizar la petición: ${error.message}`);
    }
    throw new NetworkError();
  }

  if (response.status === 429) {
    throw new RateLimitError();
  }

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  try {
    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
      throw new UnexpectedDataError();
    }
    return data as CryptoList;
  } catch (error: unknown) {
    if (error instanceof UnexpectedDataError) {
      throw error;
    }
    throw new UnexpectedDataError(
      "Error al procesar los datos de la respuesta.",
    );
  }
};
