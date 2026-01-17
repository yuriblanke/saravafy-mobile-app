import { supabase } from "@/lib/supabase";
import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { queryKeys } from "@/src/queries/queryKeys";
import {
  type CollectionPlayerItem,
  type PlayerPonto,
} from "@/src/screens/Player/hooks/useCollectionPlayerData";

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

export async function fetchCollectionPontosItems(
  collectionId: string
): Promise<CollectionPlayerItem[]> {
  if (!collectionId) {
    throw new Error("Collection inválida.");
  }

  const res = await supabase
    .from("collections_pontos")
    .select(
      "position, pontos:ponto_id (id, title, lyrics, lyrics_preview_6, tags, duration_seconds, audio_url, cover_url, author_name, is_public_domain)"
    )
    .eq("collection_id", collectionId)
    .order("position", { ascending: true });

  if (res.error) {
    const anyErr = res.error as any;
    const message =
      typeof anyErr?.message === "string" && anyErr.message.trim()
        ? anyErr.message
        : "Erro ao carregar a coleção.";
    const extra = [anyErr?.code, anyErr?.details, anyErr?.hint]
      .filter((v) => typeof v === "string" && v.trim().length > 0)
      .join(" | ");
    throw new Error(extra ? `${message} (${extra})` : message);
  }

  const rows = (res.data ?? []) as any[];

  const next: CollectionPlayerItem[] = rows
    .map((row) => {
      const ponto = row?.pontos;
      if (!ponto || typeof ponto !== "object") return null;

      const title =
        (typeof ponto.title === "string" && ponto.title.trim()) || "Ponto";
      const lyrics = (typeof ponto.lyrics === "string" && ponto.lyrics) || "";

      const mapped: PlayerPonto = {
        id: String(ponto.id ?? ""),
        title,
        artist: null,
        author_name:
          typeof (ponto as any).author_name === "string"
            ? (ponto as any).author_name
            : null,
        is_public_domain:
          typeof (ponto as any).is_public_domain === "boolean"
            ? (ponto as any).is_public_domain
            : null,
        duration_seconds:
          typeof ponto.duration_seconds === "number"
            ? ponto.duration_seconds
            : null,
        audio_url:
          typeof (ponto as any).audio_url === "string"
            ? (ponto as any).audio_url
            : null,
        cover_url: typeof ponto.cover_url === "string" ? ponto.cover_url : null,
        lyrics,
        lyrics_preview_6:
          typeof (ponto as any).lyrics_preview_6 === "string"
            ? (ponto as any).lyrics_preview_6
            : null,
        tags: coerceTags(ponto.tags),
      };

      const position =
        typeof row.position === "number" ? row.position : Number(row.position);

      if (!mapped.id) return null;
      if (!Number.isFinite(position)) return null;

      return { position, ponto: mapped };
    })
    .filter(Boolean) as CollectionPlayerItem[];

  return next;
}

export function getCollectionPontosQueryOptions(collectionId: string) {
  return {
    queryKey: queryKeys.collections.pontos(collectionId) as unknown as QueryKey,
    queryFn: () => fetchCollectionPontosItems(collectionId),

    // Favor reabertura com cache + refetch em background quando ficar stale.
    staleTime: 3 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
  } satisfies UseQueryOptions<
    CollectionPlayerItem[],
    Error,
    CollectionPlayerItem[],
    QueryKey
  >;
}

export function useCollectionPontosQuery(
  collectionId: string,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;

  const query = useQuery({
    ...getCollectionPontosQueryOptions(collectionId),
    enabled: enabled && !!collectionId,
    select: (data) => data,
  });

  const errorMessage = query.error ? getErrorMessage(query.error) : null;

  return {
    ...query,
    errorMessage,
  };
}
