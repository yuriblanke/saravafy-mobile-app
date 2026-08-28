import type { QueryClient } from "@tanstack/react-query";

import {
  incrementCollectionPontosCountInTerreiroLists,
  removePontoFromCollectionPontosList,
} from "@/src/queries/collectionsCache";
import { queryKeys } from "@/src/queries/queryKeys";

/**
 * Cache side-effect for the add-ponto mutation's `onSuccess` when the server
 * reports the ponto was already in the collection (`alreadyExists: true`).
 * That outcome is a *success*, not an error, so `onError`'s revert never
 * runs for it: the optimistic patch made in `onMutate`
 * (`upsertPontoInCollectionPontosList` + count increment) has to be undone
 * here instead, gated on `didInsert` exactly like `onError` does. Mirrors
 * AddToCollectionFlow.tsx's onSuccess (alreadyExists branch).
 */
export function revertOptimisticAddOnAlreadyExists(
  queryClient: QueryClient,
  params: { collectionId: string; pontoId: string; didInsert: boolean },
): void {
  const { collectionId, pontoId, didInsert } = params;
  if (!didInsert) return;

  removePontoFromCollectionPontosList(queryClient, { collectionId, pontoId });
  incrementCollectionPontosCountInTerreiroLists(queryClient, {
    collectionId,
    delta: -1,
  });
}

/**
 * `onSettled` invalidation for the add-ponto mutation. Includes
 * `terreiros.collectionsByTerreiroPrefix()`, the key that
 * `incrementCollectionPontosCountInTerreiroLists` (called from `onMutate`
 * and, on revert, from `onError`) actually patches.
 */
export function invalidateAddToCollectionQueries(
  queryClient: QueryClient,
  collectionId: string,
): void {
  queryClient.invalidateQueries({
    queryKey: queryKeys.collections.pontos(collectionId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.collections.byId(collectionId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.terreiros.collectionsByTerreiroPrefix(),
  });
}
