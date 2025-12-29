import { supabase } from "@/lib/supabase";
import { useEffect, useMemo } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/src/queries/queryKeys";

type RealtimeParams = {
  activeTerreiroId: string | null;
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

  const { activeTerreiroId, myTerreiroIds, myUserId } = params;

  const myTerreiroSet = useMemo(
    () => new Set((myTerreiroIds ?? []).filter(Boolean)),
    [myTerreiroIds]
  );

  useEffect(() => {
    if (!activeTerreiroId) return;

    const channelPontos = supabase
      .channel(`rt:pontos:${activeTerreiroId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pontos" },
        (payload) => {
          const ownerTerreiroId =
            payload?.new &&
            typeof (payload as any)?.new?.owner_terreiro_id === "string"
              ? (payload as any).new.owner_terreiro_id
              : null;

          if (ownerTerreiroId !== activeTerreiroId) return;

          queryClient.invalidateQueries({
            queryKey: queryKeys.pontos.terreiro(activeTerreiroId),
          });
        }
      );

    const channelCollections = supabase
      .channel(`rt:collections:${activeTerreiroId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collections" },
        (payload) => {
          const ownerTerreiroId = getCollectionOwnerTerreiroId(payload);
          const ownerUserId = getCollectionOwnerUserId(payload);

          const isInScope =
            ownerTerreiroId === activeTerreiroId ||
            (!!myUserId && ownerUserId === myUserId);

          if (!isInScope) return;

          if (ownerTerreiroId === activeTerreiroId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.collections.terreiro(activeTerreiroId),
            });
          }

          if (myUserId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.collections.available({
                userId: myUserId,
                terreiroId: activeTerreiroId,
              }),
            });
          }
        }
      );

    const channelCollectionsPontos = supabase
      .channel(`rt:collections_pontos:${activeTerreiroId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collections_pontos" },
        (payload) => {
          const collectionId = getCollectionsPontosCollectionId(payload);

          if (collectionId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.collections.byId(collectionId),
            });
          }

          // Sem owner direto: invalida listas do terreiro atual.
          queryClient.invalidateQueries({
            queryKey: queryKeys.collections.terreiro(activeTerreiroId),
          });

          if (myUserId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.collections.available({
                userId: myUserId,
                terreiroId: activeTerreiroId,
              }),
            });
          }
        }
      );

    const channelTerreiroMembers = supabase
      .channel(`rt:terreiro_members:${activeTerreiroId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "terreiro_members" },
        (payload) => {
          const terreiroId = getTerreiroIdFromPayload(payload);
          if (!terreiroId) return;

          // Reage apenas ao escopo dos terreiros do usuário.
          if (!myTerreiroSet.has(terreiroId)) return;

          queryClient.invalidateQueries({
            queryKey: queryKeys.me.membership(),
          });
          queryClient.invalidateQueries({ queryKey: queryKeys.me.terreiros() });
          queryClient.invalidateQueries({
            queryKey: queryKeys.me.permissions(),
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
  }, [activeTerreiroId, myTerreiroSet, myUserId, queryClient]);
}
