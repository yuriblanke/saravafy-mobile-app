import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type TerreiroAccessRole = "admin" | "editor" | "member";

export type TerreiroMembershipStatus = {
  role: TerreiroAccessRole | null;
  isActiveMember: boolean;
  pendingRequestId: string | null;
  hasPendingRequest: boolean;
};

function getErrorMessage(e: unknown): string {
  if (e instanceof Error && typeof e.message === "string" && e.message.trim()) {
    return e.message;
  }

  if (e && typeof e === "object") {
    const anyErr = e as any;
    if (typeof anyErr?.message === "string" && anyErr.message.trim()) {
      return anyErr.message;
    }
  }

  return String(e);
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

  const [data, setData] = useState<TerreiroMembershipStatus>({
    role: null,
    isActiveMember: false,
    pendingRequestId: null,
    hasPendingRequest: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef<Promise<TerreiroMembershipStatus> | null>(null);

  const load = useCallback(async () => {
    if (!terreiroId || !userId) {
      const empty: TerreiroMembershipStatus = {
        role: null,
        isActiveMember: false,
        pendingRequestId: null,
        hasPendingRequest: false,
      };
      setData(empty);
      setError(null);
      setIsLoading(false);
      return empty;
    }

    if (inFlightRef.current) return inFlightRef.current;

    const run = (async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Membership (active)
        let memberRes: any = await supabase
          .from("terreiro_members")
          .select("role, status")
          .eq("terreiro_id", terreiroId)
          .eq("user_id", userId)
          .maybeSingle();

        if (
          memberRes.error &&
          isColumnMissingError(memberRes.error, "status")
        ) {
          memberRes = await supabase
            .from("terreiro_members")
            .select("role")
            .eq("terreiro_id", terreiroId)
            .eq("user_id", userId)
            .maybeSingle();
        }

        if (memberRes.error) {
          throw new Error(
            typeof memberRes.error.message === "string"
              ? memberRes.error.message
              : "Erro ao carregar membership."
          );
        }

        const roleRaw = memberRes?.data?.role;
        const role: TerreiroAccessRole | null =
          roleRaw === "admin" || roleRaw === "editor" || roleRaw === "member"
            ? roleRaw
            : null;

        const statusRaw = memberRes?.data?.status;
        const isActive =
          role !== null &&
          (typeof statusRaw !== "string" || statusRaw === "active");

        // Pending request
        const reqRes = await supabase
          .from("terreiro_membership_requests")
          .select("id, status")
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

        const pendingId =
          typeof reqRes.data?.id === "string" ? reqRes.data.id : null;

        const next: TerreiroMembershipStatus = {
          role,
          isActiveMember: isActive,
          pendingRequestId: pendingId,
          hasPendingRequest: !!pendingId,
        };

        setData(next);
        return next;
      } catch (e) {
        setData({
          role: null,
          isActiveMember: false,
          pendingRequestId: null,
          hasPendingRequest: false,
        });
        setError(getErrorMessage(e));
        return {
          role: null,
          isActiveMember: false,
          pendingRequestId: null,
          hasPendingRequest: false,
        };
      } finally {
        setIsLoading(false);
      }
    })();

    inFlightRef.current = run;
    try {
      return await run;
    } finally {
      inFlightRef.current = null;
    }
  }, [terreiroId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    isLoading,
    error,
    reload: load,
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
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
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

async function fetchProfilesByIds(
  ids: string[]
): Promise<Record<string, ProfileLite>> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return {};

  const res = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, email")
    .in("id", unique);

  if (res.error) {
    throw new Error(
      typeof res.error.message === "string"
        ? res.error.message
        : "Erro ao carregar perfis."
    );
  }

  const rows = (res.data ?? []) as any[];
  const map: Record<string, ProfileLite> = {};
  for (const r of rows) {
    const id = typeof r?.id === "string" ? r.id : "";
    if (!id) continue;
    map[id] = {
      id,
      full_name: typeof r.full_name === "string" ? r.full_name : null,
      avatar_url: typeof r.avatar_url === "string" ? r.avatar_url : null,
      email: typeof r.email === "string" ? r.email : null,
    };
  }
  return map;
}

export function usePendingTerreiroMembershipRequests(terreiroId: string) {
  const [items, setItems] = useState<PendingRequestRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileLite>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!terreiroId) {
      setItems([]);
      setProfilesById({});
      setError(null);
      setIsLoading(false);
      return [] as PendingRequestRow[];
    }

    setIsLoading(true);
    setError(null);

    try {
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
      const mapped: PendingRequestRow[] = rows
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

      const ids = mapped.map((m) => m.user_id);
      const profiles = await fetchProfilesByIds(ids);

      setItems(mapped);
      setProfilesById(profiles);
      return mapped;
    } catch (e) {
      setItems([]);
      setProfilesById({});
      setError(getErrorMessage(e));
      return [] as PendingRequestRow[];
    } finally {
      setIsLoading(false);
    }
  }, [terreiroId]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, profilesById, isLoading, error, reload: load };
}

export function useReviewTerreiroMembershipRequest() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = useCallback(async (requestId: string) => {
    if (!requestId) throw new Error("Request inválida.");

    setIsProcessing(true);
    setError(null);

    try {
      const res = await supabase.rpc("approve_terreiro_membership_request", {
        request_id: requestId,
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      return { ok: true, data: res.data } as const;
    } catch (e) {
      const msg = getErrorMessage(e);
      setError(msg);
      return { ok: false, error: msg } as const;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const reject = useCallback(async (requestId: string) => {
    if (!requestId) throw new Error("Request inválida.");

    setIsProcessing(true);
    setError(null);

    try {
      const res = await supabase.rpc("reject_terreiro_membership_request", {
        request_id: requestId,
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      return { ok: true, data: res.data } as const;
    } catch (e) {
      const msg = getErrorMessage(e);
      setError(msg);
      return { ok: false, error: msg } as const;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const friendlyError = useMemo(() => {
    const m = (error ?? "").toLowerCase();
    if (!m) return null;
    if (
      m.includes("permission") ||
      m.includes("not authorized") ||
      m.includes("rls")
    ) {
      return "Você não tem permissão para aprovar este pedido.";
    }
    return null;
  }, [error]);

  return {
    approve,
    reject,
    isProcessing,
    error,
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
    throw new Error(res.error.message);
  }

  return true;
}

export function useTerreiroMembers(terreiroId: string) {
  const [items, setItems] = useState<TerreiroMemberRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileLite>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!terreiroId) {
      setItems([]);
      setProfilesById({});
      setError(null);
      setIsLoading(false);
      return [] as TerreiroMemberRow[];
    }

    setIsLoading(true);
    setError(null);

    try {
      let res: any = await supabase
        .from("terreiro_members")
        .select("terreiro_id, user_id, role, status, created_at")
        .eq("terreiro_id", terreiroId)
        .eq("status", "active")
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
      const mapped: TerreiroMemberRow[] = rows
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

      const ids = mapped.map((m) => m.user_id);
      const profiles = await fetchProfilesByIds(ids);

      setItems(mapped);
      setProfilesById(profiles);
      return mapped;
    } catch (e) {
      setItems([]);
      setProfilesById({});
      setError(getErrorMessage(e));
      return [] as TerreiroMemberRow[];
    } finally {
      setIsLoading(false);
    }
  }, [terreiroId]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, profilesById, isLoading, error, reload: load };
}

export function useTerreiroInvites(terreiroId: string) {
  const [items, setItems] = useState<TerreiroInviteRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!terreiroId) {
      setItems([]);
      setError(null);
      setIsLoading(false);
      return [] as TerreiroInviteRow[];
    }

    setIsLoading(true);
    setError(null);

    try {
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
      const mapped: TerreiroInviteRow[] = rows
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

      setItems(mapped);
      return mapped;
    } catch (e) {
      setItems([]);
      setError(getErrorMessage(e));
      return [] as TerreiroInviteRow[];
    } finally {
      setIsLoading(false);
    }
  }, [terreiroId]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = useMemo(
    () => items.filter((i) => i.status === "pending"),
    [items]
  );

  return { items, pending, isLoading, error, reload: load };
}

export function useCreateTerreiroInvite(terreiroId: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (params: { email: string; role: TerreiroAccessRole }) => {
      if (!terreiroId) throw new Error("Terreiro inválido.");
      if (!userId) throw new Error("Faça login para continuar.");

      setIsCreating(true);
      setError(null);

      try {
        await createTerreiroInvite({
          terreiroId,
          createdBy: userId,
          email: params.email,
          role: params.role,
        });
        return { ok: true } as const;
      } catch (e) {
        const msg = getErrorMessage(e);
        setError(msg);
        return { ok: false, error: msg } as const;
      } finally {
        setIsCreating(false);
      }
    },
    [terreiroId, userId]
  );

  return { create, isCreating, error };
}
