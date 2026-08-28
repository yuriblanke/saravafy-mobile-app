import { QueryClient } from "@tanstack/react-query";

import {
  incrementCollectionPontosCountInTerreiroLists,
  upsertPontoInCollectionPontosList,
} from "@/src/queries/collectionsCache";
import { queryKeys } from "@/src/queries/queryKeys";
import type { TerreiroCollectionCard } from "@/src/queries/terreirosCollections";
import type {
  CollectionPlayerItem,
  PlayerPonto,
} from "@/src/screens/Player/hooks/useCollectionPlayerData";

import {
  invalidateAddToCollectionQueries,
  revertOptimisticAddOnAlreadyExists,
} from "./addToCollectionCache";

const collectionId = "c1";
const terreiroId = "t1";
const pontoId = "ponto-1";

const playerPonto: PlayerPonto = {
  id: pontoId,
  title: "Ponto de Exu",
  lyrics: "Linha 1\nLinha 2",
  tags: [],
  entidade_id: null,
  entidadeNome: null,
  orixaNome: null,
  versoes: [],
};

const terreiroCard: TerreiroCollectionCard = {
  id: collectionId,
  title: "Giras de Segunda",
  description: null,
  visibility: "terreiro",
  owner_terreiro_id: terreiroId,
  pontosCount: 5,
};

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}

/**
 * Mirrors exactly the optimistic patch AddToCollection.tsx's mutation makes
 * in `onMutate`: insert the ponto into the collection's pontos list and, if
 * that insert actually happened, bump the terreiro-list pontosCount by one.
 */
function applyOptimisticAdd(queryClient: QueryClient) {
  const { didInsert } = upsertPontoInCollectionPontosList(queryClient, {
    collectionId,
    ponto: playerPonto,
  });
  if (didInsert) {
    incrementCollectionPontosCountInTerreiroLists(queryClient, {
      collectionId,
      delta: 1,
    });
  }
  return { didInsert };
}

describe("addToCollectionCache", () => {
  const activeClients: QueryClient[] = [];

  afterEach(() => {
    while (activeClients.length) {
      activeClients.pop()!.clear();
    }
  });

  function trackedClient() {
    const c = makeClient();
    activeClients.push(c);
    return c;
  }

  describe("revertOptimisticAddOnAlreadyExists", () => {
    it("leaves collections.pontos and the terreiro pontosCount identical to before the optimistic add, when the server reports alreadyExists", () => {
      const queryClient = trackedClient();
      const pontosKey = queryKeys.collections.pontos(collectionId);
      const terreiroKey = queryKeys.terreiros.collectionsByTerreiro(terreiroId);

      queryClient.setQueryData<CollectionPlayerItem[]>(pontosKey, []);
      queryClient.setQueryData<TerreiroCollectionCard[]>(terreiroKey, [
        terreiroCard,
      ]);

      const { didInsert } = applyOptimisticAdd(queryClient);
      expect(didInsert).toBe(true);

      // Sanity: the optimistic patch actually happened (phantom row + +1).
      expect(queryClient.getQueryData<CollectionPlayerItem[]>(pontosKey)).toHaveLength(
        1,
      );
      expect(
        queryClient.getQueryData<TerreiroCollectionCard[]>(terreiroKey)?.[0]
          .pontosCount,
      ).toBe(6);

      revertOptimisticAddOnAlreadyExists(queryClient, {
        collectionId,
        pontoId,
        didInsert,
      });

      expect(queryClient.getQueryData<CollectionPlayerItem[]>(pontosKey)).toEqual(
        [],
      );
      expect(
        queryClient.getQueryData<TerreiroCollectionCard[]>(terreiroKey)?.[0]
          .pontosCount,
      ).toBe(5);
    });
  });

  describe("invalidateAddToCollectionQueries", () => {
    it("invalidates the terreiro-list key that the count patch touches, not just collections.pontos/byId", () => {
      const queryClient = trackedClient();
      const terreiroKey = queryKeys.terreiros.collectionsByTerreiro(terreiroId);
      queryClient.setQueryData<TerreiroCollectionCard[]>(terreiroKey, [
        terreiroCard,
      ]);

      invalidateAddToCollectionQueries(queryClient, collectionId);

      expect(queryClient.getQueryState(terreiroKey)?.isInvalidated).toBe(true);
    });
  });
});
