import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import {
  resolveProfiles,
  type PublicProfile,
} from "@/src/features/identity/resolveProfiles";
import { queryKeys } from "@/src/queries/queryKeys";
import { getErrorMessage as baseGetErrorMessage } from "@/src/utils/errors";

export type PendingRequestRow = {
  id: string;
  terreiro_id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected" | string;
  created_at?: string | null;
};

export type ProfileLite = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

function toProfileLiteMap(
  byId: Record<string, PublicProfile>
): Record<string, ProfileLite> {
  return byId as unknown as Record<string, ProfileLite>;
}

function toProfileLiteEmailMap(
  byEmailLower: Record<string, PublicProfile>
): Record<string, ProfileLite> {
  return byEmailLower as unknown as Record<string, ProfileLite>;
}

function getErrorMessage(e: unknown): string {
  const msg = baseGetErrorMessage(e);
  if (msg.toLowerCase().includes("cannot_remove_last_admin")) {
    return "Não é possível remover o último admin";
  }
  return msg;
}

export function usePendingTerreiroMembershipRequests(terreiroId: string) {
  const query = useQuery({
    queryKey: queryKeys.terreiro.membershipRequests(terreiroId || "__none__"),
    enabled: !!terreiroId,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      if (!terreiroId) {
        return {
          items: [] as PendingRequestRow[],
          profilesById: {} as Record<string, ProfileLite>,
        };
      }

      const res = await supabase
        .from("terreiro_membership_requests")
        .select("id, terreiro_id, user_id, status, created_at")
        .eq("terreiro_id", terreiroId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string"
            ? res.error.message
            : "Erro ao carregar pedidos."
        );
      }

      const rows = (res.data ?? []) as any[];
      const items: PendingRequestRow[] = rows
        .map((r) => {
          const id = typeof r?.id === "string" ? r.id : "";
          const tid = typeof r?.terreiro_id === "string" ? r.terreiro_id : "";
          const uid = typeof r?.user_id === "string" ? r.user_id : "";
          const status = typeof r?.status === "string" ? r.status : "";
          if (!id || !tid || !uid) return null;
          return {
            id,
            terreiro_id: tid,
            user_id: uid,
            status,
            created_at: typeof r?.created_at === "string" ? r.created_at : null,
          };
        })
        .filter(Boolean) as PendingRequestRow[];

      let profilesById: Record<string, ProfileLite> = {};
      try {
        const ids = items.map((m) => m.user_id);
        const resolved = await resolveProfiles({ userIds: ids });
        profilesById = toProfileLiteMap(resolved.byId);
      } catch {
        profilesById = {};
      }

      return { items, profilesById };
    },
  });

  const data = query.data ?? {
    items: [] as PendingRequestRow[],
    profilesById: {} as Record<string, ProfileLite>,
  };

  return {
    items: data.items,
    profilesById: data.profilesById,
    isLoading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
    reload: () => query.refetch().then((r) => r.data?.items ?? []),
  };
}

export function useReviewTerreiroMembershipRequest(terreiroId: string) {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      if (!requestId) throw new Error("Request inválida.");

      const res = await supabase.rpc("approve_terreiro_membership_request", {
        request_id: requestId,
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      return res.data;
    },
    onMutate: async (requestId) => {
      if (!terreiroId) return {} as const;

      const requestsKey = queryKeys.terreiro.membershipRequests(terreiroId);
      await queryClient.cancelQueries({ queryKey: requestsKey });

      const prev = queryClient.getQueryData<{
        items: PendingRequestRow[];
        profilesById: Record<string, ProfileLite>;
      }>(requestsKey);

      queryClient.setQueryData(requestsKey, (old) => {
        const prevData =
          (old as any) ??
          ({
            items: [] as PendingRequestRow[],
            profilesById: {} as Record<string, ProfileLite>,
          } as const);

        return {
          ...prevData,
          items: (prevData.items ?? []).filter(
            (r: PendingRequestRow) => r.id !== requestId
          ),
        };
      });

      return { prev };
    },
    onError: (_err, _requestId, ctx) => {
      if (!terreiroId) return;
      const requestsKey = queryKeys.terreiro.membershipRequests(terreiroId);
      if (ctx && "prev" in ctx) {
        queryClient.setQueryData(requestsKey, (ctx as any).prev);
      }
    },
    onSettled: async () => {
      if (!terreiroId) return;
      await Promise.allSettled([
        queryClient.invalidateQueries({
          queryKey: queryKeys.terreiro.membershipRequests(terreiroId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.terreiro.members(terreiroId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.terreiro.invites(terreiroId),
        }),
      ]);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      if (!requestId) throw new Error("Request inválida.");

      const res = await supabase.rpc("reject_terreiro_membership_request", {
        request_id: requestId,
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      return res.data;
    },
    onMutate: async (requestId) => {
      if (!terreiroId) return {} as const;

      const requestsKey = queryKeys.terreiro.membershipRequests(terreiroId);
      await queryClient.cancelQueries({ queryKey: requestsKey });

      const prev = queryClient.getQueryData<{
        items: PendingRequestRow[];
        profilesById: Record<string, ProfileLite>;
      }>(requestsKey);

      queryClient.setQueryData(requestsKey, (old) => {
        const prevData =
          (old as any) ??
          ({
            items: [] as PendingRequestRow[],
            profilesById: {} as Record<string, ProfileLite>,
          } as const);

        return {
          ...prevData,
          items: (prevData.items ?? []).filter(
            (r: PendingRequestRow) => r.id !== requestId
          ),
        };
      });

      return { prev };
    },
    onError: (_err, _requestId, ctx) => {
      if (!terreiroId) return;
      const requestsKey = queryKeys.terreiro.membershipRequests(terreiroId);
      if (ctx && "prev" in ctx) {
        queryClient.setQueryData(requestsKey, (ctx as any).prev);
      }
    },
    onSettled: async () => {
      if (!terreiroId) return;
      await Promise.allSettled([
        queryClient.invalidateQueries({
          queryKey: queryKeys.terreiro.membershipRequests(terreiroId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.terreiro.members(terreiroId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.terreiro.invites(terreiroId),
        }),
      ]);
    },
  });

  const approve = useCallback(
    async (requestId: string) => {
      try {
        const data = await approveMutation.mutateAsync(requestId);
        return { ok: true, data } as const;
      } catch (e) {
        return { ok: false, error: getErrorMessage(e) } as const;
      }
    },
    [approveMutation]
  );

  const reject = useCallback(
    async (requestId: string) => {
      try {
        const data = await rejectMutation.mutateAsync(requestId);
        return { ok: true, data } as const;
      } catch (e) {
        return { ok: false, error: getErrorMessage(e) } as const;
      }
    },
    [rejectMutation]
  );

  const lastError =
    approveMutation.error != null
      ? getErrorMessage(approveMutation.error)
      : rejectMutation.error != null
      ? getErrorMessage(rejectMutation.error)
      : null;

  const friendlyError = useMemo(() => {
    const m = (lastError ?? "").toLowerCase();
    if (!m) return null;
    if (m.includes("not_authorized_admin_only")) {
      return "Acesso restrito à administração.";
    }
    if (
      m.includes("permission") ||
      m.includes("not authorized") ||
      m.includes("rls")
    ) {
      return "Acesso restrito à administração.";
    }
    return null;
  }, [lastError]);

  return {
    approve,
    reject,
    isProcessing: approveMutation.isPending || rejectMutation.isPending,
    error: lastError,
    friendlyError,
  };
}
