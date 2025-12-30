import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "./queryKeys";

export type FeedPonto = {
  id: string;
  title: string;
  tags: string[];
  lyrics: string;
};

function coerceTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }

  if (typeof value === "string") {
    return value
      .split(/[,|]/g)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  return [];
}

export async function fetchHomeFeedPontos(params: {
  userId: string;
  limit: number;
}): Promise<FeedPonto[]> {
  const { userId, limit } = params;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("pontos")
    .select("id, title, lyrics, tags")
    .eq("is_active", true)
    .eq("restricted", false)
    .order("title", { ascending: true })
    .limit(limit);

  if (error) {
    const anyErr = error as any;
    const message =
      typeof anyErr?.message === "string" && anyErr.message.trim()
        ? anyErr.message
        : "Erro ao carregar pontos.";
    throw new Error(message);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    tags: coerceTags(row.tags),
    lyrics: row.lyrics,
  }));
}

export function useHomeFeedPontos(userId: string | null, limit = 10) {
  return useQuery({
    queryKey: userId ? queryKeys.pontos.feed(userId) : [],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      if (!userId) return [] as FeedPonto[];
      return fetchHomeFeedPontos({ userId, limit });
    },
    placeholderData: (prev) => prev,
  });
}

export async function prefetchHomeFeedPontos(
  queryClient: ReturnType<typeof useQueryClient>,
  params: { userId: string; limit: number }
): Promise<void> {
  const { userId, limit } = params;
  if (!userId) return;

  await queryClient.prefetchQuery({
    queryKey: queryKeys.pontos.feed(userId),
    queryFn: () => fetchHomeFeedPontos({ userId, limit }),
    staleTime: 5 * 60 * 1000,
  });
}
