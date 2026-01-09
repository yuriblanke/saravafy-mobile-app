import { useAuth } from "@/contexts/AuthContext";
import { useGestureBlock } from "@/contexts/GestureBlockContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { useTerreiroMembershipStatus } from "@/src/hooks/terreiroMembership";
import { queryKeys } from "@/src/queries/queryKeys";
import { useCollectionsByTerreiroQuery } from "@/src/queries/terreirosCollections";
import {
  EditOrderScreenBase,
  type EditOrderItem,
} from "@/src/screens/EditOrderScreenBase/EditOrderScreenBase";
import {
  applyTerreiroLibraryOrder,
  loadTerreiroLibraryOrder,
  saveTerreiroLibraryOrder,
} from "@/src/utils/terreiroLibraryOrder";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";

export default function EditTerreiroCollectionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ terreiroId?: string }>();
  const { shouldBlockPress } = useGestureBlock();
  const { showToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const terreiroId =
    typeof params.terreiroId === "string" ? params.terreiroId : "";

  useEffect(() => {
    if (terreiroId) return;
    showToast("Terreiro inválido.");
    router.back();
  }, [router, showToast, terreiroId]);

  const membershipQuery = useTerreiroMembershipStatus(terreiroId);
  const membership = membershipQuery.data;
  const myRole = membership.role;
  const canEdit =
    membership.isActiveMember && (myRole === "admin" || myRole === "editor");

  useEffect(() => {
    if (!terreiroId) return;
    if (!user?.id) return;
    if (membershipQuery.isLoading) return;

    if (!canEdit) {
      showToast("Sem permissão para editar este terreiro.");
      router.back();
    }
  }, [
    canEdit,
    membershipQuery.isLoading,
    router,
    showToast,
    terreiroId,
    user?.id,
  ]);

  const collectionsQuery = useCollectionsByTerreiroQuery(terreiroId || null);
  const collections = collectionsQuery.data ?? [];

  const [libraryOrderIds, setLibraryOrderIds] = useState<string[]>([]);
  useEffect(() => {
    if (!terreiroId) return;

    let cancelled = false;
    loadTerreiroLibraryOrder(terreiroId)
      .then((ids) => {
        if (cancelled) return;
        setLibraryOrderIds(ids);
      })
      .catch(() => {
        if (cancelled) return;
        setLibraryOrderIds([]);
      });

    return () => {
      cancelled = true;
    };
  }, [terreiroId]);

  const orderedCollections = applyTerreiroLibraryOrder(
    collections,
    libraryOrderIds
  );

  const items = useMemo(() => {
    const mapped: EditOrderItem[] = [];
    for (const c of orderedCollections) {
      const id = String(c?.id ?? "");
      if (!id) continue;
      const title =
        (typeof c?.title === "string" && c.title.trim()) || "Coleção";
      const subtitle =
        typeof c?.description === "string" && c.description.trim()
          ? c.description
          : typeof c?.pontosCount === "number"
          ? `${c.pontosCount} ponto(s)`
          : undefined;
      mapped.push({ id, title, subtitle });
    }
    return mapped;
  }, [orderedCollections]);

  const onSave = useCallback(
    async (_orderedIds: string[]) => {
      if (!terreiroId) {
        throw new Error("Terreiro inválido.");
      }

      if (shouldBlockPress()) return;

      const orderedIds = _orderedIds;
      const initialIds = items.map((it) => it.id);
      const removedIds = initialIds.filter((id) => !orderedIds.includes(id));

      // Persistimos a ordem localmente (sem depender de schema/backend).
      await saveTerreiroLibraryOrder(terreiroId, orderedIds);

      // Se houve remoções, refletimos no backend removendo as coleções.
      for (const id of removedIds) {
        const res: any = await supabase
          .from("collections")
          .delete()
          .eq("id", id)
          .eq("owner_terreiro_id", terreiroId);

        if (res.error) {
          throw new Error(
            typeof res.error.message === "string" && res.error.message.trim()
              ? res.error.message
              : "Não foi possível excluir a coleção."
          );
        }
      }

      if (removedIds.length > 0) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId),
        });
      }
    },
    [items, queryClient, shouldBlockPress, terreiroId]
  );

  if (!terreiroId) return null;

  return (
    <EditOrderScreenBase
      title="Editar biblioteca"
      items={items}
      allowRemove
      onSave={onSave}
      successToast="Biblioteca atualizada."
      errorToastFallback="Não foi possível salvar."
      discardConfirmTitle="Descartar alterações?"
      discardConfirmMessage="Suas alterações não foram salvas."
      removeConfirmTitle="Excluir coleção?"
      removeConfirmMessage="Esta coleção será excluída ao salvar."
    />
  );
}
