import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  options?: { enabled?: boolean }
) {
  const isAllMode = "mode" in params && params.mode === "all";
  const collectionId = "collectionId" in params ? params.collectionId : "";
  const query = isAllMode && "query" in params ? params.query ?? "" : "";

  const enabled = options?.enabled ?? true;

  const [items, setItems] = useState<CollectionPlayerItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmpty = useMemo(
    () => enabled && !isLoading && !error && items.length === 0,
    [enabled, isLoading, error, items.length]
  );

  const load = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!isAllMode && !collectionId) {
      setItems([]);
      setError("Collection inválida.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = isAllMode
        ? await supabase
            .from("pontos")
            .select(
              "id, title, lyrics, tags, audio_url, duration_seconds, cover_url, artist"
            )
            .eq("is_active", true)
            .eq("restricted", false)
            .order("title", { ascending: true })
        : await supabase
            .from("collections_pontos")
            .select(
              "position, pontos:ponto_id (id, title, lyrics, tags, audio_url, duration_seconds, cover_url, artist)"
            )
            .eq("collection_id", collectionId)
            .order("position", { ascending: true });

      if (res.error) {
        const anyErr = res.error as any;
        const message =
          typeof anyErr?.message === "string" && anyErr.message.trim()
            ? anyErr.message
            : "Erro ao carregar a collection.";
        const extra = [anyErr?.code, anyErr?.details, anyErr?.hint]
          .filter((v) => typeof v === "string" && v.trim().length > 0)
          .join(" | ");
        throw new Error(extra ? `${message} (${extra})` : message);
      }

      const rows = (res.data ?? []) as any[];

      const mappedPontos: PlayerPonto[] = isAllMode
        ? (rows
            .map((row) => {
              if (!row || typeof row !== "object") return null;

              const title =
                (typeof row.title === "string" && row.title.trim()) || "Ponto";
              const lyrics =
                (typeof row.lyrics === "string" && row.lyrics) || "";

              const mapped: PlayerPonto = {
                id: String(row.id ?? ""),
                title,
                artist: typeof row.artist === "string" ? row.artist : null,
                duration_seconds:
                  typeof row.duration_seconds === "number"
                    ? row.duration_seconds
                    : null,
                audio_url:
                  typeof row.audio_url === "string" ? row.audio_url : null,
                cover_url:
                  typeof row.cover_url === "string" ? row.cover_url : null,
                lyrics,
                tags: coerceTags(row.tags),
              };

              if (!mapped.id) return null;
              return mapped;
            })
            .filter(Boolean) as PlayerPonto[])
        : [];

      const next: CollectionPlayerItem[] = isAllMode
        ? mappedPontos
            .filter((p) => matchesQuery(p, query))
            .map((p, idx) => ({ position: idx + 1, ponto: p }))
        : (rows
            .map((row) => {
              const ponto = row?.pontos;
              if (!ponto || typeof ponto !== "object") return null;

              const title =
                (typeof ponto.title === "string" && ponto.title.trim()) ||
                "Ponto";
              const lyrics =
                (typeof ponto.lyrics === "string" && ponto.lyrics) || "";

              const mapped: PlayerPonto = {
                id: String(ponto.id ?? ""),
                title,
                artist: typeof ponto.artist === "string" ? ponto.artist : null,
                duration_seconds:
                  typeof ponto.duration_seconds === "number"
                    ? ponto.duration_seconds
                    : null,
                audio_url:
                  typeof ponto.audio_url === "string" ? ponto.audio_url : null,
                cover_url:
                  typeof ponto.cover_url === "string" ? ponto.cover_url : null,
                lyrics,
                tags: coerceTags(ponto.tags),
              };

              const position =
                typeof row.position === "number"
                  ? row.position
                  : Number(row.position);

              if (!mapped.id) return null;
              if (!Number.isFinite(position)) return null;

              return { position, ponto: mapped };
            })
            .filter(Boolean) as CollectionPlayerItem[]);

      setItems(next);
    } catch (e) {
      if (__DEV__) {
        console.info("[Player] erro ao carregar collection", {
          collectionId,
          error: getErrorMessage(e),
          raw: e,
        });
      }

      setItems([]);
      setError(getErrorMessage(e) || "Erro ao carregar a collection.");
    } finally {
      setIsLoading(false);
    }
  }, [collectionId, enabled, isAllMode, query]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    items,
    isLoading,
    error,
    isEmpty,
    reload: load,
  };
}
