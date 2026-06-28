import { supabase } from "@/lib/supabase";
import { isColumnMissingError } from "@/src/utils/errors";

export type TerreiroRow = {
  id: string;
  title?: string | null;
  cover_image_url?: string | null;
};

export type CreateCollectionResult = {
  id: string;
  title: string;
  description: string | null;
  visibility: string | null;
  owner_terreiro_id: string;
};

export async function fetchTerreiro(terreiroId: string): Promise<TerreiroRow> {
  let res: any = await supabase
    .from("terreiros")
    .select("id, title, cover_image_url")
    .eq("id", terreiroId)
    .single();

  if (res.error && isColumnMissingError(res.error, "cover_image_url")) {
    res = await supabase
      .from("terreiros")
      .select("id, title")
      .eq("id", terreiroId)
      .single();
  }

  if (res.error) {
    throw new Error(
      typeof res.error.message === "string" && res.error.message.trim()
        ? res.error.message
        : "Erro ao carregar o terreiro."
    );
  }

  return res.data as TerreiroRow;
}

export async function createCollectionForTerreiro(params: {
  title: string;
  terreiroId: string;
}): Promise<CreateCollectionResult> {
  const res: any = await supabase
    .from("collections")
    .insert({
      title: params.title,
      owner_terreiro_id: params.terreiroId,
      owner_user_id: null,
    })
    .select("id, title, description, visibility, owner_terreiro_id")
    .single();

  if (res.error || !res.data?.id) {
    throw new Error(res.error?.message || "Erro ao criar coleção");
  }

  return {
    id: res.data.id as string,
    title: typeof res.data.title === "string" ? res.data.title : params.title,
    description:
      typeof res.data.description === "string" ? res.data.description : null,
    visibility:
      typeof res.data.visibility === "string" ? res.data.visibility : null,
    owner_terreiro_id:
      typeof res.data.owner_terreiro_id === "string"
        ? res.data.owner_terreiro_id
        : params.terreiroId,
  };
}

export async function updateCollectionTitle(params: {
  collectionId: string;
  title: string;
}): Promise<{ id: string; title: string }> {
  const res: any = await supabase
    .from("collections")
    .update({ title: params.title })
    .eq("id", params.collectionId)
    .select("id, title")
    .single();

  if (res.error) {
    throw new Error(
      typeof res.error.message === "string"
        ? res.error.message
        : "Erro ao atualizar título da coleção"
    );
  }

  const savedTitle =
    (typeof res.data?.title === "string" && res.data.title.trim()) ||
    params.title;

  return { id: params.collectionId, title: savedTitle };
}
