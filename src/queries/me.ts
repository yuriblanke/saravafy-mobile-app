import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "./queryKeys";

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

export function useMyActiveTerreiroIdsQuery(userId: string | null) {
  return useQuery({
    queryKey: userId ? queryKeys.me.terreiros(userId) : [],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return [] as string[];

      let res: any = await supabase
        .from("terreiro_members")
        .select("terreiro_id, status")
        .eq("user_id", userId)
        .eq("status", "active");

      if (res.error && isColumnMissingError(res.error, "status")) {
        res = await supabase
          .from("terreiro_members")
          .select("terreiro_id")
          .eq("user_id", userId);
      }

      if (res.error) {
        const message =
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao carregar terreiros do usuário.";
        throw new Error(message);
      }

      const rows = (res.data ?? []) as Array<{ terreiro_id?: unknown }>;
      const ids = rows
        .map((r) => (typeof r?.terreiro_id === "string" ? r.terreiro_id : ""))
        .filter(Boolean);

      return Array.from(new Set(ids));
    },
    // Keep previous data during realtime-driven invalidations.
    placeholderData: (prev) => prev,
  });
}
