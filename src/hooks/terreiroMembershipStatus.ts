import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { queryKeys } from "@/src/queries/queryKeys";
import {
  getErrorMessage as baseGetErrorMessage,
  isColumnMissingError,
} from "@/src/utils/errors";

export type TerreiroMemberKind = "corrente" | "assistencia";

export type TerreiroAccessRole = "admin" | "curimba" | "member";

export type TerreiroMembershipStatus = {
  role: TerreiroAccessRole | null;
  isActiveMember: boolean;
  pendingRequestId: string | null;
  hasPendingRequest: boolean;
};

function getErrorMessage(e: unknown): string {
  const msg = baseGetErrorMessage(e);
  if (msg.toLowerCase().includes("cannot_remove_last_admin")) {
    return "Não é possível remover o último admin";
  }
  return msg;
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
      const allowedRoles = ["admin", "curimba", "member"] as const;

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
            roleRaw === "admin" || roleRaw === "curimba" || roleRaw === "member"
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
