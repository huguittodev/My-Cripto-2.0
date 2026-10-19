import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type {
  CryptoList,
  MarketFilters,
  TableSortField,
  SortDirection,
  MarketOrder,
} from "../types/crypto";
import { getMarkets, searchCoins } from "../services/api.ts";
import {
  filterCoins,
  sortCoins,
  INITIAL_MARKET_FILTERS,
} from "../utils/marketFilters.ts";

interface UseMarketExplorerOptions {
  initialPerPage?: number;
  onCoinsLoaded?: (coins: CryptoList) => void;
  vsCurrency?: string;
}

export function useMarketExplorer({
  initialPerPage = 25,
  onCoinsLoaded,
  vsCurrency = "eur",
}: UseMarketExplorerOptions = {}) {
  const [coins, setCoins] = useState<CryptoList>([]);
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(initialPerPage);
  const [sortField, setSortField] = useState<TableSortField>("rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filters, setFilters] = useState<MarketFilters>(INITIAL_MARKET_FILTERS);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSearchingRemote, setIsSearchingRemote] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState<boolean>(false);

  // Referencia para cancelar peticiones pendientes ante cambios rápidos
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determina el parámetro de ordenación en servidor para CoinGecko
  const serverOrder = useMemo<MarketOrder>(() => {
    if (sortField === "volume") {
      return sortDirection === "asc" ? "volume_asc" : "volume_desc";
    }
    if (sortField === "rank") {
      // Para el ranking (#1, #2, #3), el sentido ascendente en número corresponde
      // a la mayor capitalización en CoinGecko (market_cap_desc)
      return sortDirection === "asc" ? "market_cap_desc" : "market_cap_asc";
    }
    if (sortField === "market_cap") {
      return sortDirection === "asc" ? "market_cap_asc" : "market_cap_desc";
    }
    // Para columnas sin soporte nativo de ordenación en el endpoint libre, ordenamos en cliente
    return "market_cap_desc";
  }, [sortField, sortDirection]);

  // Indica si la ordenación actual se ejecuta localmente sobre los datos de la página
  const isLocalSort = useMemo(() => {
    return sortField === "name" || sortField === "price" || sortField === "change";
  }, [sortField]);

  // Carga el conjunto estándar paginado de activos desde CoinGecko
  const fetchPage = useCallback(
    async (targetPage: number, targetPerPage: number, targetOrder: MarketOrder, ignoreCache = false) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setErrorMsg(null);
      setIsSearchMode(false);

      try {
        const data = await getMarkets({
          page: targetPage,
          perPage: targetPerPage,
          order: targetOrder,
          sparkline: true,
          vsCurrency: vsCurrency.toLowerCase(),
          signal: controller.signal,
          ignoreCache,
        });

        if (controller.signal.aborted) {
          return;
        }

        setCoins(data);
        if (onCoinsLoaded) {
          onCoinsLoaded(data);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (controller.signal.aborted) {
          return;
        }
        const message = err instanceof Error ? err.message : "Error al consultar los mercados.";
        setErrorMsg(message);
      } finally {
        if (abortControllerRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [onCoinsLoaded, vsCurrency],
  );

  // Ejecuta la búsqueda remota global cuando el usuario introduce un término de búsqueda
  const executeRemoteSearch = useCallback(
    async (query: string, ignoreCache = false) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setIsSearchMode(false);
        fetchPage(1, perPage, serverOrder, ignoreCache);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsSearchingRemote(true);
      setErrorMsg(null);
      setIsSearchMode(true);

      try {
        // 1. Descubre identificadores coincidentes mediante el catálogo global de CoinGecko
        const searchResults = await searchCoins(trimmed, controller.signal, ignoreCache);

        if (controller.signal.aborted) {
          return;
        }

        if (searchResults.length === 0) {
          setCoins([]);
          if (onCoinsLoaded) {
            onCoinsLoaded([]);
          }
          return;
        }

        // 2. Consulta los datos de mercado en tiempo real para los 25 activos más relevantes
        const topIds = searchResults.slice(0, 25).map((coin) => coin.id).filter(Boolean);
        if (topIds.length === 0) {
          setCoins([]);
          return;
        }

        const marketData = await getMarkets({
          ids: topIds,
          sparkline: true,
          vsCurrency: vsCurrency.toLowerCase(),
          signal: controller.signal,
          ignoreCache,
        });

        if (controller.signal.aborted) {
          return;
        }

        setCoins(marketData);
        if (onCoinsLoaded) {
          onCoinsLoaded(marketData);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (controller.signal.aborted) {
          return;
        }
        const message = err instanceof Error ? err.message : "Error al buscar activos.";
        setErrorMsg(message);
      } finally {
        if (abortControllerRef.current === controller) {
          setIsSearchingRemote(false);
        }
      }
    },
    [fetchPage, onCoinsLoaded, perPage, serverOrder, vsCurrency],
  );

  // Carga inicial y cambios en paginación u ordenación en servidor o divisa base
  useEffect(() => {
    if (!searchTerm.trim()) {
      fetchPage(page, perPage, serverOrder);
    }
  }, [page, perPage, serverOrder, vsCurrency, fetchPage, searchTerm]);

  // Manejo de búsqueda con debounce (400ms) para proteger límites de la API
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = searchTerm.trim();
    if (!trimmed) {
      if (isSearchMode) {
        setIsSearchMode(false);
        fetchPage(1, perPage, serverOrder);
      }
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      executeRemoteSearch(trimmed);
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, executeRemoteSearch, fetchPage, isSearchMode, perPage, serverOrder]);

  // Limpieza al desmontar el hook
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Alterna o establece columna y sentido de ordenación
  const handleSort = (field: TableSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      // Las métricas financieras ordenan por defecto en sentido descendente
      setSortDirection(field === "rank" || field === "name" ? "asc" : "desc");
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const handleFiltersChange = (newFilters: MarketFilters) => {
    setFilters(newFilters);
    if (page !== 1) {
      setPage(1);
    }
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_MARKET_FILTERS);
    if (page !== 1) {
      setPage(1);
    }
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (term.trim() && page !== 1) {
      setPage(1);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setPage(1);
    setIsSearchMode(false);
    fetchPage(1, perPage, serverOrder);
  };

  const handleRetry = () => {
    if (isSearchMode && searchTerm.trim()) {
      executeRemoteSearch(searchTerm, true);
    } else {
      fetchPage(page, perPage, serverOrder, true);
    }
  };

  // Filtrado local y ordenación determinista en memoria
  const filteredAndSortedCoins = useMemo(() => {
    // Si no está en modo de búsqueda remota, permite filtrado instantáneo por texto local
    const searchFilter = isSearchMode ? "" : searchTerm;
    const filtered = filterCoins(coins, filters, searchFilter);
    return sortCoins(filtered, sortField, sortDirection);
  }, [coins, filters, isSearchMode, searchTerm, sortField, sortDirection]);

  return {
    coins,
    filteredAndSortedCoins,
    page,
    perPage,
    sortField,
    sortDirection,
    filters,
    searchTerm,
    isLoading,
    isSearchingRemote,
    errorMsg,
    isSearchMode,
    isLocalSort,
    handleSort,
    handlePageChange,
    handlePerPageChange,
    handleFiltersChange,
    handleResetFilters,
    handleSearchChange,
    handleClearSearch,
    handleRetry,
  };
}
