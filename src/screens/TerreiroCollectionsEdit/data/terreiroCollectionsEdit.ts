import { supabase } from "@/lib/supabase";

export async function deleteCollectionFromTerreiro(params: {
  collectionId: string;
  terreiroId: string;
}): Promise<void> {
  const res: any = await supabase
    .from("collections")
    .delete()
    .eq("id", params.collectionId)
    .eq("owner_terreiro_id", params.terreiroId);

  if (res.error) {
    throw new Error(
      typeof res.error.message === "string" && res.error.message.trim()
        ? res.error.message
        : "Não foi possível excluir a coleção."
    );
  }
}
