import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";

type TerreiroPontoCustomTagRow = {
  terreiro_id: string;
  ponto_id: string;
  tag_text: string;
  created_at: string;
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

export type TerreiroPontosCustomTagsMap = Record<string, string[]>;

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
    .select("terreiro_id, ponto_id, tag_text, created_at")
    .eq("terreiro_id", terreiroId)
    .in("ponto_id", ids)
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
    const pontoId = typeof r.ponto_id === "string" ? r.ponto_id : "";
    const tag = typeof r.tag_text === "string" ? r.tag_text : "";
    if (!pontoId || !tag) continue;

    if (!map[pontoId]) map[pontoId] = [];
    map[pontoId].push(tag);
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
