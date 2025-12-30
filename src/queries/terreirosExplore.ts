import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "./queryKeys";

export type ExploreTerreiro = {
  id: string;
  title: string;
  coverImageUrl?: string | null;
};

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

export async function fetchExploreTerreiros(params: { limit: number }) {
  const { limit } = params;

  let res: any = await supabase
    .from("terreiros")
    .select("id, title, cover_image_url")
    .order("title", { ascending: true })
    .limit(limit);

  if (res.error && isColumnMissingError(res.error, "cover_image_url")) {
    res = await supabase
      .from("terreiros")
      .select("id, title")
      .order("title", { ascending: true })
      .limit(limit);
  }

  if (res.error) {
    throw new Error(res.error.message ?? "Erro ao carregar terreiros");
  }

  const rows = (res.data ?? []) as any[];
  return rows
    .map((r) => {
      if (typeof r?.id !== "string" || typeof r?.title !== "string") return null;
      return {
        id: r.id,
        title: r.title,
        coverImageUrl:
          typeof r.cover_image_url === "string" ? r.cover_image_url : null,
      } satisfies ExploreTerreiro;
    })
    .filter(Boolean) as ExploreTerreiro[];
}

export function useExploreTerreiros(limit = 10) {
  return useQuery({
    queryKey: queryKeys.terreiros.exploreInitial(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: () => fetchExploreTerreiros({ limit }),
    placeholderData: (prev) => prev,
  });
}

export async function prefetchExploreTerreiros(
  queryClient: ReturnType<typeof useQueryClient>,
  params: { limit: number }
): Promise<void> {
  const { limit } = params;

  await queryClient.prefetchQuery({
    queryKey: queryKeys.terreiros.exploreInitial(),
    queryFn: () => fetchExploreTerreiros({ limit }),
    staleTime: 5 * 60 * 1000,
  });
}
