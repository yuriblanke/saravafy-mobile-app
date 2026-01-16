import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import {
  resolveProfiles,
  type PublicProfile,
} from "@/src/features/identity/resolveProfiles";
import { queryKeys } from "@/src/queries/queryKeys";

export type TerreiroAccessRole = "admin" | "editor" | "member";

export type TerreiroMembershipStatus = {
  role: TerreiroAccessRole | null;
  isActiveMember: boolean;
  pendingRequestId: string | null;
  hasPendingRequest: boolean;
};

function getErrorMessage(e: unknown): string {
  if (e instanceof Error && typeof e.message === "string" && e.message.trim()) {
    const msg = e.message;
    const m = msg.toLowerCase();
    if (m.includes("cannot_remove_last_admin")) {
      return "Não é possível remover o último admin";
    }
    return msg;
  }

  if (e && typeof e === "object") {
    const anyErr = e as any;
    if (typeof anyErr?.message === "string" && anyErr.message.trim()) {
      const msg = anyErr.message as string;
      const m = msg.toLowerCase();
      if (m.includes("cannot_remove_last_admin")) {
        return "Não é possível remover o último admin";
      }
      return msg;
    }
  }

  const msg = String(e);
  if (msg.toLowerCase().includes("cannot_remove_last_admin")) {
    return "Não é possível remover o último admin";
  }
  return msg;
}

function isColumnMissingError(error: unknown, columnName: string) {
  const msg =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";

  const m = msg.toLowerCase();
  return (
    m.includes(columnName.toLowerCase()) &&
    (m.includes("does not exist") || m.includes("column"))
  );
}

function normalizeEmail(email: string) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function isDuplicateKeyError(error: unknown) {
  const anyErr = error as any;
  const code = typeof anyErr?.code === "string" ? anyErr.code : "";
  if (code === "23505") return true;

  const msg = typeof anyErr?.message === "string" ? anyErr.message : "";
  const m = msg.toLowerCase();
  return (
    m.includes("duplicate") ||
    m.includes("already exists") ||
    m.includes("unique")
  );
}

export function useTerreiroMembershipStatus(terreiroId: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const membershipQuery = useQuery({
    queryKey: userId ? queryKeys.me.membership(userId) : [],
    enabled: !!userId && !!terreiroId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId || !terreiroId) {
        return [] as {
          terreiro_id: string;
          role: TerreiroAccessRole | null;
        }[];
      }

      // NOTE: Prefer a lista completa do usuário (shared cache), para que
      // invalidations via Realtime funcionem de forma consistente.
      const allowedRoles = ["admin", "editor", "member"] as const;

      let res: any = await supabase
        .from("terreiro_members")
        .select("terreiro_id, role, status")
        .eq("user_id", userId)
        .in("role", [...allowedRoles])
        .eq("status", "active");

      if (res.error && isColumnMissingError(res.error, "status")) {
        res = await supabase
          .from("terreiro_members")
          .select("terreiro_id, role")
          .eq("user_id", userId)
          .in("role", [...allowedRoles]);
      }

      if (res.error) {
        const message =
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao carregar membership.";
        throw new Error(message);
      }

      const rows = (res.data ?? []) as {
        terreiro_id?: unknown;
        role?: unknown;
      }[];

      return rows
        .map((r) => {
          const tid = typeof r?.terreiro_id === "string" ? r.terreiro_id : "";
          if (!tid) return null;

          const roleRaw = r?.role;
          const role: TerreiroAccessRole | null =
            roleRaw === "admin" || roleRaw === "editor" || roleRaw === "member"
              ? roleRaw
              : null;

          return {
            terreiro_id: tid,
            role,
          };
        })
        .filter(Boolean) as {
        terreiro_id: string;
        role: TerreiroAccessRole | null;
      }[];
    },
    placeholderData: (prev) => prev,
  });

  const memberRow = useMemo(() => {
    if (!terreiroId) return null;
    const rows = membershipQuery.data ?? [];
    return rows.find((r) => r.terreiro_id === terreiroId) ?? null;
  }, [membershipQuery.data, terreiroId]);

  const role = memberRow?.role ?? null;
  const isActiveMember = role !== null;

  const pendingQuery = useQuery({
    queryKey:
      userId && terreiroId
        ? (["terreiroMembershipRequest", userId, terreiroId] as const)
        : [],
    enabled: !!userId && !!terreiroId && !isActiveMember,
    staleTime: 30_000,
    queryFn: async () => {
      if (!userId || !terreiroId) return null as string | null;

      const reqRes = await supabase
        .from("terreiro_membership_requests")
        .select("id")
        .eq("terreiro_id", terreiroId)
        .eq("user_id", userId)
        .eq("status", "pending")
        .maybeSingle();

      if (reqRes.error) {
        throw new Error(
          typeof reqRes.error.message === "string"
            ? reqRes.error.message
            : "Erro ao carregar pedidos pendentes."
        );
      }

      return typeof reqRes.data?.id === "string" ? reqRes.data.id : null;
    },
    placeholderData: (prev) => prev,
  });

  const pendingRequestId = pendingQuery.data ?? null;

  const data = useMemo((): TerreiroMembershipStatus => {
    return {
      role,
      isActiveMember,
      pendingRequestId,
      hasPendingRequest: !!pendingRequestId,
    };
  }, [isActiveMember, pendingRequestId, role]);

  const error =
    membershipQuery.error != null
      ? getErrorMessage(membershipQuery.error)
      : pendingQuery.error != null
      ? getErrorMessage(pendingQuery.error)
      : null;

  const reload = useCallback(async () => {
    await Promise.allSettled([
      membershipQuery.refetch(),
      pendingQuery.refetch(),
    ]);
    return data;
  }, [data, membershipQuery, pendingQuery]);

  return {
    data,
    isLoading: membershipQuery.isLoading,
    error,
    reload,
  };
}

export function useCreateTerreiroMembershipRequest(terreiroId: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async () => {
    if (!terreiroId) {
      throw new Error("Terreiro inválido.");
    }

    if (!userId) {
      throw new Error("Faça login para continuar.");
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await supabase.from("terreiro_membership_requests").insert({
        terreiro_id: terreiroId,
        user_id: userId,
        status: "pending",
      });

      if (res.error) {
        if (isDuplicateKeyError(res.error)) {
          return { ok: true, alreadyExisted: true } as const;
        }
        throw new Error(res.error.message);
      }

      return { ok: true, alreadyExisted: false } as const;
    } catch (e) {
      const msg = getErrorMessage(e);
      setError(msg);
      return { ok: false, alreadyExisted: false, error: msg } as const;
    } finally {
      setIsCreating(false);
    }
  }, [terreiroId, userId]);

  return { create, isCreating, error };
}

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

export type TerreiroMemberRow = {
  terreiro_id: string;
  user_id: string;
  role: TerreiroAccessRole | string;
  status?: string | null;
  created_at?: string | null;
};

export type TerreiroInviteRow = {
  id: string;
  terreiro_id: string;
  email: string;
  role: TerreiroAccessRole | string;
  status: string;
  created_at?: string | null;
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

export async function upsertTerreiroMemberActive(params: {
  terreiroId: string;
  userId: string;
  role: TerreiroAccessRole;
}) {
  const { terreiroId, userId, role } = params;
  if (!terreiroId || !userId) throw new Error("Membership inválida.");

  let res: any = await supabase.from("terreiro_members").upsert(
    {
      terreiro_id: terreiroId,
      user_id: userId,
      role,
      status: "active",
    },
    { onConflict: "terreiro_id,user_id" }
  );

  if (res.error && isColumnMissingError(res.error, "status")) {
    res = await supabase.from("terreiro_members").upsert(
      {
        terreiro_id: terreiroId,
        user_id: userId,
        role,
      },
      { onConflict: "terreiro_id,user_id" }
    );
  }

  if (res.error) {
    throw new Error(res.error.message);
  }

  return true;
}

export async function createTerreiroInvite(params: {
  terreiroId: string;
  createdBy: string;
  email: string;
  role: TerreiroAccessRole;
}) {
  const email = normalizeEmail(params.email);
  if (!email) throw new Error("Informe um e-mail válido.");

  const res = await supabase.from("terreiro_invites").insert({
    terreiro_id: params.terreiroId,
    email,
    role: params.role,
    status: "pending",
    created_by: params.createdBy,
  });

  if (res.error) {
    const err: any = res.error;
    const code = typeof err?.code === "string" ? err.code : "";
    const message = typeof err?.message === "string" ? err.message : "";
    if (code === "23505" || message.includes("ux_terreiro_invites_pending")) {
      throw new Error(
        "Já existe um convite pendente para este e-mail neste terreiro. Cancele o convite pendente antes de enviar outro."
      );
    }
    throw new Error(message || "Erro ao enviar convite.");
  }

  return true;
}

export function useTerreiroMembers(terreiroId: string) {
  const query = useQuery({
    queryKey: queryKeys.terreiro.members(terreiroId || "__none__"),
    enabled: !!terreiroId,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      if (!terreiroId) {
        return {
          items: [] as TerreiroMemberRow[],
          profilesById: {} as Record<string, ProfileLite>,
        };
      }

      let res: any = await supabase
        .from("terreiro_members")
        .select("terreiro_id, user_id, role, status, created_at")
        .eq("terreiro_id", terreiroId)
        .order("created_at", { ascending: true });

      if (res.error && isColumnMissingError(res.error, "status")) {
        res = await supabase
          .from("terreiro_members")
          .select("terreiro_id, user_id, role, created_at")
          .eq("terreiro_id", terreiroId)
          .order("created_at", { ascending: true });
      }

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string"
            ? res.error.message
            : "Erro ao carregar membros."
        );
      }

      const rows = (res.data ?? []) as any[];
      const items: TerreiroMemberRow[] = rows
        .map((r) => {
          const tid = typeof r?.terreiro_id === "string" ? r.terreiro_id : "";
          const uid = typeof r?.user_id === "string" ? r.user_id : "";
          const role = typeof r?.role === "string" ? r.role : "";
          if (!tid || !uid) return null;
          return {
            terreiro_id: tid,
            user_id: uid,
            role,
            status: typeof r?.status === "string" ? r.status : null,
            created_at: typeof r?.created_at === "string" ? r.created_at : null,
          };
        })
        .filter(Boolean) as TerreiroMemberRow[];

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
    items: [] as TerreiroMemberRow[],
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

export function useTerreiroInvites(terreiroId: string) {
  const query = useQuery({
    queryKey: queryKeys.terreiro.invites(terreiroId || "__none__"),
    enabled: !!terreiroId,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      if (!terreiroId) {
        return {
          items: [] as TerreiroInviteRow[],
          profilesByEmailLower: {} as Record<string, ProfileLite>,
        };
      }

      const res = await supabase
        .from("terreiro_invites")
        .select("id, terreiro_id, email, role, status, created_at")
        .eq("terreiro_id", terreiroId)
        .order("created_at", { ascending: false });

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string"
            ? res.error.message
            : "Erro ao carregar convites."
        );
      }

      const rows = (res.data ?? []) as any[];
      const items: TerreiroInviteRow[] = rows
        .map((r) => {
          const id = typeof r?.id === "string" ? r.id : "";
          const tid = typeof r?.terreiro_id === "string" ? r.terreiro_id : "";
          const email = typeof r?.email === "string" ? r.email : "";
          const role = typeof r?.role === "string" ? r.role : "";
          const status = typeof r?.status === "string" ? r.status : "";
          if (!id || !tid || !email) return null;
          return {
            id,
            terreiro_id: tid,
            email,
            role,
            status,
            created_at: typeof r?.created_at === "string" ? r.created_at : null,
          };
        })
        .filter(Boolean) as TerreiroInviteRow[];

      let profilesByEmailLower: Record<string, ProfileLite> = {};
      try {
        const emails = items.map((m) => m.email).filter(Boolean);
        const resolved = await resolveProfiles({ emails });
        profilesByEmailLower = toProfileLiteEmailMap(resolved.byEmailLower);
      } catch {
        profilesByEmailLower = {};
      }

      return { items, profilesByEmailLower };
    },
  });

  const data = query.data ?? {
    items: [] as TerreiroInviteRow[],
    profilesByEmailLower: {} as Record<string, ProfileLite>,
  };

  const pending = useMemo(
    () => (data.items ?? []).filter((i) => i.status === "pending"),
    [data.items]
  );

  return {
    items: data.items,
    pending,
    profilesByEmailLower: data.profilesByEmailLower,
    isLoading: query.isLoading,
    error: query.error ? getErrorMessage(query.error) : null,
    reload: () => query.refetch().then((r) => r.data?.items ?? []),
  };
}

export function useCreateTerreiroInvite(terreiroId: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: { email: string; role: TerreiroAccessRole }) => {
      if (!terreiroId) throw new Error("Terreiro inválido.");
      if (!userId) throw new Error("Faça login para continuar.");

      await createTerreiroInvite({
        terreiroId,
        createdBy: userId,
        email: params.email,
        role: params.role,
      });
      return true;
    },
    onMutate: async (params) => {
      if (!terreiroId) return {} as const;

      const invitesKey = queryKeys.terreiro.invites(terreiroId);
      await queryClient.cancelQueries({ queryKey: invitesKey });

      const prev = queryClient.getQueryData<{
        items: TerreiroInviteRow[];
        profilesByEmailLower: Record<string, ProfileLite>;
      }>(invitesKey);

      const nowIso = new Date().toISOString();
      const optimistic: TerreiroInviteRow = {
        id: `optimistic-${Date.now()}`,
        terreiro_id: terreiroId,
        email: normalizeEmail(params.email),
        role: params.role,
        status: "pending",
        created_at: nowIso,
      };

      queryClient.setQueryData(invitesKey, (old) => {
        const prevData =
          (old as any) ??
          ({
            items: [] as TerreiroInviteRow[],
            profilesByEmailLower: {} as Record<string, ProfileLite>,
          } as const);

        return {
          ...prevData,
          items: [optimistic, ...(prevData.items ?? [])],
        };
      });

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (!terreiroId) return;
      const invitesKey = queryKeys.terreiro.invites(terreiroId);
      if (ctx && "prev" in ctx) {
        queryClient.setQueryData(invitesKey, (ctx as any).prev);
      }
    },
    onSettled: async () => {
      if (!terreiroId) return;
      await queryClient.invalidateQueries({
        queryKey: queryKeys.terreiro.invites(terreiroId),
      });
    },
  });

  const create = useCallback(
    async (params: { email: string; role: TerreiroAccessRole }) => {
      try {
        await mutation.mutateAsync(params);
        return { ok: true } as const;
      } catch (e) {
        return { ok: false, error: getErrorMessage(e) } as const;
      }
    },
    [mutation]
  );

  return {
    create,
    isCreating: mutation.isPending,
    error: mutation.error ? getErrorMessage(mutation.error) : null,
  };
}
export function useRemoveTerreiroMember(terreiroId: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (memberUserId: string) => {
      if (!terreiroId) throw new Error("Terreiro inválido.");
      if (!userId) throw new Error("Faça login para continuar.");
      if (!memberUserId) throw new Error("Membro inválido.");

      const res = await supabase
        .from("terreiro_members")
        .delete()
        .eq("terreiro_id", terreiroId)
        .eq("user_id", memberUserId);

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string"
            ? res.error.message
            : "Erro ao remover membro."
        );
      }

      return true;
    },
    onMutate: async (memberUserId) => {
      if (!terreiroId) return {} as const;

      const membersKey = queryKeys.terreiro.members(terreiroId);
      await queryClient.cancelQueries({ queryKey: membersKey });

      const prev = queryClient.getQueryData<{
        items: TerreiroMemberRow[];
        profilesById: Record<string, ProfileLite>;
      }>(membersKey);

      queryClient.setQueryData(membersKey, (old) => {
        const prevData =
          (old as any) ??
          ({
            items: [] as TerreiroMemberRow[],
            profilesById: {} as Record<string, ProfileLite>,
          } as const);

        return {
          ...prevData,
          items: (prevData.items ?? []).filter(
            (m: TerreiroMemberRow) => m.user_id !== memberUserId
          ),
        };
      });

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (!terreiroId) return;
      const membersKey = queryKeys.terreiro.members(terreiroId);
      if (ctx && "prev" in ctx) {
        queryClient.setQueryData(membersKey, (ctx as any).prev);
      }
    },
    onSettled: async () => {
      if (!terreiroId) return;
      await queryClient.invalidateQueries({
        queryKey: queryKeys.terreiro.members(terreiroId),
      });
    },
  });

  const remove = useCallback(
    async (memberUserId: string) => {
      try {
        await mutation.mutateAsync(memberUserId);
        return { ok: true } as const;
      } catch (e) {
        return { ok: false, error: getErrorMessage(e) } as const;
      }
    },
    [mutation]
  );

  return {
    remove,
    isRemoving: mutation.isPending,
    error: mutation.error ? getErrorMessage(mutation.error) : null,
  };
}

export function useCancelTerreiroInvite(terreiroId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (inviteId: string) => {
      if (!terreiroId) throw new Error("Terreiro inválido.");
      if (!inviteId) throw new Error("Convite inválido.");

      let del = supabase.from("terreiro_invites").delete();

      if (inviteId.startsWith("optimistic-")) {
        const invitesKey = queryKeys.terreiro.invites(terreiroId);
        const cached = queryClient.getQueryData<{
          items: TerreiroInviteRow[];
          profilesByEmailLower: Record<string, ProfileLite>;
        }>(invitesKey);

        const match = (cached?.items ?? []).find((i) => i.id === inviteId);
        const email = match?.email ? normalizeEmail(match.email) : "";
        const role = typeof match?.role === "string" ? match.role : "";

        if (!email) {
          throw new Error(
            "Convite ainda está sendo enviado. Tente novamente em alguns segundos."
          );
        }

        del = del
          .eq("terreiro_id", terreiroId)
          .eq("email", email)
          .eq("status", "pending");

        if (role) {
          del = del.eq("role", role);
        }
      } else {
        del = del.eq("id", inviteId);
      }

      const res = await del.select("id");

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string"
            ? res.error.message
            : "Erro ao cancelar convite."
        );
      }

      const deletedCount = Array.isArray(res.data)
        ? res.data.length
        : res.data
        ? 1
        : 0;

      if (deletedCount === 0) {
        throw new Error(
          "Convite não encontrado (talvez já tenha sido cancelado)."
        );
      }

      return true;
    },
    onMutate: async (inviteId) => {
      if (!terreiroId) return {} as const;

      const invitesKey = queryKeys.terreiro.invites(terreiroId);
      await queryClient.cancelQueries({ queryKey: invitesKey });

      const prev = queryClient.getQueryData<{
        items: TerreiroInviteRow[];
        profilesByEmailLower: Record<string, ProfileLite>;
      }>(invitesKey);

      queryClient.setQueryData(invitesKey, (old) => {
        const prevData =
          (old as any) ??
          ({
            items: [] as TerreiroInviteRow[],
            profilesByEmailLower: {} as Record<string, ProfileLite>,
          } as const);

        return {
          ...prevData,
          items: (prevData.items ?? []).filter(
            (i: TerreiroInviteRow) => i.id !== inviteId
          ),
        };
      });

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (!terreiroId) return;
      const invitesKey = queryKeys.terreiro.invites(terreiroId);
      if (ctx && "prev" in ctx) {
        queryClient.setQueryData(invitesKey, (ctx as any).prev);
      }
    },
    onSettled: async () => {
      if (!terreiroId) return;
      await queryClient.invalidateQueries({
        queryKey: queryKeys.terreiro.invites(terreiroId),
      });
    },
  });

  const cancel = useCallback(
    async (inviteId: string) => {
      try {
        await mutation.mutateAsync(inviteId);
        return { ok: true } as const;
      } catch (e) {
        return { ok: false, error: getErrorMessage(e) } as const;
      }
    },
    [mutation]
  );

  return {
    cancel,
    isCancelling: mutation.isPending,
    error: mutation.error ? getErrorMessage(mutation.error) : null,
  };
}

export function useResendTerreiroInvite() {
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resend = useCallback(async (inviteId: string) => {
    if (!inviteId) throw new Error("Convite inválido.");

    setIsResending(true);
    setError(null);

    try {
      // Update the invite to trigger a new notification
      // This is a placeholder implementation
      // You may want to add a specific RPC or update logic here
      const res = await supabase
        .from("terreiro_invites")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", inviteId);

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string"
            ? res.error.message
            : "Erro ao reenviar convite."
        );
      }

      return { ok: true } as const;
    } catch (e) {
      const msg = getErrorMessage(e);
      setError(msg);
      return { ok: false, error: msg } as const;
    } finally {
      setIsResending(false);
    }
  }, []);

  return { resend, isResending, error };
}
