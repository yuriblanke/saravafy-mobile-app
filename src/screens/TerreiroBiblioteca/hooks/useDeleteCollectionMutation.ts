import { supabase } from "@/lib/supabase";
import {
  cancelQueries,
  removeById,
  rollbackQueries,
  setQueriesDataSafe,
  snapshotQueries,
} from "@/src/queries/mutationUtils";
import { queryKeys } from "@/src/queries/queryKeys";
import type { TerreiroCollectionCard } from "@/src/queries/terreirosCollections";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeleteCollectionMutation(params: {
  terreiroId: string | null;
  userId: string | null;
  showToast: (msg: string) => void;
}) {
  const { terreiroId, userId, showToast } = params;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (collection: TerreiroCollectionCard) => {
      const res = await supabase.rpc("delete_collection", {
        p_collection_id: collection.id,
      });

      if (res.error) {
        throw new Error(
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Não foi possível excluir a coleção."
        );
      }

      const data: any = res.data;
      const ok =
        data === true ||
        (data && typeof data === "object" && "ok" in data && data.ok === true);

      if (!ok) {
        const message =
          data &&
          typeof data === "object" &&
          typeof data.error === "string" &&
          data.error.trim()
            ? data.error
            : "Não foi possível excluir a coleção.";
        throw new Error(message);
      }

      return { id: collection.id };
    },
    onMutate: async (vars) => {
      if (!terreiroId) return null;

      const filters = [
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
      ];

      await cancelQueries(queryClient, filters);
      const snapshot = snapshotQueries(queryClient, filters);

      setQueriesDataSafe<TerreiroCollectionCard[]>(
        queryClient,
        { queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId) },
        (old) => removeById(old ?? [], vars.id)
      );

      return { snapshot, id: vars.id };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.snapshot) rollbackQueries(queryClient, ctx.snapshot);

      if (__DEV__) {
        console.info("[TerreiroBiblioteca] erro ao excluir coleção", {
          error: err instanceof Error ? err.message : String(err),
          id: vars?.id,
        });
      }

      showToast(
        err instanceof Error ? err.message : "Não foi possível excluir a coleção."
      );
    },
    onSettled: (_data, _err, vars) => {
      if (!terreiroId) return;

      queryClient.invalidateQueries({
        queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId),
      });

      if (vars?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.byId(vars.id),
        });
      }

      if (userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.accountable(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.editableByUserPrefix(userId),
        });
      }
    },
  });
}
