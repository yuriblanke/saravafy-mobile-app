import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { prefetchMyTerreiroAccessIds } from "@/src/queries/me";
import { queryKeys } from "@/src/queries/queryKeys";
import {
  invalidateTerreiro,
  invalidateTerreiroListsForRoles,
} from "@/src/queries/terreirosCache";
import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useRef } from "react";

type PgChangePayload = {
  eventType?: string;
  schema?: string;
  table?: string;
  new?: any;
  old?: any;
};

function getTerreiroIdFromPayload(payload: PgChangePayload): string | null {
  const anyNew = payload?.new as any;
  const anyOld = payload?.old as any;

  const candidates = [
    anyNew?.id,
    anyNew?.terreiro_id,
    anyOld?.id,
    anyOld?.terreiro_id,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }

  return null;
}

export function TerreirosRealtimeSync() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const userIdRef = useRef<string | null>(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const channelName = useMemo(
    () => (userId ? `terreiros-sync:${userId}` : null),
    [userId]
  );

  useEffect(() => {
    if (!userId) return;

    // Warm up membership cache so we can filter events without refetch spam.
    prefetchMyTerreiroAccessIds(queryClient, userId).catch(() => undefined);

    const channel = supabase
      .channel(channelName ?? "terreiros-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "terreiros" },
        (payload: any) => {
          const p = payload as PgChangePayload;
          const terreiroId = getTerreiroIdFromPayload(p);
          if (!terreiroId) return;

          const currentUserId = userIdRef.current;
          if (!currentUserId) return;

          void (async () => {
            const createdBy =
              typeof (p.new as any)?.created_by === "string"
                ? (p.new as any).created_by
                : null;

            // Always update for the creator (covers INSERT immediately).
            if (createdBy && createdBy === currentUserId) {
              invalidateTerreiro(queryClient, terreiroId);
              invalidateTerreiroListsForRoles(queryClient, currentUserId);

              if (__DEV__) {
                console.log("[TerreirosRealtime] creator event", {
                  table: "terreiros",
                  eventType: p.eventType,
                  terreiroId,
                });
              }

              return;
            }

            const accessIds = (await prefetchMyTerreiroAccessIds(
              queryClient,
              currentUserId
            ).catch(() => [])) as string[];

            if (!accessIds.includes(terreiroId)) {
              if (__DEV__) {
                console.log("[TerreirosRealtime] ignored (no access)", {
                  table: "terreiros",
                  eventType: p.eventType,
                  terreiroId,
                });
              }
              return;
            }

            invalidateTerreiro(queryClient, terreiroId);
            invalidateTerreiroListsForRoles(queryClient, currentUserId);

            if (__DEV__) {
              console.log("[TerreirosRealtime] invalidated", {
                table: "terreiros",
                eventType: p.eventType,
                terreiroId,
              });
            }
          })();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "terreiros_contatos" },
        (payload: any) => {
          const p = payload as PgChangePayload;
          const terreiroId = getTerreiroIdFromPayload(p);
          if (!terreiroId) return;

          const currentUserId = userIdRef.current;
          if (!currentUserId) return;

          void (async () => {
            const accessIds = (await prefetchMyTerreiroAccessIds(
              queryClient,
              currentUserId
            ).catch(() => [])) as string[];

            if (!accessIds.includes(terreiroId)) {
              if (__DEV__) {
                console.log("[TerreirosRealtime] ignored (no access)", {
                  table: "terreiros_contatos",
                  eventType: p.eventType,
                  terreiroId,
                });
              }
              return;
            }

            invalidateTerreiro(queryClient, terreiroId);
            invalidateTerreiroListsForRoles(queryClient, currentUserId);

            if (__DEV__) {
              console.log("[TerreirosRealtime] invalidated", {
                table: "terreiros_contatos",
                eventType: p.eventType,
                terreiroId,
              });
            }
          })();
        }
      )
      .subscribe();

    if (__DEV__) {
      console.log("[TerreirosRealtime] subscribed", {
        channelName,
        userId,
      });
    }

    return () => {
      try {
        supabase.removeChannel(channel);
      } finally {
        queryClient.removeQueries({
          queryKey: userId ? queryKeys.terreiros.withRole(userId) : undefined,
        });
      }

      // NOTE: removeQueries above is best-effort; we mainly rely on logout cleanup.
    };
  }, [channelName, queryClient, userId]);

  return null;
}

export default TerreirosRealtimeSync;
