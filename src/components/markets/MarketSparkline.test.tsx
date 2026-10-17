import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { MarketSparkline } from "./MarketSparkline";

describe("MarketSparkline Component", () => {
  it("debe renderizar el minigráfico en verde para tendencias alcistas (+)", () => {
    const prices = [50000, 52000, 51000, 55000];
    const html = renderToString(
      <MarketSparkline prices={prices} coinName="Bitcoin" />,
    );

    expect(html).toContain("<svg");
    expect(html).toContain("<path");
    expect(html).toContain("#22C55E");
    expect(html).toContain('aria-label="Evolución 7 días de Bitcoin: tendencia alcista"');
  });

  it("debe renderizar el minigráfico en rojo para tendencias bajistas (-)", () => {
    const prices = [55000, 53000, 51000, 49000];
    const html = renderToString(
      <MarketSparkline prices={prices} coinName="Ethereum" />,
    );

    expect(html).toContain("<svg");
    expect(html).toContain("<path");
    expect(html).toContain("#F87171");
    expect(html).toContain('aria-label="Evolución 7 días de Ethereum: tendencia bajista"');
  });

  it("debe mostrar estado neutral de ausencia de datos ante series vacías o insuficientes (< 2 puntos)", () => {
    const htmlEmpty = renderToString(<MarketSparkline prices={[]} coinName="Desconocida" />);
    expect(htmlEmpty).toContain("—");
    expect(htmlEmpty).not.toContain("<svg");

    const htmlSingle = renderToString(<MarketSparkline prices={[100]} coinName="Solana" />);
    expect(htmlSingle).toContain("—");
    expect(htmlSingle).not.toContain("<svg");

    const htmlUndefined = renderToString(<MarketSparkline coinName="Cardano" />);
    expect(htmlUndefined).toContain("—");
    expect(htmlUndefined).not.toContain("<svg");
  });
});
