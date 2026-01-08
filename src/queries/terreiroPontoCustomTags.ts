import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";

type TerreiroPontoCustomTagRow = {
  id: string;
  terreiro_id: string;
  ponto_id: string;
  tag_text: string;
  tag_text_normalized: string;
  created_at: string;
  source?: string | null;
  template_key?: string | null;
};

function hashIds(ids: readonly string[]): string {
  const sorted = Array.from(new Set(ids.filter(Boolean))).sort();
  const input = sorted.join(",");

  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
}

export type TerreiroPontoMediumTag = {
  id: string;
  tagText: string;
  tagTextNormalized: string;
  createdAt: string;
};

export type TerreiroPontosCustomTagsMap = Record<
  string,
  TerreiroPontoMediumTag[]
>;

export async function fetchTerreiroPontosCustomTagsMap(params: {
  terreiroId: string;
  pontoIds: readonly string[];
}): Promise<TerreiroPontosCustomTagsMap> {
  const { terreiroId, pontoIds } = params;
  if (!terreiroId) return {};

  const ids = Array.from(new Set(pontoIds.filter(Boolean)));
  if (ids.length === 0) return {};

  const res = await supabase
    .from("terreiro_ponto_custom_tags")
    .select(
      "id, terreiro_id, ponto_id, source, template_key, tag_text, tag_text_normalized, created_at"
    )
    .eq("terreiro_id", terreiroId)
    .in("ponto_id", ids)
    .eq("source", "medium")
    .eq("template_key", "medium")
    .order("ponto_id", { ascending: true })
    .order("created_at", { ascending: true });

  if (res.error) {
    throw new Error(
      typeof res.error.message === "string" && res.error.message.trim()
        ? res.error.message
        : "Erro ao carregar tags custom."
    );
  }

  const rows = (res.data ?? []) as Partial<TerreiroPontoCustomTagRow>[];
  const map: TerreiroPontosCustomTagsMap = {};

  for (const r of rows) {
    const id = typeof r.id === "string" ? r.id : "";
    const pontoId = typeof r.ponto_id === "string" ? r.ponto_id : "";
    const tagText = typeof r.tag_text === "string" ? r.tag_text : "";
    const tagTextNormalized =
      typeof r.tag_text_normalized === "string" ? r.tag_text_normalized : "";
    const createdAt = typeof r.created_at === "string" ? r.created_at : "";
    if (!id || !pontoId || !tagText || !tagTextNormalized) continue;

    if (!map[pontoId]) map[pontoId] = [];
    map[pontoId].push({ id, tagText, tagTextNormalized, createdAt });
  }

  return map;
}

export function useTerreiroPontosCustomTagsMap(
  params: { terreiroId: string; pontoIds: readonly string[] },
  options?: { enabled?: boolean }
) {
  const terreiroId = params.terreiroId;
  const idsHash = hashIds(params.pontoIds);
  const enabled =
    (options?.enabled ?? true) && !!terreiroId && idsHash.length > 0;

  return useQuery({
    queryKey: enabled
      ? queryKeys.pontos.customTagsByTerreiro({
          terreiroId,
          pontoIdsHash: idsHash,
        })
      : [],
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: () =>
      fetchTerreiroPontosCustomTagsMap({
        terreiroId,
        pontoIds: params.pontoIds,
      }),
    placeholderData: (prev) => prev,
  });
}
