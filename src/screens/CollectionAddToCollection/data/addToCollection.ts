import { supabase } from "@/lib/supabase";
import { parseEntidadeChipFieldsFromPontoRow } from "@/src/domain/entidade";
import {
  fetchActivePontoVersoesByPontoIds,
} from "@/src/queries/pontoVersoes";
import { PONTOS_ENTIDADE_ORIXA_EMBED } from "@/src/queries/pontoEntidadeSelect";
import type { PlayerPonto } from "@/src/screens/Player/hooks/useCollectionPlayerData";

import { coerceStringArray } from "../addToCollectionModel";

export async function fetchCollectionTitleById(
  collectionId: string
): Promise<{ id: string; title: string | null }> {
  const res: any = await supabase
    .from("collections")
    .select("id, title")
    .eq("id", collectionId)
    .single();

  if (res.error) {
    throw new Error(
      typeof res.error.message === "string" && res.error.message.trim()
        ? res.error.message
        : "Erro ao carregar a coleção."
    );
  }

  return {
    id: String((res.data as any)?.id ?? ""),
    title:
      typeof (res.data as any)?.title === "string"
        ? (res.data as any).title
        : null,
  };
}

export async function fetchAllPublicPontosForBrowse(): Promise<PlayerPonto[]> {
  const res: any = await supabase
    .from("pontos")
    .select(
      `id, title, tags, author_name, is_public_domain, ${PONTOS_ENTIDADE_ORIXA_EMBED}, ponto_versoes!inner(lyrics, lyrics_preview_6)`
    )
    .eq("is_active", true)
    .eq("restricted", false)
    .eq("ponto_versoes.is_canonical", true)
    .order("title", { ascending: true });

  if (res.error) {
    const anyErr = res.error as any;
    const message =
      typeof anyErr?.message === "string" && anyErr.message.trim()
        ? anyErr.message
        : "Erro ao carregar pontos.";
    throw new Error(message);
  }

  const rows = (res.data ?? []) as any[];
  const draft: (PlayerPonto | null)[] = rows.map((row) => {
    const id = String(row?.id ?? "").trim();
    if (!id) return null;

    const title =
      (typeof row?.title === "string" && row.title.trim()) || "Ponto";

    const versoesJoin = Array.isArray(row?.ponto_versoes)
      ? row.ponto_versoes
      : row?.ponto_versoes
      ? [row.ponto_versoes]
      : [];
    const versao = versoesJoin[0];
    const lyrics = typeof versao?.lyrics === "string" ? versao.lyrics : "";

    const chip = parseEntidadeChipFieldsFromPontoRow(row);

    return {
      id,
      title,
      artist: null,
      author_name:
        typeof row?.author_name === "string" ? row.author_name : null,
      is_public_domain:
        typeof row?.is_public_domain === "boolean"
          ? row.is_public_domain
          : null,
      duration_seconds: null,
      cover_url: null,
      lyrics,
      lyrics_preview_6:
        typeof versao?.lyrics_preview_6 === "string"
          ? versao.lyrics_preview_6
          : null,
      tags: coerceStringArray(row?.tags),
      entidade_id: chip.entidade_id,
      entidadeNome: chip.entidadeNome,
      orixaNome: chip.orixaNome,
      versoes: [],
    } satisfies PlayerPonto;
  });

  const ids = draft
    .filter(Boolean)
    .map((p) => p!.id)
    .filter(Boolean);
  const versoesMap = await fetchActivePontoVersoesByPontoIds(ids);

  return draft
    .filter(Boolean)
    .map((p) => {
      const versoes = versoesMap.get(p!.id) ?? [];
      const canonical =
        versoes.find((v) => v.is_canonical) ?? versoes[0] ?? null;
      const lyrics = canonical?.lyrics ?? p!.lyrics;
      const lyrics_preview_6 =
        typeof canonical?.lyrics_preview_6 === "string"
          ? canonical.lyrics_preview_6
          : p!.lyrics_preview_6;

      return {
        ...p!,
        lyrics,
        lyrics_preview_6,
        versoes,
      };
    });
}
