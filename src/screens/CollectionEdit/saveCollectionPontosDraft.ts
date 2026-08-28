import { supabase } from "@/lib/supabase";

/**
 * Aplica remoções e reordenação de `collections_pontos` para uma coleção.
 *
 * Extraído de `CollectionEdit.tsx` (em vez de ficar inline no componente)
 * para poder ser testado sem carregar a árvore de contexts/RN da tela
 * (`EditOrderScreenBase` -> `PreferencesContext` -> AsyncStorage nativo etc.),
 * seguindo o mesmo padrão de `Home/data/collections_pontos.ts`.
 */
export async function saveCollectionPontosDraft(params: {
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
  //
  // X18: as duas fases operam apenas sobre `keepIds`, pontos que, por definição,
  // já estão na coleção (removidos ficaram de fora acima; `EditOrderScreenBase`
  // nunca adiciona itens, só reordena/remove os que vieram via props). Por isso
  // este upsert é sempre um UPDATE em linhas existentes, nunca um INSERT real, e
  // `added_by` NÃO pode entrar no payload: com `ignoreDuplicates: false` (default
  // do supabase-js), upsert vira `ON CONFLICT ... DO UPDATE SET` de toda coluna
  // presente, e reordenar reescreveria a autoria de todos os pontos da coleção
  // para quem arrastou a lista. `position` é a única coluna que deveria mudar.
  const phase1 = keepIds.map((pontoId, idx) => ({
    collection_id: collectionId,
    ponto_id: pontoId,
    position: 10_000 + (idx + 1),
  }));

  const phase2 = keepIds.map((pontoId, idx) => ({
    collection_id: collectionId,
    ponto_id: pontoId,
    position: idx + 1,
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
