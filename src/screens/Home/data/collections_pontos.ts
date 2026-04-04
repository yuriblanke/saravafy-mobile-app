import { supabase } from "@/lib/supabase";

/** Escolha de entidade para `[entidade]` na letra (só nesta linha da coleção). */
export type CollectionPontoEntidadeInput =
  | {
      kind: "registered";
      entidadeId: string;
      /** `collections_pontos.entidade_orixa_id` quando aplicável. */
      entidadeOrixaId?: string | null;
    }
  | {
      kind: "custom";
      texto: string;
    };

export type CollectionPonto = {
  collection_id: string;
  ponto_id: string;
  position: number;
  added_by: string;
  /** Versão do ponto a fixar na coleção (quando suportado pelo schema). */
  ponto_versao_id?: string | null;
  entidade_id?: string | null;
  entidade_texto?: string | null;
  entidade_orixa_id?: string | null;
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
  /** Quando omitido, o banco pode aplicar default/trigger (ex.: canônica). */
  pontoVersaoId?: string | null;
  /** Substituição de `[entidade]` só nesta entrada da coleção. */
  entidade?: CollectionPontoEntidadeInput | null;
}): Promise<{ ok: boolean; alreadyExists?: boolean; error?: string }> {
  const { collectionId, pontoId, addedBy, pontoVersaoId, entidade } = params;

  const pv =
    typeof pontoVersaoId === "string" && pontoVersaoId.trim()
      ? pontoVersaoId.trim()
      : null;

  const entidadePayload: Partial<CollectionPonto> = {};
  if (entidade?.kind === "registered") {
    const eid =
      typeof entidade.entidadeId === "string" && entidade.entidadeId.trim()
        ? entidade.entidadeId.trim()
        : "";
    if (eid) {
      entidadePayload.entidade_id = eid;
      const ox =
        typeof entidade.entidadeOrixaId === "string" &&
        entidade.entidadeOrixaId.trim()
          ? entidade.entidadeOrixaId.trim()
          : null;
      if (ox) entidadePayload.entidade_orixa_id = ox;
    }
  } else if (entidade?.kind === "custom") {
    const t = String(entidade.texto ?? "").trim();
    if (t) {
      entidadePayload.entidade_texto = t;
    }
  }

  // Pode haver corrida com outras inserções por causa do UNIQUE(collection_id, position).
  // Fazemos poucas tentativas: re-calcula max(position) e tenta inserir.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const position = await fetchNextPosition(collectionId);

    const payload: CollectionPonto = {
      collection_id: collectionId,
      ponto_id: pontoId,
      position,
      added_by: addedBy,
      ...(pv ? { ponto_versao_id: pv } : {}),
      ...entidadePayload,
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

export async function updateCollectionPontoEntidade(params: {
  collectionId: string;
  pontoId: string;
  entidade: CollectionPontoEntidadeInput | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { collectionId, pontoId, entidade } = params;
  if (!collectionId || !pontoId) {
    return { ok: false, error: "Coleção ou ponto inválido." };
  }

  const payload: Record<string, string | null> = {
    entidade_id: null,
    entidade_texto: null,
    entidade_orixa_id: null,
  };

  if (entidade?.kind === "registered") {
    const eid =
      typeof entidade.entidadeId === "string" && entidade.entidadeId.trim()
        ? entidade.entidadeId.trim()
        : "";
    if (!eid) {
      return { ok: false, error: "Entidade inválida." };
    }
    payload.entidade_id = eid;
    const ox =
      typeof entidade.entidadeOrixaId === "string" &&
      entidade.entidadeOrixaId.trim()
        ? entidade.entidadeOrixaId.trim()
        : null;
    payload.entidade_orixa_id = ox;
  } else if (entidade?.kind === "custom") {
    const t = String(entidade.texto ?? "").trim();
    if (!t) {
      return { ok: false, error: "Texto da entidade em falta." };
    }
    payload.entidade_texto = t;
  }

  const res = await supabase
    .from(TABLE)
    .update(payload)
    .eq("collection_id", collectionId)
    .eq("ponto_id", pontoId);

  if (res.error) {
    return { ok: false, error: getSupabaseErrorMessage(res.error) };
  }
  return { ok: true };
}
