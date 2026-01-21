import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { queryKeys } from "./queryKeys";

type MemberChangeRow = {
  terreiro_id?: unknown;
  role?: unknown;
  status?: unknown;
};

function normalizeRole(value: unknown) {
  if (value === "admin" || value === "curimba" || value === "member") {
    return value;
  }
  return null;
}

function isActiveStatus(value: unknown) {
  // When the schema doesn't have `status`, we treat it as active.
  if (value == null) return true;
  return value === "active";
}

export function usePreferencesTerreirosRealtime(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const key = queryKeys.preferences.terreiros(userId);
    const membershipKey = queryKeys.me.membership(userId);
    const channel = supabase.channel(`preferences-terreiros:${userId}`);

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: membershipKey });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.editableTerreiros(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.permissions(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.terreiros.withRole(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.terreiros.editableByUser(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.editableByUserPrefix(userId),
      });
    };

    const setMembershipRole = (terreiroId: string, role: string | null) => {
      queryClient.setQueryData(membershipKey, (prev: any) => {
        const arr = Array.isArray(prev) ? prev : [];
        const next = [...arr];
        const idx = next.findIndex(
          (r: any) => String(r?.terreiro_id ?? "") === terreiroId
        );

        if (!role) {
          if (idx >= 0) next.splice(idx, 1);
          return next;
        }

        if (idx >= 0) {
          next[idx] = { ...next[idx], role };
          return next;
        }

        next.push({ terreiro_id: terreiroId, role });
        return next;
      });
    };

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "terreiro_members",
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => {
        const eventType = String(payload?.eventType ?? payload?.event ?? "");
        const nextRow = (payload?.new ?? null) as MemberChangeRow | null;
        const oldRow = (payload?.old ?? null) as MemberChangeRow | null;

        const terreiroIdRaw = (nextRow?.terreiro_id ??
          oldRow?.terreiro_id) as unknown;
        const terreiroId =
          typeof terreiroIdRaw === "string" ? terreiroIdRaw : "";
        if (!terreiroId) {
          invalidate();
          return;
        }

        if (eventType === "DELETE") {
          queryClient.setQueryData(key, (prev: any) => {
            const arr = Array.isArray(prev) ? prev : [];
            return arr.filter((t: any) => String(t?.id ?? "") !== terreiroId);
          });

          setMembershipRole(terreiroId, null);
          invalidate();
          return;
        }

        const role = normalizeRole(nextRow?.role);
        const active = isActiveStatus(nextRow?.status);

        // If role/status no longer qualifies for Preferences list, remove.
        if (!role || !active) {
          queryClient.setQueryData(key, (prev: any) => {
            const arr = Array.isArray(prev) ? prev : [];
            return arr.filter((t: any) => String(t?.id ?? "") !== terreiroId);
          });

          setMembershipRole(terreiroId, null);
          invalidate();
          return;
        }

        // Otherwise, upsert a minimal placeholder immediately and let the refetch fill title/cover.
        queryClient.setQueryData(key, (prev: any) => {
          const arr = Array.isArray(prev) ? prev : [];
          const idx = arr.findIndex(
            (t: any) => String(t?.id ?? "") === terreiroId
          );
          const next = [...arr];
          if (idx >= 0) {
            next[idx] = {
              ...next[idx],
              role,
            };
          } else {
            next.push({
              id: terreiroId,
              title: "Terreiro",
              cover_image_url: null,
              role,
            });
          }

          next.sort((a: any, b: any) =>
            String(a?.title ?? "").localeCompare(
              String(b?.title ?? ""),
              "pt-BR",
              {
                sensitivity: "base",
              }
            )
          );
          return next;
        });

        // Keep the shared membership cache in sync so permission-gated UI updates instantly.
        setMembershipRole(terreiroId, role);

        invalidate();
      }
    );

    channel.subscribe((status) => {
      if (__DEV__) {
        void status;
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
}
