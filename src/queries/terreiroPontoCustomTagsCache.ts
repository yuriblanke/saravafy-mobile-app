/**
 * Patch de cache do mapa de tags customizadas (médiuns) por terreiro.
 *
 * O predicado e os dois updaters viviam duplicados verbatim em
 * `AddMediumTagSheet.tsx` e `RemoveMediumTagSheet.tsx` — quinze linhas idênticas
 * dentro de componentes, o que também os tornava não testáveis sem render.
 *
 * **Correção de premissa (2026-08-10):** o `D4` do backlog descreve estes dois
 * lugares como *update otimista sem rollback*. Não são. Nos dois, a escrita no
 * Supabase é aguardada e o erro é lançado **antes** do patch — se a rede falha, o
 * cache nunca é tocado. Não há janela otimista, e portanto não há o que reverter.
 * Sob a regra do `C3` ("uma forma só: cancel → snapshot → otimista → rollback →
 * invalidate, **ou** nada de otimista") estes call sites já estavam do lado
 * "nada de otimista" — faltava apenas o `invalidate` final, que é o que fecha a
 * divergência entre o que o cliente montou à mão e o que o banco realmente
 * gravou.
 */

export type CustomTagEntry = {
  id: string;
  tagText: string;
  tagTextNormalized: string;
  createdAt: string;
};

export type CustomTagsMap = Record<string, CustomTagEntry[]>;

/**
 * `true` se a chave é um mapa de tags customizadas **deste** terreiro.
 *
 * O quarto elemento da chave é o `pontoIdsHash` do lote; ele é deliberadamente
 * ignorado, porque uma tag gravada precisa aparecer em todos os lotes já em cache
 * daquele terreiro, e não só naquele em que a tela estava.
 */
export function isCustomTagsQueryKeyForTerreiro(
  queryKey: unknown,
  terreiroId: string,
): boolean {
  if (!Array.isArray(queryKey) || queryKey.length < 3) return false;

  return (
    queryKey[0] === "pontos" &&
    queryKey[1] === "customTags" &&
    queryKey[2] === terreiroId
  );
}

function asMap(old: unknown): CustomTagsMap {
  return (old ?? {}) as CustomTagsMap;
}

/**
 * Acrescenta a tag ao ponto.
 *
 * Devolve o mapa anterior **por referência** quando não há mudança (a tag já está
 * lá, comparada por texto normalizado). React Query trata referência igual como
 * "nada mudou" e não notifica observers — é o que evita re-render à toa.
 */
export function addTagToCustomTagsMap(
  old: unknown,
  pontoId: string,
  tag: CustomTagEntry,
): CustomTagsMap {
  const prev = asMap(old);
  const existing = Array.isArray(prev[pontoId]) ? prev[pontoId] : [];

  if (existing.some((t) => t.tagTextNormalized === tag.tagTextNormalized)) {
    return prev;
  }

  return { ...prev, [pontoId]: [...existing, tag] };
}

/**
 * Remove a tag do ponto pelo id.
 *
 * Também devolve o mapa anterior por referência quando não há o que remover. A
 * versão duplicada nos componentes escrevia `[pontoId]: []` mesmo nos lotes que
 * nunca continham aquele ponto, inserindo uma chave vazia num mapa que não deveria
 * tê-la e notificando observers sem motivo.
 */
export function removeTagFromCustomTagsMap(
  old: unknown,
  pontoId: string,
  tagId: string,
): CustomTagsMap {
  const prev = asMap(old);
  const existing = Array.isArray(prev[pontoId]) ? prev[pontoId] : [];

  const next = existing.filter((t) => t.id !== tagId);
  if (next.length === existing.length) return prev;

  return { ...prev, [pontoId]: next };
}
