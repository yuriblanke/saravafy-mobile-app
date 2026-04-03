import { supabase } from "@/lib/supabase";
import { parseEntidadeChipFieldsFromPontoRow } from "@/src/domain/entidade";
import { PONTOS_ENTIDADE_ORIXA_EMBED } from "@/src/queries/pontoEntidadeSelect";

export type PontosSearchResult = {
  id: string;
  title: string;
  tags: string[];
  lyrics: string;
  lyrics_preview_6: string | null;
  score: number | null;
  entidadeNome: string | null;
  orixaNome: string | null;
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
        : "Erro ao buscar pontos.",
    );
  }

  const rows = Array.isArray(data) ? (data as any[]) : [];
  const base = rows
    .map((r) => {
      const tags = Array.isArray(r.tags)
        ? r.tags.filter((t: unknown) => typeof t === "string")
        : [];
      // search_pontos RPC returns lyrics_preview_6 (not lyrics)
      const lyrics_preview_6 =
        r.lyrics_preview_6 == null ? null : String(r.lyrics_preview_6);
      return {
        id: String(r.id ?? ""),
        title: String(r.title ?? ""),
        tags,
        lyrics: String(r.lyrics_preview_6 ?? r.lyrics ?? ""),
        lyrics_preview_6,
        score: typeof r.score === "number" ? r.score : null,
        entidadeNome: null as string | null,
        orixaNome: null as string | null,
      } satisfies PontosSearchResult;
    })
    .filter((r) => Boolean(r.id));

  return enrichPontosSearchWithEntidades(base);
}

async function enrichPontosSearchWithEntidades(
  results: PontosSearchResult[],
): Promise<PontosSearchResult[]> {
  const ids = results.map((r) => r.id).filter(Boolean);
  if (ids.length === 0) return results;

  const { data, error } = await supabase
    .from("pontos")
    .select(`id, ${PONTOS_ENTIDADE_ORIXA_EMBED}`)
    .in("id", ids);

  if (error || !Array.isArray(data)) return results;

  const byId = new Map<
    string,
    { entidadeNome: string | null; orixaNome: string | null }
  >();
  for (const row of data as any[]) {
    const chip = parseEntidadeChipFieldsFromPontoRow(row);
    byId.set(String(row.id ?? ""), {
      entidadeNome: chip.entidadeNome,
      orixaNome: chip.orixaNome,
    });
  }

  return results.map((r) => {
    const extra = byId.get(r.id);
    return {
      ...r,
      entidadeNome: extra?.entidadeNome ?? null,
      orixaNome: extra?.orixaNome ?? null,
    };
  });
}
