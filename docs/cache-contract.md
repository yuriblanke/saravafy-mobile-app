# Cache contract

Este documento define o contrato de cache do app (TanStack React Query) para garantir consistência, UX responsiva e invalidations mínimas.

## Objetivos

- Evitar “depender de refetch” para refletir ações do usuário.
- Padronizar mutations com optimistic update + rollback.
- Reduzir invalidations amplas; preferir invalidar apenas o necessário.
- Manter as queryKeys previsíveis e hierárquicas.

## Definições

- **Warm cache (React Query)**: dados já em memória (ou persistidos pelo mecanismo do React Query, se configurado), prontos para render imediato.
- **Persistência local (AsyncStorage)**: dados salvos no dispositivo para sobreviver reinícios do app; não é “cache” no sentido de RU/latência do backend.

## Query keys (padrão)

Regras:

- Use uma raiz estável por domínio (ex.: `collections`, `me`, `terreiros`).
- Para queries com variantes (ex.: filtro/escopo), use:
  - uma key “variant” (inclui params), e
  - uma key “prefix” (sem params) para invalidar/patch múltiplas variantes.

Exemplo (conceitual):

- `queryKeys.collections.accountable(userId)`
- `queryKeys.collections.editableByUser({ userId, terreiroIdsHash })`
- `queryKeys.collections.editableByUserPrefix(userId)` (prefix)
- `queryKeys.collections.byId(collectionId)`

## Mutations (template padrão)

Para qualquer mutation relevante, seguir este template:

1. `onMutate`

- Cancelar queries relacionadas (`cancelQueries`).
- Snapshot do estado atual (`snapshotQueries`).
- Aplicar optimistic update via `setQueriesDataSafe` (preferindo patch mínimo).

2. `onError`

- Rollback do snapshot (`rollbackQueries`).
- Exibir feedback (toast/erro de UI) com mensagem segura.

3. `onSuccess`

- Reconciliar IDs temporários (se houver) e/ou ajustar dados finais.

4. `onSettled`

- Invalidar o mínimo necessário (preferir prefix keys e/ou byId), para garantir consistência com o backend.

### Helpers padrão

- `src/queries/mutationUtils.ts`
  - `cancelQueries(queryClient, filters)`
  - `snapshotQueries(queryClient, filters)`
  - `rollbackQueries(queryClient, snapshot)`
  - `setQueriesDataSafe(queryClient, filter, updater)`
  - List helpers: `upsertById`, `patchById`, `removeById`, `replaceId`
  - `makeTempId(prefix)`

## Regras por domínio (inicial)

### Collections

- **Create collection**

  - Optimistic: inserir coleção com `tempId` nas listas (`accountable` e `editableByUserPrefix`).
  - Success: `replaceId(tempId → realId)`.
  - Settled: invalidar apenas keys user-scoped (`accountable`, `editableByUserPrefix`).

- **Add ponto to collection**
  - Optimistic: atualizar `updated_at` da coleção em listas e em `byId` (se existir).
  - Settled: invalidar apenas `accountable`, `editableByUserPrefix` e `byId(collectionId)`.

## TODOs

- Consolidar domínios que ainda usam fetch direto fora do React Query quando existir query equivalente.
- Mapear e documentar todos os prefix keys e suas invalidações mínimas.
