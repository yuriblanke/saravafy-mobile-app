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

    return mapped;
  } catch (e) {
    console.error("[fetchAccountableCollections] erro:", e);
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
    queryKey: queryKeys.collections.accountable(),
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
    queryKey: queryKeys.collections.accountable(),
    queryFn: () => fetchAccountableCollections(userId),
    staleTime: 10 * 60 * 1000,
  });
}
