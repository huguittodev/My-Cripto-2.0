import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { FavoriteButton } from "./FavoriteButton";

describe("FavoriteButton Component", () => {
  it("debe renderizar el estado activo (en favoritos) con aria-pressed true y color warning", () => {
    const html = renderToString(
      <FavoriteButton
        coinId="bitcoin"
        coinName="Bitcoin"
        isFavorite={true}
        onToggle={vi.fn()}
      />,
    );

    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="Eliminar Bitcoin de favoritos"');
    expect(html).toContain("text-crypto-warning");
    expect(html).toContain('fill="currentColor"');
  });

  it("debe renderizar el estado inactivo con aria-pressed false y contorno sin relleno", () => {
    const html = renderToString(
      <FavoriteButton
        coinId="ethereum"
        coinName="Ethereum"
        isFavorite={false}
        onToggle={vi.fn()}
      />,
    );

    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-label="Añadir Ethereum a favoritos"');
    expect(html).toContain('fill="none"');
    expect(html).toContain("text-crypto-text-muted");
  });

  it("debe aplicar las clases de tamaño especificadas", () => {
    const htmlSm = renderToString(
      <FavoriteButton coinId="solana" isFavorite={false} onToggle={vi.fn()} size="sm" />,
    );
    expect(htmlSm).toContain("p-1");

    const htmlLg = renderToString(
      <FavoriteButton coinId="solana" isFavorite={false} onToggle={vi.fn()} size="lg" />,
    );
    expect(htmlLg).toContain("p-2");
  });
});
