import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import {
  incrementCollectionPontosCountInTerreiroLists,
  setCollectionPontosList,
} from "@/src/queries/collectionsCache";
import { queryKeys } from "@/src/queries/queryKeys";
import {
  consumeCollectionEditDraft,
  markCollectionPontosDirty,
} from "@/src/screens/CollectionEdit/draftStore";
import {
  EditOrderScreenBase,
  type EditOrderItem,
} from "@/src/screens/EditOrderScreenBase/EditOrderScreenBase";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef } from "react";

function getLyricsPreview(lyrics: string, maxLines = 2) {
  const lines = String(lyrics ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const previewLines = lines.slice(0, maxLines);
  const preview = previewLines.join("\n");
  if (lines.length > maxLines) return `${preview}\n…`;
  return preview;
}

async function saveCollectionPontosDraft(params: {
  collectionId: string;
  orderedPontoIds: string[];
  originalPontoIds: string[];
  userId: string;
}) {
  const { collectionId, orderedPontoIds, originalPontoIds, userId } = params;

  const keepIds = orderedPontoIds.filter(Boolean);
  const originalIds = originalPontoIds.filter(Boolean);

  const removedIds = originalIds.filter((id) => !keepIds.includes(id));

  if (removedIds.length > 0) {
    const delRes = await supabase
      .from("collections_pontos")
      .delete()
      .eq("collection_id", collectionId)
      .in("ponto_id", removedIds);

    if (delRes.error) {
      throw new Error(
        typeof delRes.error.message === "string" && delRes.error.message.trim()
          ? delRes.error.message
          : "Não foi possível remover itens da coleção.",
      );
    }
  }

  // Reordenação segura: 2 fases para evitar colisões de UNIQUE(collection_id, position)
  // sem depender de RPC/transaction no backend.
  const phase1 = keepIds.map((pontoId, idx) => ({
    collection_id: collectionId,
    ponto_id: pontoId,
    position: 10_000 + (idx + 1),
    added_by: userId,
  }));

  const phase2 = keepIds.map((pontoId, idx) => ({
    collection_id: collectionId,
    ponto_id: pontoId,
    position: idx + 1,
    added_by: userId,
  }));

  if (phase1.length > 0) {
    const up1 = await supabase
      .from("collections_pontos")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(phase1 as any, { onConflict: "collection_id,ponto_id" } as any);

    if (up1.error) {
      throw new Error(
        typeof up1.error.message === "string" && up1.error.message.trim()
          ? up1.error.message
          : "Não foi possível reordenar a coleção.",
      );
    }

    const up2 = await supabase
      .from("collections_pontos")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(phase2 as any, { onConflict: "collection_id,ponto_id" } as any);

    if (up2.error) {
      throw new Error(
        typeof up2.error.message === "string" && up2.error.message.trim()
          ? up2.error.message
          : "Não foi possível reordenar a coleção.",
      );
    }
  }

  return;
}

export default function EditCollectionPointsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const collectionIdParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const collectionId = String(collectionIdParam ?? "").trim();
  const draftKey = typeof params.draftKey === "string" ? params.draftKey : "";

  const goBackToCollection = useCallback(() => {
    if (collectionId) {
      router.replace({
        pathname: "/collection/[id]" as any,
        params: { id: collectionId },
      });
      return;
    }

    router.back();
  }, [collectionId, router]);

  const snapshotRef = useRef(
    draftKey ? consumeCollectionEditDraft(draftKey) : null,
  );

  useEffect(() => {
    if (snapshotRef.current) return;

    showToast("Abra a coleção antes de editar.");
    goBackToCollection();
  }, [goBackToCollection, showToast]);

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
      onBack={goBackToCollection}
      onSave={onSave}
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
