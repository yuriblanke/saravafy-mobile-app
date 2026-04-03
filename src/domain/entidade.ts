/**
 * Entidades canônicas e encadeamento orixá (self-FK em `entidades.orixá_id`).
 * Nomes de coluna no DB seguem o schema; no JS usamos chaves sem acento onde necessário.
 */

export type EntidadeSimples = {
  id: string;
  nome: string;
  linha: string;
  /** Reflete `entidades.orixá_id` no banco. */
  orixa_id: string | null;
};

export type EntidadeComOrixa = EntidadeSimples & {
  /** Entidade referenciada por `orixá_id` (outra linha em `entidades`). */
  orixas: EntidadeSimples | null;
};

export type PontoEntidadeChipFields = {
  entidade_id: string | null;
  entidadeNome: string | null;
  orixaNome: string | null;
};

/**
 * Extrai nomes para chips a partir de uma linha `pontos` com embed `entidades` (+ orixá).
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

  const e = entRow as Record<string, unknown>;
  const entidadeNome =
    typeof e.nome === "string" && e.nome.trim() ? e.nome.trim() : null;

  const orixaEmbed = e.orixa ?? e.orixas ?? e.orixa_entidade;
  const orixaRow = Array.isArray(orixaEmbed) ? orixaEmbed[0] : orixaEmbed;

  let orixaNome: string | null = null;
  if (orixaRow && typeof orixaRow === "object") {
    const ox = orixaRow as Record<string, unknown>;
    if (typeof ox.nome === "string" && ox.nome.trim()) {
      orixaNome = ox.nome.trim();
    }
  }

  return {
    entidade_id,
    entidadeNome,
    orixaNome,
  };
}
