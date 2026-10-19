import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { AiMessageItem } from "./AiMessageItem.tsx";
import type { AiChatMessage } from "../../types/crypto";

describe("AiMessageItem Component", () => {
  it("renderiza correctamente un mensaje del usuario", () => {
    const userMessage: AiChatMessage = {
      id: "msg-1",
      role: "user",
      text: "¿Cuál es el volumen de Bitcoin hoy?",
      timestamp: 1770000000000,
    };

    const html = renderToString(<AiMessageItem message={userMessage} />);
    expect(html).toContain("Tú");
    expect(html).toContain("¿Cuál es el volumen de Bitcoin hoy?");
  });

  it("renderiza un mensaje del analista con formato, etiqueta de contexto y modelo", () => {
    const modelMessage: AiChatMessage = {
      id: "msg-2",
      role: "model",
      text: "**Bitcoin** tiene un volumen de 45.000M EUR en 24h.\n- Alta liquidez observada.\n- Spreads reducidos.",
      timestamp: 1770000000000,
      model: "gemini-2.5-flash",
      contextTag: "Bitcoin (BTC) • CoinGecko API",
      isCached: false,
    };

    const html = renderToString(<AiMessageItem message={modelMessage} />);
    expect(html).toContain("AI Crypto Analyst");
    expect(html).toContain("gemini-2.5-flash");
    expect(html).toContain("Bitcoin (BTC) • CoinGecko API");
    // Formato de negritas y viñetas
    expect(html).toContain("<strong");
    expect(html).toContain("Bitcoin");
    expect(html).toContain("Alta liquidez observada");
  });

  it("renderiza indicador de caché cuando isCached es true", () => {
    const cachedMessage: AiChatMessage = {
      id: "msg-3",
      role: "model",
      text: "Respuesta servida desde caché.",
      timestamp: 1770000000000,
      isCached: true,
    };

    const html = renderToString(<AiMessageItem message={cachedMessage} />);
    expect(html).toContain("Caché");
  });

  it("renderiza estilos de advertencia/error cuando isError es true", () => {
    const errorMessage: AiChatMessage = {
      id: "msg-err",
      role: "model",
      text: "Error de conexión con Gemini.",
      timestamp: 1770000000000,
      isError: true,
    };
    const html = renderToString(<AiMessageItem message={errorMessage} />);
    expect(html).toContain("border-crypto-negative");
    expect(html).toContain("Error de conexión con Gemini.");
  });

  it("renderiza indicador de Modo Degradado cuando isDegraded es true", () => {
    const degradedMessage: AiChatMessage = {
      id: "msg-deg",
      role: "model",
      text: "Datos deterministas de mercado.",
      timestamp: 1770000000000,
      isDegraded: true,
      model: "deterministic-fallback",
    };

    const html = renderToString(<AiMessageItem message={degradedMessage} />);
    expect(html).toContain("Modo Degradado");
    expect(html).toContain("deterministic-fallback");
  });
});
