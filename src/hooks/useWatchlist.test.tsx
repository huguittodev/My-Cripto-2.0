import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { useWatchlist } from "./useWatchlist";
import {
  clearWatchlistStorage,
  saveStoredWatchlist,
} from "../services/watchlistStorage";

function WatchlistConsumer({ testCoinId }: { testCoinId: string }) {
  const { watchlistIds, isFavorite, isStorageAvailable } = useWatchlist();

  return (
    <div>
      <span id="watchlist-count">{watchlistIds.length}</span>
      <span id="is-fav">{isFavorite(testCoinId) ? "FAVORITE" : "NOT_FAVORITE"}</span>
      <span id="storage-status">{isStorageAvailable ? "AVAILABLE" : "RESTRICTED"}</span>
    </div>
  );
}

describe("useWatchlist Hook", () => {
  let memoryStore: Record<string, string> = {};

  beforeEach(() => {
    memoryStore = {};
    const mockStorage: Storage = {
      getItem: vi.fn((key: string) => memoryStore[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        memoryStore[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete memoryStore[key];
      }),
      clear: vi.fn(() => {
        memoryStore = {};
      }),
      key: vi.fn((idx: number) => Object.keys(memoryStore)[idx] || null),
      get length() {
        return Object.keys(memoryStore).length;
      },
    };

    vi.restoreAllMocks();
    Object.defineProperty(globalThis, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
    clearWatchlistStorage();
  });

  afterEach(() => {
    clearWatchlistStorage();
  });

  it("debe inicializarse con los datos almacenados en localStorage", () => {
    saveStoredWatchlist(["bitcoin", "solana"]);

    const html = renderToString(<WatchlistConsumer testCoinId="bitcoin" />);

    expect(html).toContain('id="watchlist-count">2</span>');
    expect(html).toContain('id="is-fav">FAVORITE</span>');
  });

  it("debe reportar NOT_FAVORITE para activos no incluidos en la watchlist", () => {
    saveStoredWatchlist(["ethereum"]);

    const html = renderToString(<WatchlistConsumer testCoinId="bitcoin" />);

    expect(html).toContain('id="watchlist-count">1</span>');
    expect(html).toContain('id="is-fav">NOT_FAVORITE</span>');
  });

  it("debe reflejar la disponibilidad operativa del almacenamiento", () => {
    const html = renderToString(<WatchlistConsumer testCoinId="bitcoin" />);
    expect(html).toContain('id="storage-status">AVAILABLE</span>');
  });
});
