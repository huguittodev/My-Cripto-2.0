import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";
import { WatchlistView } from "./WatchlistView";
import { clearWatchlistStorage } from "../../services/watchlistStorage";

describe("WatchlistView Component", () => {
  beforeEach(() => {
    clearWatchlistStorage();
  });

  it("debe renderizar el estado vacío con mensaje explicativo y botón hacia explorador", () => {
    const onNavigateMock = vi.fn();
    const html = renderToString(
      <WatchlistView
        selectedCoin={null}
        onSelectCoin={vi.fn()}
        onNavigateToMarkets={onNavigateMock}
      />,
    );

    expect(html).toContain("Mi Watchlist");
    expect(html).toContain("Tu watchlist está vacía");
    expect(html).toContain("Personaliza tu seguimiento");
    expect(html).toContain("Almacenamiento local del navegador");
    expect(html).toContain("Explorar Mercados");
  });
});
