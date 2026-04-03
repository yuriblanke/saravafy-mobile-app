/**
 * Fragmento PostgREST reutilizável: `pontos.entidade_id` → entidade + orixá (self-FK).
 * Incluir na lista de colunas do embed `pontos` (com vírgula antes se necessário).
 */
export const PONTOS_ENTIDADE_ORIXA_EMBED =
  "entidade_id, entidades ( id, nome, linha, orixa:entidades!entidades_orixa_fkey ( id, nome, linha ) )";
