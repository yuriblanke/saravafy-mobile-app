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
  if (value === "admin" || value === "editor" || value === "member") {
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
    const channel = supabase.channel(`preferences-terreiros:${userId}`);

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.editableTerreiros(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.permissions(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.terreiros.withRole(userId),
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
