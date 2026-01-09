import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import {
  getCollectionPontosQueryOptions,
  useCollectionPontosQuery,
} from "@/src/queries/collectionPontos";

export type PlayerPonto = {
  id: string;
  title: string;
  artist?: string | null;
  duration_seconds?: number | null;
  audio_url?: string | null;
  cover_url?: string | null;
  lyrics: string;
  tags: string[];
};

export type CollectionPlayerItem = {
  position: number;
  ponto: PlayerPonto;
};

export type PatchablePontoFields = {
  id: string;
  title: string;
  artist?: string | null;
  lyrics: string;
  tags: string[];
};

type PlayerDataParams =
  | { collectionId: string }
  | { mode: "all"; query?: string };

function normalize(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function matchesQuery(ponto: PlayerPonto, query: string) {
  const q = normalize(query);
  if (!q) return true;
  if (normalize(ponto.title).includes(q)) return true;
  if (normalize(ponto.lyrics).includes(q)) return true;
  return ponto.tags.some((t) => normalize(t).includes(q));
}

function coerceTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }

  if (typeof value === "string") {
    return value
      .split(/[,|]/g)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  return [];
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error && typeof e.message === "string" && e.message.trim()) {
    return e.message;
  }

  if (e && typeof e === "object") {
    const anyErr = e as any;
    if (typeof anyErr?.message === "string" && anyErr.message.trim()) {
      return anyErr.message;
    }
  }

  return String(e);
}

export function useCollectionPlayerData(
  params: PlayerDataParams,
  options?: { enabled?: boolean; allowCachedWhileDisabled?: boolean }
) {
  const isAllMode = "mode" in params && params.mode === "all";
  const collectionId = "collectionId" in params ? params.collectionId : "";
  const query = isAllMode && "query" in params ? params.query ?? "" : "";

  const enabled = options?.enabled ?? true;
  const allowCachedWhileDisabled = options?.allowCachedWhileDisabled ?? false;

  const queryClient = useQueryClient();

  // Modo: pontos de uma collection (cache por collectionId)
  const collectionPontosQuery = useCollectionPontosQuery(collectionId, {
    enabled: enabled && !isAllMode,
  });

  // Modo: biblioteca inteira (cache sem depender do filtro local)
  const allPontosQuery = useQuery({
    queryKey: ["pontos", "all", "public"] as const,
    enabled: enabled && isAllMode,
    staleTime: 3 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
    queryFn: async () => {
      const res = await supabase
        .from("pontos")
        .select(
          "id, title, lyrics, tags, audio_url, duration_seconds, cover_url, artist"
        )
        .eq("is_active", true)
        .eq("restricted", false)
        .order("title", { ascending: true });

      if (res.error) {
        const anyErr = res.error as any;
        const message =
          typeof anyErr?.message === "string" && anyErr.message.trim()
            ? anyErr.message
            : "Erro ao carregar pontos.";
        const extra = [anyErr?.code, anyErr?.details, anyErr?.hint]
          .filter((v) => typeof v === "string" && v.trim().length > 0)
          .join(" | ");
        throw new Error(extra ? `${message} (${extra})` : message);
      }

      const rows = (res.data ?? []) as any[];
      const mapped: PlayerPonto[] = rows
        .map((row) => {
          if (!row || typeof row !== "object") return null;

          const title =
            (typeof row.title === "string" && row.title.trim()) || "Ponto";
          const lyrics = (typeof row.lyrics === "string" && row.lyrics) || "";

          const p: PlayerPonto = {
            id: String(row.id ?? ""),
            title,
            artist: typeof row.artist === "string" ? row.artist : null,
            duration_seconds:
              typeof row.duration_seconds === "number"
                ? row.duration_seconds
                : null,
            audio_url: typeof row.audio_url === "string" ? row.audio_url : null,
            cover_url: typeof row.cover_url === "string" ? row.cover_url : null,
            lyrics,
            tags: coerceTags(row.tags),
          };

          if (!p.id) return null;
          return p;
        })
        .filter(Boolean) as PlayerPonto[];

      return mapped;
    },
  });

  const collectionItems = collectionPontosQuery.data;
  const allPontos = allPontosQuery.data;

  const items: CollectionPlayerItem[] = useMemo(() => {
    if (!isAllMode) {
      if (!enabled && !allowCachedWhileDisabled) return [];
      return collectionItems ?? [];
    }

    if (!enabled && !allowCachedWhileDisabled) return [];
    const pontos = allPontos ?? [];
    return pontos
      .filter((p: PlayerPonto) => matchesQuery(p, query))
      .map((p: PlayerPonto, idx: number) => ({
        position: idx + 1,
        ponto: p,
      }));
  }, [allPontos, collectionItems, enabled, isAllMode, query]);

  const isLoading = isAllMode ? allPontosQuery.isLoading : collectionPontosQuery.isLoading;
  const isFetching = isAllMode ? allPontosQuery.isFetching : collectionPontosQuery.isFetching;
  const error = isAllMode
    ? (allPontosQuery.error ? getErrorMessage(allPontosQuery.error) : null)
    : collectionPontosQuery.errorMessage;

  const isSuccess = isAllMode ? allPontosQuery.isSuccess : collectionPontosQuery.isSuccess;
  const isEmpty = useMemo(
    () => enabled && isSuccess && !error && items.length === 0,
    [enabled, error, isSuccess, items.length]
  );

  const patchPontoById = useCallback((updated: PatchablePontoFields) => {
    if (!updated?.id) return;

    // Atualiza o cache do modo coleção (se existir)
    if (collectionId) {
      const opts = getCollectionPontosQueryOptions(collectionId);
      queryClient.setQueryData<CollectionPlayerItem[]>(opts.queryKey, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((it) =>
          it.ponto.id === updated.id
            ? {
                ...it,
                ponto: {
                  ...it.ponto,
                  title: updated.title,
                  artist:
                    typeof updated.artist === "string" || updated.artist === null
                      ? updated.artist
                      : it.ponto.artist ?? null,
                  lyrics: updated.lyrics,
                  tags: updated.tags,
                },
              }
            : it
        );
      });
    }

    // Atualiza o cache do modo "all" (se existir)
    queryClient.setQueryData<PlayerPonto[]>(["pontos", "all", "public"], (old) => {
      if (!Array.isArray(old)) return old;
      return old.map((p) =>
        p.id === updated.id
          ? {
              ...p,
              title: updated.title,
              artist:
                typeof updated.artist === "string" || updated.artist === null
                  ? updated.artist
                  : p.artist ?? null,
              lyrics: updated.lyrics,
              tags: updated.tags,
            }
          : p
      );
    });
  }, []);

  const reload = useCallback(() => {
    if (!enabled) return;
    if (isAllMode) {
      void allPontosQuery.refetch();
      return;
    }
    void collectionPontosQuery.refetch();
  }, [allPontosQuery, collectionPontosQuery, enabled, isAllMode]);

  return {
    items,
    isLoading,
    error,
    isEmpty,
    isFetching,
    reload,
    patchPontoById,
  };
}
