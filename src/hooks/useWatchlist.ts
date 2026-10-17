import { useState, useEffect, useCallback } from "react";
import {
  getStoredWatchlist,
  addIdToWatchlist,
  removeIdFromWatchlist,
  isWatchlistStorageAvailable,
} from "../services/watchlistStorage.ts";

const WATCHLIST_EVENT_NAME = "mycrypto:watchlist_updated";

/**
 * Hook reactivo para gestionar la lista de criptomonedas favoritas con persistencia local.
 * Sincroniza automáticamente todos los componentes montados y pestañas abiertas del navegador.
 */
export function useWatchlist() {
  const [watchlistIds, setWatchlistIds] = useState<string[]>(() => {
    return getStoredWatchlist();
  });

  const [isStorageAvailable] = useState<boolean>(() => {
    return isWatchlistStorageAvailable();
  });

  // Notifica a otros hooks y componentes en la misma ventana mediante un evento personalizado
  const notifyUpdate = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT_NAME));
    }
  }, []);

  // Escucha cambios locales (misma ventana) y remotos (otras pestañas mediante storage event)
  useEffect(() => {
    const handleSync = () => {
      setWatchlistIds(getStoredWatchlist());
    };

    if (typeof window !== "undefined") {
      window.addEventListener(WATCHLIST_EVENT_NAME, handleSync);
      window.addEventListener("storage", handleSync);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(WATCHLIST_EVENT_NAME, handleSync);
        window.removeEventListener("storage", handleSync);
      }
    };
  }, []);

  const isFavorite = useCallback(
    (coinId: string): boolean => {
      if (!coinId) return false;
      const normalized = coinId.trim().toLowerCase();
      return watchlistIds.includes(normalized);
    },
    [watchlistIds],
  );

  const addFavorite = useCallback(
    (coinId: string) => {
      const updated = addIdToWatchlist(coinId);
      setWatchlistIds(updated);
      notifyUpdate();
    },
    [notifyUpdate],
  );

  const removeFavorite = useCallback(
    (coinId: string) => {
      const updated = removeIdFromWatchlist(coinId);
      setWatchlistIds(updated);
      notifyUpdate();
    },
    [notifyUpdate],
  );

  const toggleFavorite = useCallback(
    (coinId: string) => {
      if (!coinId) return;
      const normalized = coinId.trim().toLowerCase();
      if (watchlistIds.includes(normalized)) {
        removeFavorite(normalized);
      } else {
        addFavorite(normalized);
      }
    },
    [watchlistIds, addFavorite, removeFavorite],
  );

  return {
    watchlistIds,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    isStorageAvailable,
  };
}
