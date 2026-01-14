import { supabase } from "@/lib/supabase";

export type PontosSearchResult = {
  id: string;
  title: string;
  tags: string[];
  lyrics: string;
  lyrics_preview_6: string | null;
  score: number | null;
};

export const PONTOS_SEARCH_MIN_CHARS = 4;
export const PONTOS_SEARCH_DEBOUNCE_MS = 300;
export const PONTOS_SEARCH_DEFAULT_LIMIT = 20;
export const PONTOS_SEARCH_DEFAULT_OFFSET = 0;

export function normalizePontosSearchQueryGate(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

export async function searchPontos({
  query,
  limit = PONTOS_SEARCH_DEFAULT_LIMIT,
  offset = PONTOS_SEARCH_DEFAULT_OFFSET,
}: {
  query: string;
  limit?: number;
  offset?: number;
}): Promise<PontosSearchResult[]> {
  const { data, error } = await supabase.rpc("search_pontos", {
    p_query: query,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    throw new Error(
      typeof error.message === "string" && error.message.trim()
        ? error.message
        : "Erro ao buscar pontos."
    );
  }

  const rows = Array.isArray(data) ? (data as any[]) : [];
  return rows
    .map((r) => {
      const tags = Array.isArray(r.tags)
        ? r.tags.filter((t: unknown) => typeof t === "string")
        : [];
      return {
        id: String(r.id ?? ""),
        title: String(r.title ?? ""),
        tags,
        lyrics: String(r.lyrics ?? ""),
        lyrics_preview_6:
          r.lyrics_preview_6 == null ? null : String(r.lyrics_preview_6),
        score: typeof r.score === "number" ? r.score : null,
      } satisfies PontosSearchResult;
    })
    .filter((r) => Boolean(r.id));
}
