/**
 * Fragmento PostgREST reutilizável: `pontos.entidade_id` → entidade + orixá (self-FK).
 * Exige FK `pontos.entidade_id → entidades.id` no Postgres.
 * Incluir na lista de colunas do embed `pontos` (com vírgula antes se necessário).
 */
/**
 * Orixá aninhado **sem** `!entidades_orixa_fkey`: no Supabase/PostgREST, o hint explícito
 * no embed self-`entidades` pode gerar PGRST200 mesmo com a FK correta no Postgres
 * (`entidades_orixa_fkey` em `orixa_id` → `entidades.id`). Com uma única FK self,
 * `orixa:entidades(...)` resolve sem hint.
 */
export const PONTOS_ENTIDADE_ORIXA_EMBED =
  "entidade_id, entidades ( id, nome, linha, orixa:entidades ( id, nome, linha ) )";

/** Embed para `collections_pontos.entidade_id` (FK → `entidades`). */
export const COLLECTIONS_PONTOS_ENTIDADE_EMBED =
  "entidades:entidade_id ( id, nome, linha, orixa:entidades ( id, nome, linha ) )";
