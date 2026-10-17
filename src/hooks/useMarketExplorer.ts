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
}

export function useMarketExplorer({
  initialPerPage = 25,
  onCoinsLoaded,
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
    if (sortField === "rank" || sortField === "market_cap") {
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
          signal: controller.signal,
          ignoreCache,
        });

        setCoins(data);
        if (onCoinsLoaded) {
          onCoinsLoaded(data);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const message = err instanceof Error ? err.message : "Error al consultar los mercados.";
        setErrorMsg(message);
      } finally {
        setIsLoading(false);
      }
    },
    [onCoinsLoaded],
  );

  // Ejecuta la búsqueda remota global cuando el usuario introduce un término de búsqueda
  const executeRemoteSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setIsSearchMode(false);
        fetchPage(page, perPage, serverOrder);
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
        const searchResults = await searchCoins(trimmed, controller.signal);

        if (searchResults.length === 0) {
          setCoins([]);
          return;
        }

        // 2. Consulta los datos de mercado en tiempo real para los 25 activos más relevantes
        const topIds = searchResults.slice(0, 25).map((coin) => coin.id);
        const marketData = await getMarkets({
          ids: topIds,
          sparkline: true,
          signal: controller.signal,
        });

        setCoins(marketData);
        if (onCoinsLoaded) {
          onCoinsLoaded(marketData);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const message = err instanceof Error ? err.message : "Error al buscar activos.";
        setErrorMsg(message);
      } finally {
        setIsSearchingRemote(false);
      }
    },
    [fetchPage, onCoinsLoaded, page, perPage, serverOrder],
  );

  // Carga inicial y cambios en paginación u ordenación en servidor
  useEffect(() => {
    if (!searchTerm.trim()) {
      fetchPage(page, perPage, serverOrder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, serverOrder]);

  // Manejo de búsqueda con debounce (400ms) para proteger límites de la API
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchTerm.trim()) {
      if (isSearchMode) {
        setIsSearchMode(false);
        fetchPage(page, perPage, serverOrder);
      }
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      executeRemoteSearch(searchTerm);
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, executeRemoteSearch, fetchPage, isSearchMode, page, perPage, serverOrder]);

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
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_MARKET_FILTERS);
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setIsSearchMode(false);
  };

  const handleRetry = () => {
    if (isSearchMode && searchTerm.trim()) {
      executeRemoteSearch(searchTerm);
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
