import { useState } from "react";
import type { FC } from "react";
import type { AiChatMessage } from "../../types/crypto";
import { formatDateTime } from "../../utils/formatters.ts";

interface AiMessageItemProps {
  message: AiChatMessage;
}

/**
 * Renderizador ligero de formato de texto (párrafos, negritas, listas y bloques de código)
 * sin requerir dependencias externas pesadas.
 */
function renderFormattedContent(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Líneas vacías
    if (!line.trim()) {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }

    // Elementos de lista con viñeta
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const bulletContent = line.trim().slice(2);
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 ml-1 sm:ml-2 my-1">
          <span className="text-crypto-accent select-none mt-0.5 leading-none">•</span>
          <span className="flex-1 break-words">{parseInlineFormatting(bulletContent)}</span>
        </div>,
      );
      continue;
    }

    // Párrafo estándar con soporte de ruptura de palabras largas
    elements.push(
      <p key={`p-${i}`} className="my-1.5 leading-relaxed break-words">
        {parseInlineFormatting(line)}
      </p>,
    );
  }

  return elements;
}

/**
 * Parsea negritas (**texto**) y código en línea (`código`)
 */
function parseInlineFormatting(str: string): React.ReactNode {
  // Fragmenta por marcas de código o negrita
  const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-crypto-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-crypto-surface-raised border border-crypto-border/60 text-crypto-accent font-mono text-xs break-all"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export const AiMessageItem: FC<AiMessageItemProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-2 sm:gap-3 animate-fade-in ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Avatar del modelo */}
      {!isUser && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-crypto-primary-soft border border-crypto-primary/40 flex items-center justify-center flex-shrink-0 text-crypto-accent shadow-sm mt-0.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3.5 h-3.5 sm:w-4 sm:h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      )}

      {/* Burbuja del mensaje: tamaño optimizado (15px en móvil, 16px en escritorio) y ancho ampliado */}
      <div
        className={`w-full max-w-[94%] sm:max-w-[85%] md:max-w-[78%] rounded-2xl p-3.5 sm:p-4 text-[15px] sm:text-base leading-relaxed shadow-sm transition-all break-words ${
          isUser
            ? "bg-crypto-primary text-white rounded-br-xs shadow-crypto-primary/10 ml-auto"
            : message.isError
            ? "bg-crypto-negative-soft border border-crypto-negative/30 text-crypto-negative rounded-bl-xs"
            : "bg-crypto-surface border border-crypto-border text-crypto-text-secondary rounded-bl-xs"
        }`}
      >
        {/* Cabecera del mensaje del analista */}
        {!isUser && (
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 pb-2 mb-2 border-b border-crypto-border/60 text-[11px] font-mono text-crypto-text-muted">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-crypto-text">AI Crypto Analyst</span>
              {message.model && (
                <span className="px-1.5 py-0.2 rounded bg-crypto-surface-raised border border-crypto-border text-[10px]">
                  {message.model}
                </span>
              )}
              {message.isCached && (
                <span className="px-1.5 py-0.2 rounded bg-crypto-info/10 text-crypto-info text-[10px]" title="Respuesta recuperada de caché local">
                  Caché
                </span>
              )}
              {message.isDegraded && (
                <span className="px-1.5 py-0.2 rounded bg-crypto-warning/15 text-crypto-warning border border-crypto-warning/30 text-[10px] font-semibold" title="Datos deterministas de la terminal (sin análisis por IA)">
                  Modo Degradado
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="text-crypto-text-muted hover:text-crypto-text transition-colors flex items-center gap-1 py-1 px-1.5 -mr-1 rounded hover:bg-crypto-surface-raised text-[11px]"
              title="Copiar respuesta"
            >
              {copied ? <span>✓ Copiado</span> : <span>Copiar</span>}
            </button>
          </div>
        )}

        {/* Contenido formateado */}
        <div className="space-y-1.5">{renderFormattedContent(message.text)}</div>

        {/* Metadatos de contexto de datos al pie */}
        {!isUser && message.contextTag && (
          <div className="mt-2.5 pt-2 border-t border-crypto-border/40 text-[10px] font-mono text-crypto-text-muted flex items-center justify-between gap-2 flex-wrap">
            <span className="truncate">{message.contextTag}</span>
            <span className="flex-shrink-0">{formatDateTime(message.timestamp, true)}</span>
          </div>
        )}
      </div>

      {/* Avatar del usuario */}
      {isUser && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-crypto-surface-raised border border-crypto-border flex items-center justify-center flex-shrink-0 text-crypto-text-secondary font-mono font-bold text-xs mt-0.5">
          Tú
        </div>
      )}
    </div>
  );
};
