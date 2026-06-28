import { supabase } from "@/lib/supabase";

export async function saveCollectionPontosDraft(params: {
  collectionId: string;
  orderedPontoIds: string[];
  originalPontoIds: string[];
  userId: string;
}): Promise<void> {
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
}
