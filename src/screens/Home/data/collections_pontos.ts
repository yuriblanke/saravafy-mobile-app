import { supabase } from "@/lib/supabase";

export type CollectionPonto = {
  collection_id: string;
  ponto_id: string;
  position: number;
  added_by: string;
};

const TABLE = "collections_pontos";

function isUniqueViolation(e: any): boolean {
  return e && typeof e === "object" && e.code === "23505";
}

function isDuplicatePontoConstraint(e: any): boolean {
  // PK: (collection_id, ponto_id)
  const msg = typeof e?.message === "string" ? e.message : "";
  const details = typeof e?.details === "string" ? e.details : "";
  const hint = typeof e?.hint === "string" ? e.hint : "";
  const hay = `${msg} ${details} ${hint}`.toLowerCase();
  // Alguns formatos trazem o nome do constraint em vez dos campos.
  if (hay.includes("collections_pontos_pkey")) return true;
  return (
    hay.includes("collection_id") &&
    hay.includes("ponto_id") &&
    (hay.includes("duplicate") || hay.includes("unique") || hay.includes("key"))
  );
}

function isPositionConstraint(e: any): boolean {
  // UNIQUE(collection_id, position)
  const msg = typeof e?.message === "string" ? e.message : "";
  const details = typeof e?.details === "string" ? e.details : "";
  const hint = typeof e?.hint === "string" ? e.hint : "";
  const hay = `${msg} ${details} ${hint}`.toLowerCase();
  if (
    hay.includes("collection_id") &&
    hay.includes("position") &&
    hay.includes("unique")
  ) {
    return true;
  }
  return hay.includes("position") && hay.includes("collection");
}

function getSupabaseErrorMessage(e: any): string {
  if (!e) return "Erro ao adicionar ponto à coleção.";
  if (typeof e.message === "string" && e.message.trim()) return e.message;
  if (typeof e.details === "string" && e.details.trim()) return e.details;
  return "Erro ao adicionar ponto à coleção.";
}

async function fetchNextPosition(collectionId: string): Promise<number> {
  const res = await supabase
    .from(TABLE)
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1);

  if (res.error) {
    const anyErr = res.error as any;
    const message =
      typeof anyErr?.message === "string" && anyErr.message.trim()
        ? anyErr.message
        : "Erro ao calcular posição.";
    throw new Error(message);
  }

  const max =
    Array.isArray(res.data) && res.data.length > 0
      ? Number((res.data[0] as any)?.position)
      : 0;
  const maxSafe = Number.isFinite(max) ? max : 0;
  return maxSafe + 1;
}

export async function addPontoToCollection(params: {
  collectionId: string;
  pontoId: string;
  addedBy: string;
}): Promise<{ ok: boolean; alreadyExists?: boolean; error?: string }> {
  const { collectionId, pontoId, addedBy } = params;

  // Pode haver corrida com outras inserções por causa do UNIQUE(collection_id, position).
  // Fazemos poucas tentativas: re-calcula max(position) e tenta inserir.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const position = await fetchNextPosition(collectionId);

    const payload: CollectionPonto = {
      collection_id: collectionId,
      ponto_id: pontoId,
      position,
      added_by: addedBy,
    };

    // Preferência: operação idempotente por (collection_id, ponto_id).
    // `upsert` é o caminho suportado para `onConflict`/`ignoreDuplicates` no supabase-js.
    const res = await supabase
      .from(TABLE)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(
        payload as any,
        {
          onConflict: "collection_id,ponto_id",
          // ignoreDuplicates existe no supabase-js v2.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ignoreDuplicates: true as any,
        } as any
      );

    if (!res.error) {
      return { ok: true };
    }

    const anyErr = res.error as any;

    if (isUniqueViolation(anyErr) && isDuplicatePontoConstraint(anyErr)) {
      // Já existia (PK). Tratar como sucesso.
      return { ok: true, alreadyExists: true };
    }

    if (isUniqueViolation(anyErr) && isPositionConstraint(anyErr)) {
      // Outra inserção pegou a mesma posição; tenta novamente.
      continue;
    }

    return { ok: false, error: getSupabaseErrorMessage(anyErr) };
  }

  return { ok: false, error: "Erro ao adicionar ponto à coleção." };
}
