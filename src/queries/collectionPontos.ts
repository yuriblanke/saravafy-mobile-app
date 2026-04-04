import { supabase } from "@/lib/supabase";
import {
    useQuery,
    type QueryKey,
    type UseQueryOptions,
} from "@tanstack/react-query";

import {
    buildEntidadeComOrixaFromEmbed,
    parseEntidadeChipFieldsFromPontoRow,
    resolveEntidadeLabel,
} from "@/src/domain/entidade";
import { resolveLyricsWithCollectionEntidade } from "@/src/domain/entidadePlaceholder";
import {
    COLLECTIONS_PONTOS_ENTIDADE_EMBED,
    PONTOS_ENTIDADE_ORIXA_EMBED,
} from "@/src/queries/pontoEntidadeSelect";
import { fetchActivePontoVersoesByPontoIds } from "@/src/queries/pontoVersoes";
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
  collectionId: string,
): Promise<CollectionPlayerItem[]> {
  if (!collectionId) {
    throw new Error("Collection inválida.");
  }

  const res = await supabase
    .from("collections_pontos")
    .select(
      `position, ponto_versao_id, entidade_id, entidade_texto, entidade_orixa_id, ${COLLECTIONS_PONTOS_ENTIDADE_EMBED}, pontos:ponto_id (id, title, tags, author_name, is_public_domain, ${PONTOS_ENTIDADE_ORIXA_EMBED})`,
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

  type DraftCpRow = {
    position: number;
    ponto: PlayerPonto;
    pontoVersaoId: string | null;
    entidadeTexto: string | null;
    entidadeLabelFromId: string | null;
  };

  const draftItems: (DraftCpRow | null)[] = rows.map((row) => {
    const ponto = row?.pontos;
    if (!ponto || typeof ponto !== "object") return null;

    const title =
      (typeof ponto.title === "string" && ponto.title.trim()) || "Ponto";

    const chip = parseEntidadeChipFieldsFromPontoRow(ponto);

    const entEmbed = (row as any)?.entidades;
    const entRow = Array.isArray(entEmbed) ? entEmbed[0] : entEmbed;
    let entidadeLabelFromId: string | null = null;
    if (entRow && typeof entRow === "object") {
      const ent = buildEntidadeComOrixaFromEmbed(
        entRow as Record<string, unknown>,
      );
      if (ent) {
        const lab = resolveEntidadeLabel(ent).trim();
        entidadeLabelFromId = lab || null;
      }
    }

    const pontoVersaoIdRaw = (row as any)?.ponto_versao_id;
    const pontoVersaoId =
      typeof pontoVersaoIdRaw === "string" && pontoVersaoIdRaw.trim()
        ? pontoVersaoIdRaw.trim()
        : null;
    const entidadeTexto =
      typeof (row as any)?.entidade_texto === "string"
        ? (row as any).entidade_texto
        : null;

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
      duration_seconds: null,
      cover_url: null,
      lyrics: "",
      lyrics_preview_6: null,
      tags: coerceTags(ponto.tags),
      entidade_id: chip.entidade_id,
      entidadeNome: chip.entidadeNome,
      orixaNome: chip.orixaNome,
      versoes: [],
      collectionPinnedVersaoId: pontoVersaoId,
      collectionEntidadeResolve: {
        entidadeTexto,
        entidadeLabelFromId,
      },
    };

    const position =
      typeof row.position === "number" ? row.position : Number(row.position);

    if (!mapped.id) return null;
    if (!Number.isFinite(position)) return null;

    return {
      position,
      ponto: mapped,
      pontoVersaoId,
      entidadeTexto,
      entidadeLabelFromId,
    };
  });

  const pontoIds = draftItems
    .filter(Boolean)
    .map((it) => it!.ponto.id)
    .filter(Boolean);
  const versoesMap = await fetchActivePontoVersoesByPontoIds(pontoIds);

  const next: CollectionPlayerItem[] = draftItems
    .filter((it): it is DraftCpRow => it != null)
    .map((draft) => {
      const versoes = versoesMap.get(draft.ponto.id) ?? [];
      const pinned = draft.pontoVersaoId
        ? versoes.find((v) => v.id === draft.pontoVersaoId)
        : null;
      const canonical =
        versoes.find((v) => v.is_canonical) ?? versoes[0] ?? null;
      const versao = pinned ?? canonical;
      const rawLyrics = versao?.lyrics ?? "";
      const rawPreview6 =
        typeof versao?.lyrics_preview_6 === "string"
          ? versao.lyrics_preview_6
          : null;

      const lyrics = resolveLyricsWithCollectionEntidade({
        rawLyrics,
        entidadeTexto: draft.entidadeTexto,
        entidadeLabelFromId: draft.entidadeLabelFromId,
      });
      const lyrics_preview_6 = rawPreview6
        ? resolveLyricsWithCollectionEntidade({
            rawLyrics: rawPreview6,
            entidadeTexto: draft.entidadeTexto,
            entidadeLabelFromId: draft.entidadeLabelFromId,
          })
        : null;

      return {
        position: draft.position,
        ponto: {
          ...draft.ponto,
          lyrics,
          lyrics_preview_6,
          versoes,
        },
      };
    });

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
  options?: { enabled?: boolean },
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
