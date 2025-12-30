import { supabase } from "@/lib/supabase";
import type { QueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "./queryKeys";

export type TerreiroCollectionCard = {
  id: string;
  title: string | null;
  description: string | null;
  visibility: string | null;
  owner_terreiro_id: string | null;
};

function isMissingColumnError(error: unknown, columnName: string) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";

  return message.includes(columnName) && message.includes("does not exist");
}

export async function fetchCollectionsByTerreiro(
  terreiroId: string
): Promise<TerreiroCollectionCard[]> {
  if (!terreiroId) return [] as TerreiroCollectionCard[];

  const baseSelect = [
    "id",
    "title",
    "description",
    "visibility",
    "owner_terreiro_id",
  ].join(", ");

  const res: any = await supabase
    .from("collections")
    .select(baseSelect)
    .eq("owner_terreiro_id", terreiroId)
    .order("updated_at", { ascending: false });

  // Compat: se description não existe (schema legado), refaz sem ela.
  const finalRes: any =
    res.error && isMissingColumnError(res.error, "description")
      ? await supabase
          .from("collections")
          .select(["id", "title", "visibility", "owner_terreiro_id"].join(", "))
          .eq("owner_terreiro_id", terreiroId)
          .order("updated_at", { ascending: false })
      : res;

  if (finalRes.error) {
    const message =
      typeof finalRes.error.message === "string" &&
      finalRes.error.message.trim()
        ? finalRes.error.message
        : "Erro ao carregar coleções do terreiro.";
    throw new Error(message);
  }

  const rows = (finalRes.data ?? []) as any[];
  return rows
    .map((r) => {
      const id = typeof r?.id === "string" ? r.id : "";
      if (!id) return null;
      return {
        id,
        title: typeof r?.title === "string" ? r.title : null,
        description: typeof r?.description === "string" ? r.description : null,
        visibility: typeof r?.visibility === "string" ? r.visibility : null,
        owner_terreiro_id:
          typeof r?.owner_terreiro_id === "string" ? r.owner_terreiro_id : null,
      } satisfies TerreiroCollectionCard;
    })
    .filter(Boolean) as TerreiroCollectionCard[];
}

export function useCollectionsByTerreiroQuery(terreiroId: string | null) {
  return useQuery({
    queryKey: terreiroId ? queryKeys.terreiros.collectionsByTerreiro(terreiroId) : [],
    enabled: !!terreiroId,
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      if (!terreiroId) return [] as TerreiroCollectionCard[];
      return fetchCollectionsByTerreiro(terreiroId);
    },
    placeholderData: (prev) => prev,
  });
}

export async function prefetchCollectionsByTerreiro(
  queryClient: QueryClient,
  params: { terreiroId: string }
): Promise<TerreiroCollectionCard[]> {
  const terreiroId = params.terreiroId;
  if (!terreiroId) return [] as TerreiroCollectionCard[];

  return queryClient.fetchQuery({
    queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId),
    staleTime: 60_000,
    queryFn: () => fetchCollectionsByTerreiro(terreiroId),
  });
}
