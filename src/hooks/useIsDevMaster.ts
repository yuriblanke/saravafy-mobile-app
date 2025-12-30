import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/src/queries/queryKeys";
import { useQuery } from "@tanstack/react-query";

export function useIsDevMaster(): { isDevMaster: boolean; isLoading: boolean } {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const q = useQuery({
    queryKey: userId
      ? queryKeys.globalRoles.isDevMaster(userId)
      : ["globalRoles", "dev_master", null],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return false;

      const res = await supabase
        .from("dev_masters")
        .select("user_id")
        .eq("user_id", userId)
        .limit(1);

      if (res.error) {
        if (__DEV__) {
          console.warn("[useIsDevMaster] error", res.error);
        }
        return false;
      }

      return Array.isArray(res.data) && res.data.length > 0;
    },
  });

  return {
    isDevMaster: !!q.data,
    isLoading: q.isLoading,
  };
}
