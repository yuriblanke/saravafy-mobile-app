import type { QueryClient } from "@tanstack/react-query";

import { patchQueriesByPrefix } from "./mutationUtils";
import { queryKeys } from "./queryKeys";

import type {
  CollectionPlayerItem,
  PlayerPonto,
} from "@/src/screens/Player/hooks/useCollectionPlayerData";
import type { TerreiroCollectionCard } from "./terreirosCollections";

function clampNonNegative(n: number): number {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function getNextPosition(items: readonly CollectionPlayerItem[]): number {
  let max = 0;
  for (const it of items) {
    const pos =
      typeof it?.position === "number" ? it.position : Number(it?.position);
    if (Number.isFinite(pos) && pos > max) max = pos;
  }
  return max + 1;
}

export function incrementCollectionPontosCountInTerreiroLists(
  queryClient: QueryClient,
  params: { collectionId: string; delta: number }
) {
  const { collectionId, delta } = params;
  if (!collectionId || !delta) return;

  patchQueriesByPrefix<TerreiroCollectionCard[]>(
    queryClient,
    ["terreiros", "collectionsByTerreiro"],
    (old) => {
      const list = Array.isArray(old) ? old : [];
      return list.map((c) => {
        if (String(c?.id ?? "") !== collectionId) return c;
        const current = typeof c.pontosCount === "number" ? c.pontosCount : 0;
        return {
          ...c,
          pontosCount: clampNonNegative(current + delta),
        };
      });
    }
  );
}

export function upsertPontoInCollectionPontosList(
  queryClient: QueryClient,
  params: {
    collectionId: string;
    ponto: PlayerPonto;
    position?: number;
  }
): { didInsert: boolean } {
  const { collectionId, ponto } = params;
  if (!collectionId || !ponto?.id) return { didInsert: false };

  const key = queryKeys.collections.pontos(collectionId);

  let didInsert = false;
  queryClient.setQueryData<CollectionPlayerItem[]>(key, (old) => {
    const list = Array.isArray(old) ? old : [];
    if (list.some((it) => String(it?.ponto?.id ?? "") === ponto.id)) {
      return list;
    }

    const position =
      typeof params.position === "number" && Number.isFinite(params.position)
        ? params.position
        : getNextPosition(list);

    didInsert = true;
    return [...list, { position, ponto }];
  });

  return { didInsert };
}

export function removePontoFromCollectionPontosList(
  queryClient: QueryClient,
  params: { collectionId: string; pontoId: string }
): { didRemove: boolean } {
  const { collectionId, pontoId } = params;
  if (!collectionId || !pontoId) return { didRemove: false };

  const key = queryKeys.collections.pontos(collectionId);

  let didRemove = false;
  queryClient.setQueryData<CollectionPlayerItem[]>(key, (old) => {
    const list = Array.isArray(old) ? old : [];
    const next = list.filter((it) => String(it?.ponto?.id ?? "") !== pontoId);
    didRemove = next.length !== list.length;

    // Reindexa posições para ficar estável para UI/player.
    return next.map((it, idx) => ({ ...it, position: idx + 1 }));
  });

  return { didRemove };
}

export function setCollectionPontosList(
  queryClient: QueryClient,
  params: { collectionId: string; items: CollectionPlayerItem[] }
) {
  const { collectionId, items } = params;
  if (!collectionId) return;

  const key = queryKeys.collections.pontos(collectionId);
  const list = Array.isArray(items) ? items : [];
  queryClient.setQueryData<CollectionPlayerItem[]>(key, list);
}
