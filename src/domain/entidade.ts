/**
 * Entidades canônicas e encadeamento orixá (self-FK em `entidades.orixa_id`).
 * `nome` pode ser null (linha/orixá genérico sem entidade nomeada).
 */

export type EntidadeSimples = {
  id: string;
  nome: string | null;
  linha: string;
  /** Reflete `entidades.orixa_id` no banco. */
  orixa_id: string | null;
};

export type EntidadeComOrixa = EntidadeSimples & {
  /** Entidade referenciada por `orixa_id` (outra linha em `entidades`). */
  orixas: EntidadeSimples | null;
};

export type PontoEntidadeChipFields = {
  entidade_id: string | null;
  /** Label do chip de entidade (já resolvido; ver `resolveEntidadeLabel`). */
  entidadeNome: string | null;
  /** Chip secundário de orixá: apenas quando a entidade tem `nome` e orixá vinculado. */
  orixaNome: string | null;
};

function readNome(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function readLinha(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

function readOrixaIdFromRow(raw: Record<string, unknown>): string | null {
  const v = raw.orixa_id ?? raw["orixa_id"];
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

export function resolveEntidadeLabel(entidade: EntidadeComOrixa): string {
  const nome = readNome(entidade.nome);
  if (nome) return nome;
  const ox = readNome(entidade.orixas?.nome ?? null);
  if (ox) {
    return `${readLinha(entidade.linha)} de ${ox}`;
  }
  return readLinha(entidade.linha);
}

export function buildEntidadeComOrixaFromEmbed(
  e: Record<string, unknown>,
): EntidadeComOrixa | null {
  const id = typeof e.id === "string" && e.id.trim() ? e.id.trim() : "";
  if (!id) return null;

  const nome = readNome(e.nome);
  const linha = readLinha(e.linha);

  const orixaEmbed = e.orixa ?? e.orixas ?? e.orixa_entidade;
  const orixaRow = Array.isArray(orixaEmbed) ? orixaEmbed[0] : orixaEmbed;

  let orixas: EntidadeSimples | null = null;
  if (orixaRow && typeof orixaRow === "object") {
    const ox = orixaRow as Record<string, unknown>;
    const oId =
      typeof ox.id === "string" && ox.id.trim() ? ox.id.trim() : "";
    orixas = {
      id: oId,
      nome: readNome(ox.nome),
      linha: readLinha(ox.linha),
      orixa_id: null,
    };
  }

  return {
    id,
    nome,
    linha,
    orixa_id: readOrixaIdFromRow(e),
    orixas,
  };
}

/**
 * Extrai labels para chips a partir de uma linha `pontos` com embed `entidades` (+ orixá).
 */
export function parseEntidadeChipFieldsFromPontoRow(
  row: unknown,
): PontoEntidadeChipFields {
  if (!row || typeof row !== "object") {
    return { entidade_id: null, entidadeNome: null, orixaNome: null };
  }

  const p = row as Record<string, unknown>;
  const entidade_id =
    typeof p.entidade_id === "string" && p.entidade_id.trim()
      ? p.entidade_id.trim()
      : null;

  const entRaw = p.entidades;
  const entRow = Array.isArray(entRaw) ? entRaw[0] : entRaw;

  if (!entRow || typeof entRow !== "object") {
    return { entidade_id, entidadeNome: null, orixaNome: null };
  }

  const ent = buildEntidadeComOrixaFromEmbed(
    entRow as Record<string, unknown>,
  );
  if (!ent) {
    return { entidade_id, entidadeNome: null, orixaNome: null };
  }

  const resolvedLabel = resolveEntidadeLabel(ent);
  const entidadeNome = resolvedLabel.trim() ? resolvedLabel.trim() : null;

  const rawNome = readNome(ent.nome);
  const nestedOrixaNome = readNome(ent.orixas?.nome ?? null);

  let orixaNome: string | null = null;
  if (rawNome && nestedOrixaNome) {
    orixaNome = nestedOrixaNome;
  }

  return {
    entidade_id,
    entidadeNome,
    orixaNome,
  };
}
