import { getErrorMessage } from "@/src/utils/errors";
import { queryKeys } from "@/src/queries/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import { type Dispatch, type SetStateAction, useCallback, useState } from "react";

import {
  deleteCollectionById,
  updateCollectionDetails,
  type CollectionRow,
} from "../data/collection";

export function useCollectionMutations(params: {
  collectionId: string;
  collection: CollectionRow | null;
  canEditCollection: boolean;
  userId: string | null | undefined;
  terreiroId: string;
  showToast: (msg: string) => void;
  shouldBlockPress: () => boolean;
  setCollection: Dispatch<SetStateAction<CollectionRow | null>>;
  goBackFromCollection: () => void;
}) {
  const {
    collectionId,
    collection,
    canEditCollection,
    userId,
    terreiroId,
    showToast,
    shouldBlockPress,
    setCollection,
    goBackFromCollection,
  } = params;

  const queryClient = useQueryClient();

  const [isNameDetailsOpen, setIsNameDetailsOpen] = useState(false);
  const [isSavingNameDetails, setIsSavingNameDetails] = useState(false);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);

  const openNameDetails = useCallback(() => setIsNameDetailsOpen(true), []);

  const saveNameDetails = useCallback(
    async (next: { title: string; description: string }) => {
      if (!collectionId) return;
      if (shouldBlockPress()) return;

      if (!canEditCollection) {
        showToast("Você não tem permissão para editar esta coleção.");
        return;
      }

      const nextTitle = String(next.title ?? "").trim();
      if (nextTitle.length < 2) {
        showToast("Nome muito curto.");
        return;
      }

      setIsSavingNameDetails(true);

      try {
        const ownerUserId =
          userId && collection?.owner_user_id === userId ? userId : null;
        const ownerTerreiroId = ownerUserId ? null : terreiroId || null;

        const result = await updateCollectionDetails({
          collectionId,
          title: nextTitle,
          description: String(next.description ?? ""),
          ownerUserId,
          ownerTerreiroId,
        });

        setCollection((prev: CollectionRow | null) =>
          prev
            ? {
                ...prev,
                title: result.title,
                ...(result.titleOnly ? {} : { description: result.description }),
              }
            : prev
        );

        showToast(result.titleOnly ? "Nome atualizado." : "Coleção atualizada.");
        setIsNameDetailsOpen(false);

        if (userId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.collections.accountable(userId),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.collections.editableByUserPrefix(userId),
          });
        }
        if (terreiroId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId),
          });
        }
      } catch (e) {
        showToast(getErrorMessage(e));
      } finally {
        setIsSavingNameDetails(false);
      }
    },
    [
      canEditCollection,
      collection?.owner_user_id,
      collectionId,
      queryClient,
      setCollection,
      shouldBlockPress,
      showToast,
      terreiroId,
      userId,
    ]
  );

  const deleteCollection = useCallback(async () => {
    if (!collectionId) return;
    if (shouldBlockPress()) return;

    if (!canEditCollection) {
      showToast("Você não tem permissão para apagar esta coleção.");
      return;
    }

    setIsDeletingCollection(true);

    try {
      const ownerUserId =
        userId && collection?.owner_user_id === userId ? userId : null;
      const ownerTerreiroId = ownerUserId ? null : terreiroId || null;

      await deleteCollectionById({ collectionId, ownerUserId, ownerTerreiroId });

      if (userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.accountable(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.editableByUserPrefix(userId),
        });
      }
      if (terreiroId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId),
        });
      }
      queryClient.removeQueries({
        queryKey: queryKeys.collections.byId(collectionId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.collections.pontos(collectionId),
      });

      setIsNameDetailsOpen(false);
      showToast("Coleção apagada.");
      goBackFromCollection();
    } catch (e) {
      showToast(getErrorMessage(e));
    } finally {
      setIsDeletingCollection(false);
    }
  }, [
    canEditCollection,
    collection?.owner_user_id,
    collectionId,
    goBackFromCollection,
    queryClient,
    shouldBlockPress,
    showToast,
    terreiroId,
    userId,
  ]);

  return {
    isNameDetailsOpen,
    openNameDetails,
    closeNameDetails: useCallback(() => setIsNameDetailsOpen(false), []),
    isSavingNameDetails,
    isDeletingCollection,
    saveNameDetails,
    deleteCollection,
  };
}
