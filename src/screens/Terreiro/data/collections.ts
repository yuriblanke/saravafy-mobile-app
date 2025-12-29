import { supabase } from "@/lib/supabase";

export type TerreiroCollection = {
  id: string;
  title?: string | null;
  description?: string | null;
  pontosCount?: number;
};

function isMissingColumnError(error: unknown, columnName: string) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";

  return message.includes(columnName) && message.includes("does not exist");
}

export async function fetchCollectionsDoTerreiro(terreiroId: string) {
  if (!terreiroId) return [] as TerreiroCollection[];

  const baseSelect = ["id", "title", "description"].join(", ");

  const res: any = await supabase
    .from("collections")
    .select(baseSelect)
    .eq("owner_terreiro_id", terreiroId)
    .order("created_at", { ascending: false });

  // Se a coluna description não existir, refaz a query sem ela.
  const finalRes: any =
    res.error && isMissingColumnError(res.error, "description")
      ? await supabase
          .from("collections")
          .select(["id", "title"].join(", "))
          .eq("owner_terreiro_id", terreiroId)
          .order("created_at", { ascending: false })
      : res;

  if (finalRes.error) {
    if (__DEV__) {
      console.info("[Terreiro] erro ao buscar coleções", {
        error:
          finalRes.error && typeof finalRes.error.message === "string"
            ? finalRes.error.message
            : String(finalRes.error),
      });
    }
    throw new Error("Erro ao buscar coleções");
  }

  const collections = (finalRes.data ?? []) as TerreiroCollection[];
  const ids = collections.map((c) => c.id).filter(Boolean);
  if (ids.length === 0) return collections;

  const pontosRes = await supabase
    .from("collections_pontos")
    .select("collection_id", { count: "exact" })
    .in("collection_id", ids);

  if (!pontosRes.error) {
    const rows = (pontosRes.data ?? []) as {
      collection_id?: string | null;
    }[];

    if (__DEV__) {
      console.info("[Terreiro] pontos: rows", {
        collections: ids.length,
        sampleCollectionIds: ids.slice(0, 5),
        rows: rows.length,
        totalCount:
          typeof pontosRes.count === "number" ? pontosRes.count : null,
      });
    }

    if (__DEV__ && rows.length === 0) {
      const probe = await supabase
        .from("collections_pontos")
        .select("collection_id")
        .limit(5);

      console.info("[Terreiro] pontos: probe", {
        ok: !probe.error,
        error:
          probe.error && typeof probe.error.message === "string"
            ? probe.error.message
            : probe.error
            ? String(probe.error)
            : null,
        rows: Array.isArray(probe.data) ? probe.data.length : 0,
        sample: Array.isArray(probe.data)
          ? probe.data.map((r) => (r as any)?.collection_id).slice(0, 5)
          : [],
      });
    }

    const counts = new Map<string, number>();
    for (const row of rows) {
      const id =
        (typeof row.collection_id === "string" && row.collection_id) || "";
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    return collections.map((c) => ({
      ...c,
      pontosCount: counts.get(c.id) ?? 0,
    }));
  }

  if (__DEV__) {
    console.info("[Terreiro] erro ao contar pontos", {
      error:
        pontosRes.error && typeof pontosRes.error.message === "string"
          ? pontosRes.error.message
          : String(pontosRes.error),
    });
  }

  // Se a contagem falhar, ainda devolvemos as collections (sem pontos).
  return collections;
}
