import { type EditableCollection } from "@/src/queries/collections";
import {
  cancelQueries,
  makeTempId,
  patchQueriesByPrefix,
  removeById,
  replaceId,
  rollbackQueries,
  setQueriesDataSafe,
  snapshotQueries,
  upsertById,
} from "@/src/queries/mutationUtils";
import { queryKeys } from "@/src/queries/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCollection } from "../data/collections";

export type HomeCreateCollectionVars = {
  title: string;
  ownerUserId: string | null;
  ownerTerreiroId: string | null;
};

export function useHomeCreateCollectionMutation(params: {
  userId: string | null;
  onError: (message: string) => void;
}) {
  const { userId, onError } = params;
  const queryClient = useQueryClient();

  return useMutation<EditableCollection, Error, HomeCreateCollectionVars>({
    mutationFn: async (vars): Promise<EditableCollection> => {
      if (!userId) {
        throw new Error("Usuário inválido.");
      }

      const res = await createCollection(vars);
      if (res.error || !res.data) {
        throw new Error(res.error || "Erro ao criar coleção.");
      }

      return {
        id: res.data.id,
        title: typeof res.data.title === "string" ? res.data.title : null,
        owner_user_id:
          typeof res.data.owner_user_id === "string"
            ? res.data.owner_user_id
            : null,
        owner_terreiro_id:
          typeof res.data.owner_terreiro_id === "string"
            ? res.data.owner_terreiro_id
            : null,
        terreiro_title:
          typeof res.data.terreiro_title === "string"
            ? res.data.terreiro_title
            : null,
        created_at:
          typeof res.data.created_at === "string"
            ? res.data.created_at
            : new Date().toISOString(),
        updated_at:
          typeof res.data.updated_at === "string"
            ? res.data.updated_at
            : new Date().toISOString(),
      };
    },
    onMutate: async (vars) => {
      if (!userId) return null;

      const now = new Date().toISOString();
      const tempId = makeTempId("collection");

      const optimistic: EditableCollection = {
        id: tempId,
        title: vars.title,
        owner_user_id: vars.ownerUserId,
        owner_terreiro_id: vars.ownerTerreiroId,
        terreiro_title: null,
        created_at: now,
        updated_at: now,
      };

      const filters = [
        { queryKey: queryKeys.collections.editableByUserPrefix(userId) },
        { queryKey: queryKeys.collections.accountable(userId) },
      ];

      await cancelQueries(queryClient, filters);
      const snapshot = snapshotQueries(queryClient, filters);

      patchQueriesByPrefix<EditableCollection[]>(
        queryClient,
        queryKeys.collections.editableByUserPrefix(userId),
        (old) => upsertById(old ?? [], optimistic, { prepend: true }),
      );

      setQueriesDataSafe<EditableCollection[]>(
        queryClient,
        { queryKey: queryKeys.collections.accountable(userId) },
        (old) => upsertById(old ?? [], optimistic, { prepend: true }),
      );

      return { snapshot, tempId };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.snapshot) {
        rollbackQueries(queryClient, ctx.snapshot);
      }
      const msg = err instanceof Error ? err.message : "Erro ao criar coleção.";
      onError(msg);
    },
    onSuccess: (data, _vars, ctx) => {
      if (!userId) return;

      const realId = data.id;
      const tempId = ctx?.tempId;
      if (!tempId) return;

      const finalItem: EditableCollection = data;

      patchQueriesByPrefix<EditableCollection[]>(
        queryClient,
        queryKeys.collections.editableByUserPrefix(userId),
        (old) => {
          const list = Array.isArray(old) ? old : [];
          const replaced = replaceId(list, tempId, realId);
          return upsertById(replaced, finalItem, { prepend: true });
        },
      );
      setQueriesDataSafe<EditableCollection[]>(
        queryClient,
        { queryKey: queryKeys.collections.accountable(userId) },
        (old) => {
          const list = Array.isArray(old) ? old : [];
          const replaced = replaceId(list, tempId, realId);
          return upsertById(replaced, finalItem, { prepend: true });
        },
      );
    },
    onSettled: (_data, _err, _vars, ctx) => {
      if (!userId) return;

      if (ctx?.tempId) {
        patchQueriesByPrefix<EditableCollection[]>(
          queryClient,
          queryKeys.collections.editableByUserPrefix(userId),
          (old) => removeById(old ?? [], ctx.tempId),
        );
        setQueriesDataSafe<EditableCollection[]>(
          queryClient,
          { queryKey: queryKeys.collections.accountable(userId) },
          (old) => removeById(old ?? [], ctx.tempId),
        );
      }

      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.editableByUserPrefix(userId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.accountable(userId),
      });
    },
  });
}
