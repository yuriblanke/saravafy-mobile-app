import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";

export type AccountableCollection = {
  id: string;
  title: string | null;
  owner_user_id: string | null;
  owner_terreiro_id: string | null;
  terreiro_title: string | null;
  created_at: string;
  updated_at: string;
};

export type EditableCollection = AccountableCollection;

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

function hashIds(ids: readonly string[]): string {
  // Hash estável e curto para evitar queryKey gigantes.
  const sorted = Array.from(new Set(ids.filter(Boolean))).sort();
  const input = sorted.join(",");

  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // unsigned -> base36
  return (hash >>> 0).toString(36);
}

/**
 * Fetch global de todas as coleções visíveis pela usuária (RLS cuida do controle de acesso):
 * - Coleções pessoais (owner_user_id = auth.uid())
 * - Coleções de terreiros onde a usuária participa (conforme RLS)
 *
 * Este fetch é global e único. O filtro por "perfil ativo" acontece no client.
 */
export async function fetchAccountableCollections(
  userId: string
): Promise<AccountableCollection[]> {
  if (!userId) return [];

  const startedAt = Date.now();
  if (__DEV__) {
    console.info("[Collections] fetchAccountableCollections start", {
      userId,
    });
  }

  try {
    // RLS cuida do controle de acesso - buscamos TODAS as coleções visíveis
    const res = await supabase
      .from("collections")
      .select(
        `
        id,
        title,
        owner_user_id,
        owner_terreiro_id,
        created_at,
        updated_at,
        terreiros:owner_terreiro_id (title)
      `
      )
      .order("updated_at", { ascending: false });

    if (res.error) {
      throw new Error(
        typeof res.error.message === "string" && res.error.message.trim()
          ? res.error.message
          : "Erro ao carregar coleções."
      );
    }

    const rows = (res.data ?? []) as any[];
    const mapped: AccountableCollection[] = rows
      .map((r) => {
        if (typeof r?.id !== "string" || !r.id) return null;
        const terreiroTitle =
          typeof r?.terreiros?.title === "string" ? r.terreiros.title : null;
        return {
          id: r.id,
          title: typeof r.title === "string" ? r.title : null,
          owner_user_id:
            typeof r.owner_user_id === "string" ? r.owner_user_id : null,
          owner_terreiro_id:
            typeof r.owner_terreiro_id === "string"
              ? r.owner_terreiro_id
              : null,
          terreiro_title: terreiroTitle,
          created_at:
            typeof r.created_at === "string"
              ? r.created_at
              : new Date().toISOString(),
          updated_at:
            typeof r.updated_at === "string"
              ? r.updated_at
              : new Date().toISOString(),
        };
      })
      .filter(Boolean) as AccountableCollection[];

    if (__DEV__) {
      console.info("[Collections] fetchAccountableCollections ok", {
        userId,
        ms: Date.now() - startedAt,
        count: mapped.length,
      });
    }

    return mapped;
  } catch (e) {
    console.error("[fetchAccountableCollections] erro:", e);
    if (__DEV__) {
      console.info("[Collections] fetchAccountableCollections error", {
        userId,
        ms: Date.now() - startedAt,
        message: getErrorMessage(e),
      });
    }
    throw new Error(getErrorMessage(e));
  }
}

/**
 * Hook global para todas as coleções visíveis pela usuária.
 * QueryKey fixa: ["collections", "accountable"]
 *
 * A lista retornada deve ser filtrada no client conforme perfil ativo.
 */
export function useAccountableCollections(userId: string | null) {
  return useQuery({
    queryKey: userId ? queryKeys.collections.accountable(userId) : [],
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    queryFn: async () => {
      if (!userId) return [];
      return fetchAccountableCollections(userId);
    },
  });
}

/**
 * Prefetch das coleções para aquecer o cache no boot.
 * Deve ser chamado após confirmação de sessão.
 */
export async function prefetchAccountableCollections(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string
): Promise<void> {
  if (!userId) return;

  await queryClient.prefetchQuery({
    queryKey: queryKeys.collections.accountable(userId),
    queryFn: () => fetchAccountableCollections(userId),
    staleTime: 10 * 60 * 1000,
  });
}

export async function fetchEditableTerreiroIds(
  userId: string
): Promise<string[]> {
  if (!userId) return [];

  const allowedRoles = ["admin", "editor"] as const;

  let res: any = await supabase
    .from("terreiro_members")
    .select("terreiro_id, status")
    .eq("user_id", userId)
    .in("role", [...allowedRoles])
    .eq("status", "active");

  if (res.error && isColumnMissingError(res.error, "status")) {
    res = await supabase
      .from("terreiro_members")
      .select("terreiro_id")
      .eq("user_id", userId)
      .in("role", [...allowedRoles]);
  }

  if (res.error) {
    throw new Error(
      typeof res.error.message === "string" && res.error.message.trim()
        ? res.error.message
        : "Erro ao carregar permissões do usuário."
    );
  }

  const rows = (res.data ?? []) as Array<{ terreiro_id?: unknown }>;
  const ids = rows
    .map((r) => (typeof r?.terreiro_id === "string" ? r.terreiro_id : ""))
    .filter(Boolean);

  return Array.from(new Set(ids));
}

export function useEditableTerreiroIds(userId: string | null) {
  return useQuery({
    queryKey: userId ? queryKeys.terreiros.editableByUser(userId) : [],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      if (!userId) return [] as string[];
      return fetchEditableTerreiroIds(userId);
    },
    placeholderData: (prev) => prev,
  });
}

export async function fetchEditableCollections(params: {
  userId: string;
  editableTerreiroIds: readonly string[];
}): Promise<EditableCollection[]> {
  const { userId, editableTerreiroIds } = params;
  if (!userId) return [];

  const base = supabase
    .from("collections")
    .select(
      `
      id,
      title,
      owner_user_id,
      owner_terreiro_id,
      created_at,
      updated_at,
      terreiros:owner_terreiro_id (title)
    `
    )
    .order("updated_at", { ascending: false });

  let res: any;

  if (!editableTerreiroIds || editableTerreiroIds.length === 0) {
    res = await base.eq("owner_user_id", userId);
  } else {
    const uniqueSorted = Array.from(new Set(editableTerreiroIds)).filter(
      Boolean
    );

    // PostgREST: in.(a,b,c)
    const inList = uniqueSorted.join(",");
    res = await base.or(`owner_user_id.eq.${userId},owner_terreiro_id.in.(${inList})`);
  }

  if (res.error) {
    throw new Error(
      typeof res.error.message === "string" && res.error.message.trim()
        ? res.error.message
        : "Erro ao carregar coleções editáveis."
    );
  }

  const rows = (res.data ?? []) as any[];
  return rows
    .map((r) => {
      if (typeof r?.id !== "string" || !r.id) return null;
      const terreiroTitle =
        typeof r?.terreiros?.title === "string" ? r.terreiros.title : null;
      return {
        id: r.id,
        title: typeof r.title === "string" ? r.title : null,
        owner_user_id:
          typeof r.owner_user_id === "string" ? r.owner_user_id : null,
        owner_terreiro_id:
          typeof r.owner_terreiro_id === "string" ? r.owner_terreiro_id : null,
        terreiro_title: terreiroTitle,
        created_at:
          typeof r.created_at === "string"
            ? r.created_at
            : new Date().toISOString(),
        updated_at:
          typeof r.updated_at === "string"
            ? r.updated_at
            : new Date().toISOString(),
      } satisfies EditableCollection;
    })
    .filter(Boolean) as EditableCollection[];
}

export function useEditableCollections(userId: string | null) {
  const editableTerreiroIdsQuery = useEditableTerreiroIds(userId);
  const editableTerreiroIds = editableTerreiroIdsQuery.data ?? [];
  const terreiroIdsHash = hashIds(editableTerreiroIds);

  const collectionsQuery = useQuery({
    queryKey:
      userId && editableTerreiroIdsQuery.status !== "pending"
        ? queryKeys.collections.editableByUser({
            userId,
            terreiroIdsHash,
          })
        : [],
    enabled: !!userId && editableTerreiroIdsQuery.status !== "pending",
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      if (!userId) return [] as EditableCollection[];
      return fetchEditableCollections({
        userId,
        editableTerreiroIds,
      });
    },
    placeholderData: (prev) => prev,
  });

  const isFetching =
    editableTerreiroIdsQuery.isFetching || collectionsQuery.isFetching;
  const isPending =
    editableTerreiroIdsQuery.isPending || collectionsQuery.isPending;

  return {
    data: collectionsQuery.data ?? [],
    isFetching,
    isPending,
    isError: editableTerreiroIdsQuery.isError || collectionsQuery.isError,
    error: editableTerreiroIdsQuery.error ?? collectionsQuery.error,
    editableTerreiroIds,
    terreiroIdsHash,
    queries: {
      editableTerreiroIds: editableTerreiroIdsQuery,
      collections: collectionsQuery,
    },
  } as const;
}

export async function prefetchEditableTerreiroIds(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string
): Promise<string[]> {
  if (!userId) return [];

  const data = await queryClient.fetchQuery({
    queryKey: queryKeys.terreiros.editableByUser(userId),
    queryFn: () => fetchEditableTerreiroIds(userId),
    staleTime: 5 * 60 * 1000,
  });

  return Array.isArray(data) ? data : [];
}

export async function prefetchEditableCollections(
  queryClient: ReturnType<typeof useQueryClient>,
  params: { userId: string; editableTerreiroIds: readonly string[] }
): Promise<void> {
  const { userId, editableTerreiroIds } = params;
  if (!userId) return;

  const terreiroIdsHash = hashIds(editableTerreiroIds);
  await queryClient.prefetchQuery({
    queryKey: queryKeys.collections.editableByUser({ userId, terreiroIdsHash }),
    queryFn: () =>
      fetchEditableCollections({ userId, editableTerreiroIds: editableTerreiroIds }),
    staleTime: 5 * 60 * 1000,
  });
}
