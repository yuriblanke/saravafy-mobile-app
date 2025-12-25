import { supabase } from "@/lib/supabase";

export type CollectionPonto = {
  collection_id: string;
  ponto_id: string;
};

const TABLE = "collections_pontos";

export async function addPontoToCollection(
  collectionId: string,
  pontoId: string
): Promise<boolean> {
  // Check if already exists
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("collection_id", collectionId)
    .eq("ponto_id", pontoId)
    .single();

  if (data) return true; // Already exists

  const { error: insertError } = await supabase
    .from(TABLE)
    .insert({ collection_id: collectionId, ponto_id: pontoId });

  if (insertError) return false;
  return true;
}
