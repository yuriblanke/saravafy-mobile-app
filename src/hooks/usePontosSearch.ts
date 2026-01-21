import {
  normalizePontosSearchQueryGate,
  PONTOS_SEARCH_DEBOUNCE_MS,
  PONTOS_SEARCH_MIN_CHARS,
  searchPontos,
  type PontosSearchResult,
} from "@/src/services/pontosSearch";
import { useEffect, useMemo, useRef, useState } from "react";

export function usePontosSearch(
  query: string,
  {
    enabled = true,
    limit,
    offset,
  }: {
    enabled?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<PontosSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSearched, setLastSearched] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryNorm = useMemo(
    () => normalizePontosSearchQueryGate(query),
    [query]
  );
  const canSearch = queryNorm.length >= PONTOS_SEARCH_MIN_CHARS;

  useEffect(() => {
    if (!enabled) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    setError(null);

    if (!canSearch) {
      setResults([]);
      setIsLoading(false);
      setLastSearched(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const currentQuery = query;
      setIsLoading(true);
      setLastSearched(currentQuery);

      (async () => {
        try {
          const mapped = await searchPontos({
            query: currentQuery,
            limit,
            offset,
          });

          // Evita aplicar resultado se a query mudou entre o debounce e a resposta
          if (currentQuery !== query) return;

          setResults(mapped);
          setError(null);
        } catch (e) {
          if (currentQuery !== query) return;

          const message = e instanceof Error ? e.message : String(e);
          setResults([]);
          setError(message);
        } finally {
          if (currentQuery !== query) return;
          setIsLoading(false);
        }
      })();
    }, PONTOS_SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [canSearch, enabled, limit, offset, query]);

  return {
    canSearch,
    isLoading,
    results,
    error,
    lastSearched,
  };
}
