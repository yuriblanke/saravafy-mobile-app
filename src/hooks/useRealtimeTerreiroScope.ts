import { supabase } from "@/lib/supabase";
import { useEffect, useMemo } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/src/queries/queryKeys";

type RealtimeParams = {
  scopeTerreiroId: string | null;
  myTerreiroIds: readonly string[];
  myUserId: string | null;
};

function getTerreiroIdFromPayload(payload: any): string | null {
  const terreiroIdNew =
    payload?.new && typeof payload.new.terreiro_id === "string"
      ? payload.new.terreiro_id
      : null;
  if (terreiroIdNew) return terreiroIdNew;

  const terreiroIdOld =
    payload?.old && typeof payload.old.terreiro_id === "string"
      ? payload.old.terreiro_id
      : null;
  return terreiroIdOld;
}

function getCollectionOwnerTerreiroId(payload: any): string | null {
  const next =
    payload?.new && typeof payload.new.owner_terreiro_id === "string"
      ? payload.new.owner_terreiro_id
      : null;
  if (next) return next;

  const prev =
    payload?.old && typeof payload.old.owner_terreiro_id === "string"
      ? payload.old.owner_terreiro_id
      : null;
  return prev;
}

function getCollectionOwnerUserId(payload: any): string | null {
  const next =
    payload?.new && typeof payload.new.owner_user_id === "string"
      ? payload.new.owner_user_id
      : null;
  if (next) return next;

  const prev =
    payload?.old && typeof payload.old.owner_user_id === "string"
      ? payload.old.owner_user_id
      : null;
  return prev;
}

function getCollectionsPontosCollectionId(payload: any): string | null {
  const next =
    payload?.new && typeof payload.new.collection_id === "string"
      ? payload.new.collection_id
      : null;
  if (next) return next;

  const prev =
    payload?.old && typeof payload.old.collection_id === "string"
      ? payload.old.collection_id
      : null;
  return prev;
}

export function useRealtimeTerreiroScope(params: RealtimeParams) {
  const queryClient = useQueryClient();

  const { scopeTerreiroId, myTerreiroIds, myUserId } = params;

  const myTerreiroSet = useMemo(
    () => new Set((myTerreiroIds ?? []).filter(Boolean)),
    [myTerreiroIds]
  );

  useEffect(() => {
    if (!scopeTerreiroId) return;

    const channelPontos = supabase
      .channel(`rt:pontos:${scopeTerreiroId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pontos" },
        (payload) => {
          const ownerTerreiroId =
            payload?.new &&
            typeof (payload as any)?.new?.owner_terreiro_id === "string"
              ? (payload as any).new.owner_terreiro_id
              : null;

          if (ownerTerreiroId !== scopeTerreiroId) return;

          queryClient.invalidateQueries({
            queryKey: queryKeys.pontos.terreiro(scopeTerreiroId),
          });
        }
      );

    const channelCollections = supabase
      .channel(`rt:collections:${scopeTerreiroId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collections" },
        (payload) => {
          const ownerTerreiroId = getCollectionOwnerTerreiroId(payload);
          const ownerUserId = getCollectionOwnerUserId(payload);

          const isInScope =
            ownerTerreiroId === scopeTerreiroId ||
            (!!myUserId && ownerUserId === myUserId);

          if (!isInScope) return;

          if (ownerTerreiroId === scopeTerreiroId) {
            // Biblioteca do terreiro (cards + contagem)
            queryClient.invalidateQueries({
              queryKey:
                queryKeys.terreiros.collectionsByTerreiro(scopeTerreiroId),
            });

            // Mantém compatibilidade com listas legadas ainda usadas em algumas telas.
            queryClient.invalidateQueries({
              queryKey: queryKeys.collections.terreiro(scopeTerreiroId),
            });
          }

          if (myUserId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.collections.accountable(myUserId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.collections.editableByUserPrefix(myUserId),
            });

            // Compat (legado)
            queryClient.invalidateQueries({
              queryKey: queryKeys.collections.available({
                userId: myUserId,
                terreiroId: scopeTerreiroId,
              }),
            });
          }
        }
      );

    const channelCollectionsPontos = supabase
      .channel(`rt:collections_pontos:${scopeTerreiroId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collections_pontos" },
        (payload) => {
          const collectionId = getCollectionsPontosCollectionId(payload);

          if (collectionId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.collections.byId(collectionId),
            });

            // Pontos ordenados da coleção (player/Collection screen)
            queryClient.invalidateQueries({
              queryKey: queryKeys.collections.pontos(collectionId),
            });
          }

          // Sem owner direto no join: invalida biblioteca do terreiro atual (contadores).
          queryClient.invalidateQueries({
            queryKey:
              queryKeys.terreiros.collectionsByTerreiro(scopeTerreiroId),
          });

          // Compat (legado)
          queryClient.invalidateQueries({
            queryKey: queryKeys.collections.terreiro(scopeTerreiroId),
          });

          if (myUserId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.collections.accountable(myUserId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.collections.editableByUserPrefix(myUserId),
            });

            // Compat (legado)
            queryClient.invalidateQueries({
              queryKey: queryKeys.collections.available({
                userId: myUserId,
                terreiroId: scopeTerreiroId,
              }),
            });
          }
        }
      );

    const channelTerreiroMembers = supabase
      .channel(`rt:terreiro_members:${scopeTerreiroId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "terreiro_members" },
        (payload) => {
          const terreiroId = getTerreiroIdFromPayload(payload);
          if (!terreiroId) return;

          // Reage apenas ao escopo dos terreiros do usuário.
          if (!myTerreiroSet.has(terreiroId)) return;

          if (!myUserId) return;

          queryClient.invalidateQueries({
            queryKey: queryKeys.me.membership(myUserId),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.me.terreiros(myUserId),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.me.permissions(myUserId),
          });
        }
      );

    channelPontos.subscribe();
    channelCollections.subscribe();
    channelCollectionsPontos.subscribe();
    channelTerreiroMembers.subscribe();

    return () => {
      supabase.removeChannel(channelPontos);
      supabase.removeChannel(channelCollections);
      supabase.removeChannel(channelCollectionsPontos);
      supabase.removeChannel(channelTerreiroMembers);
    };
  }, [myTerreiroSet, myUserId, queryClient, scopeTerreiroId]);
}
