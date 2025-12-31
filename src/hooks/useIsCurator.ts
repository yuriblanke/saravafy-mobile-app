import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/src/queries/queryKeys";
import { useQuery } from "@tanstack/react-query";

export function useIsCurator(): { isCurator: boolean; isLoading: boolean } {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const q = useQuery({
    queryKey: userId
      ? queryKeys.globalRoles.isCurator(userId)
      : ["globalRoles", "curator", null],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return false;

      const res = await supabase
        .from("curators")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (res.error) {
        if (__DEV__) {
          console.warn("[useIsCurator] error", res.error);
        }
        return false;
      }

      return !!res.data;
    },
  });

  return {
    isCurator: !!q.data,
    isLoading: q.isLoading,
  };
}
