import { supabase } from "@/lib/supabase";
import { isColumnMissingError } from "@/src/utils/errors";

export type CollectionRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  owner_user_id?: string | null;
  owner_terreiro_id?: string | null;
  visibility?: string | null;
  terreiro_title?: string | null;
  terreiro_cover_image_url?: string | null;
};

export type UpdateCollectionDetailsResult = {
  title: string;
  description: string | null;
  titleOnly: boolean;
};

export async function fetchCollection(collectionId: string): Promise<CollectionRow> {
  const res: any = await supabase
    .from("collections")
    .select(
      "id, title, description, owner_terreiro_id, owner_user_id, visibility, terreiros:owner_terreiro_id (title, cover_image_url)"
    )
    .eq("id", collectionId)
    .single();

  const finalRes: any =
    res.error && isColumnMissingError(res.error, "description")
      ? await supabase
          .from("collections")
          .select(
            "id, title, owner_terreiro_id, owner_user_id, visibility, terreiros:owner_terreiro_id (title, cover_image_url)"
          )
          .eq("id", collectionId)
          .single()
      : res;

  if (finalRes.error) {
    const anyErr = finalRes.error as any;
    const message =
      typeof anyErr?.message === "string" && anyErr.message.trim()
        ? anyErr.message
        : "Erro ao carregar a collection.";
    const extra = [anyErr?.code, anyErr?.details, anyErr?.hint]
      .filter((v) => typeof v === "string" && v.trim().length > 0)
      .join(" | ");
    throw new Error(extra ? `${message} (${extra})` : message);
  }

  const row = (finalRes.data ?? null) as any;
  return {
    id: String(row?.id ?? ""),
    title: typeof row?.title === "string" ? row.title : null,
    description: typeof row?.description === "string" ? row.description : null,
    owner_terreiro_id:
      typeof row?.owner_terreiro_id === "string" ? row.owner_terreiro_id : null,
    owner_user_id:
      typeof row?.owner_user_id === "string" ? row.owner_user_id : null,
    visibility: typeof row?.visibility === "string" ? row.visibility : null,
    terreiro_title:
      typeof row?.terreiros?.title === "string" ? row.terreiros.title : null,
    terreiro_cover_image_url:
      typeof row?.terreiros?.cover_image_url === "string"
        ? row.terreiros.cover_image_url
        : null,
  };
}

export async function updateCollectionDetails(params: {
  collectionId: string;
  title: string;
  description: string;
  ownerUserId: string | null;
  ownerTerreiroId: string | null;
}): Promise<UpdateCollectionDetailsResult> {
  const { collectionId, title, description, ownerUserId, ownerTerreiroId } = params;

  let req: any = supabase
    .from("collections")
    .update({ title, description })
    .eq("id", collectionId);

  if (ownerUserId) {
    req = req.eq("owner_user_id", ownerUserId);
  } else if (ownerTerreiroId) {
    req = req.eq("owner_terreiro_id", ownerTerreiroId);
  }

  const res: any = await req.select("id, title, description").single();

  if (res.error && isColumnMissingError(res.error, "description")) {
    // Compat: description column not yet in DB.
    // Note: ownership guard intentionally omitted in compat path (matches original behavior).
    const res2: any = await supabase
      .from("collections")
      .update({ title })
      .eq("id", collectionId)
      .select("id, title")
      .single();

    if (res2.error) {
      throw new Error(
        typeof res2.error.message === "string" && res2.error.message.trim()
          ? res2.error.message
          : "Não foi possível salvar."
      );
    }

    return {
      title: typeof res2.data?.title === "string" ? res2.data.title : title,
      description: null,
      titleOnly: true,
    };
  }

  if (res.error) {
    throw new Error(
      typeof res.error.message === "string" && res.error.message.trim()
        ? res.error.message
        : "Não foi possível salvar."
    );
  }

  return {
    title: typeof res.data?.title === "string" ? res.data.title : title,
    description:
      typeof res.data?.description === "string" ? res.data.description : description,
    titleOnly: false,
  };
}

export async function deleteCollectionById(params: {
  collectionId: string;
  ownerUserId: string | null;
  ownerTerreiroId: string | null;
}): Promise<void> {
  const { collectionId, ownerUserId, ownerTerreiroId } = params;

  let req: any = supabase.from("collections").delete().eq("id", collectionId);

  if (ownerUserId) {
    req = req.eq("owner_user_id", ownerUserId);
  } else if (ownerTerreiroId) {
    req = req.eq("owner_terreiro_id", ownerTerreiroId);
  }

  const res: any = await req;

  if (res.error) {
    throw new Error(
      typeof res.error.message === "string" && res.error.message.trim()
        ? res.error.message
        : "Não foi possível excluir a coleção."
    );
  }
}
