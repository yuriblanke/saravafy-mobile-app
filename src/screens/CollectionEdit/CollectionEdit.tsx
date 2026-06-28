import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
    incrementCollectionPontosCountInTerreiroLists,
    setCollectionPontosList,
} from "@/src/queries/collectionsCache";
import { queryKeys } from "@/src/queries/queryKeys";
import {
    consumeCollectionEditDraft,
    markCollectionPontosDirty,
} from "@/src/screens/CollectionEdit/draftStore";
import { saveCollectionPontosDraft } from "./data/collectionEdit";
import {
    EditOrderScreenBase,
    type EditOrderItem,
} from "@/src/screens/EditOrderScreenBase/EditOrderScreenBase";
import { getLyricsPreview } from "@/src/utils/format";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef } from "react";

export default function EditCollectionPointsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const collectionId = String(params.id ?? "");
  const draftKey = typeof params.draftKey === "string" ? params.draftKey : "";

  const snapshotRef = useRef(
    draftKey ? consumeCollectionEditDraft(draftKey) : null,
  );

  useEffect(() => {
    if (snapshotRef.current) return;

    showToast("Abra a coleção antes de editar.");
    router.back();
  }, [router, showToast]);

  const items = useMemo(() => {
    const ordered = snapshotRef.current?.orderedItems ?? [];
    const mapped: EditOrderItem[] = [];
    for (const it of ordered) {
      const id = String(it?.ponto?.id ?? "");
      if (!id) continue;
      const title = String(it?.ponto?.title ?? "Ponto");
      const lyrics = String(it?.ponto?.lyrics ?? "");
      mapped.push({ id, title, subtitle: getLyricsPreview(lyrics, 2) });
    }
    return mapped;
  }, []);

  const originalPontoIds = useMemo(() => {
    return items.map((it) => it.id).filter(Boolean);
  }, [items]);

  const onSave = useCallback(
    async (orderedIds: string[]) => {
      if (!user?.id) {
        throw new Error("Entre para editar a coleção.");
      }
      if (!collectionId) {
        throw new Error("Coleção inválida.");
      }

      await saveCollectionPontosDraft({
        collectionId,
        orderedPontoIds: orderedIds,
        originalPontoIds: originalPontoIds,
        userId: user.id,
      });

      // Patch imediato do cache de pontos da coleção (evita flicker/estado stale ao voltar).
      const snapshotItems = snapshotRef.current?.orderedItems ?? [];
      const byId = new Map(snapshotItems.map((it) => [it.ponto.id, it]));
      const nextItems = orderedIds
        .map((id, idx) => {
          const it = byId.get(id);
          if (!it) return null;
          return { ...it, position: idx + 1 };
        })
        .filter(Boolean) as typeof snapshotItems;

      setCollectionPontosList(queryClient, {
        collectionId,
        items: nextItems,
      });

      // Atualiza contadores na biblioteca (listas por-terreiro) se houver remoções.
      const delta = nextItems.length - originalPontoIds.length;
      if (delta !== 0) {
        incrementCollectionPontosCountInTerreiroLists(queryClient, {
          collectionId,
          delta,
        });
      }

      markCollectionPontosDirty(collectionId);
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.byId(collectionId),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.pontos(collectionId),
      });

      queryClient.invalidateQueries({
        queryKey: ["terreiros", "collectionsByTerreiro"],
      });
    },
    [collectionId, originalPontoIds, queryClient, user?.id],
  );

  if (!snapshotRef.current) {
    // O redirect/toast acontece no effect acima.
    return null;
  }

  return (
    <EditOrderScreenBase
      title="Editar coleção"
      items={items}
      allowRemove={true}
      onSave={onSave}
      onSaveSuccess={() => router.back()}
      successToast="Coleção atualizada."
      errorToastFallback="Não foi possível salvar a coleção."
      discardConfirmTitle="Descartar alterações?"
      discardConfirmMessage="Suas alterações não foram salvas."
      removeConfirmTitle="Remover da coleção?"
      removeConfirmMessage="Este item será removido ao salvar."
      dragUnavailableMessage={
        "Arrastar para reordenar não está disponível neste build. Refaça o build do Android/dev-client para incluir `react-native-gesture-handler`."
      }
    />
  );
}
