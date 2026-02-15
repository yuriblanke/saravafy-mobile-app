import { useAuth } from "@/contexts/AuthContext";
import { useIsCurator } from "@/src/hooks/useIsCurator";
import { usePendingPontoSubmissions } from "@/src/queries/pontoSubmissions";

export function useCuratorPendingSubmissions() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { isCurator, isLoading: isCuratorLoading } = useIsCurator();

  const query = usePendingPontoSubmissions({
    enabled: !!user && isCurator && !isCuratorLoading,
  });

  const isLoading = isAuthLoading || isCuratorLoading || query.isLoading;

  if (!user && !isAuthLoading) {
    return {
      statusCode: 401 as const,
      isLoading,
      isForbidden: false,
      isUnauthorized: true,
      query,
    };
  }

  if (user && !isCurator && !isCuratorLoading) {
    return {
      statusCode: 403 as const,
      isLoading,
      isForbidden: true,
      isUnauthorized: false,
      query,
    };
  }

  return {
    statusCode: null,
    isLoading,
    isForbidden: false,
    isUnauthorized: false,
    query,
  };
}
