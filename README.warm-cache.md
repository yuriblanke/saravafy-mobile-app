# Warm cache (Saravafy)

Este documento descreve **factualmente**, a partir do código atual, o que este app “aquece” (warm cache) para acelerar UX e manter permissões/visibilidade consistentes.

> Definição usada aqui: “warm cache” = qualquer computação/fetch feito **antes** da tela precisar (prefetch), ou qualquer cache mantido/atualizado para evitar _loading flashes_ e reduzir refetches (React Query + caches em memória + AsyncStorage).

---

## 1) Onde o warm cache é disparado

### 1.1 Boot (cold start)

Disparo: Root layout, uma vez por boot e, para o plano de prefetch, **uma vez por `userId` por sessão**.

- Arquivo: `app/_layout.tsx`
- **Warm remote config** (1x por boot): chama `warmRemoteConfig()` em `useEffect`.
  - Fonte/código: `src/config/remoteConfig.ts`
- **Boot navigation** (decide tela inicial): `bootstrapStartPage(userId)` (PreferencesContext) roda quando `AuthContext` e `PreferencesContext` estão prontos.
  - Fonte/código: `contexts/PreferencesContext.tsx`
  - Particularidade: existe fallback offline via snapshot em AsyncStorage (detalhado em 2.2).
- **Boot prefetch plan** (warm React Query) roda após `bootComplete` e sessão disponível (`userId`):
  1. `prefetchHomeFeedPontos(queryClient,{ userId, limit: 10 })`
  2. `prefetchExploreTerreiros(queryClient,{ limit: 10 })`
  3. `prefetchEditableTerreiroIds(queryClient, userId)`
     3b) `prefetchMyTerreiroAccessIds(queryClient, userId)`
     3c) Para cada `terreiroId` com acesso: `prefetchCollectionsByTerreiro(queryClient,{ terreiroId })`
  4. `prefetchMyEditableTerreiros(queryClient,{ userId, editableTerreiroIds })`
  5. `prefetchEditableCollections(queryClient,{ userId, editableTerreiroIds })`

Observação importante (factual): algumas dessas queries têm prefetch definido, mas **não foram encontradas telas/hooks consumindo esses caches** (ver 2.1 “Consumidores”).

### 1.2 Logout cleanup (evita “leak” de cache entre usuários)

- Arquivo: `app/_layout.tsx`
- Ao detectar logout (`prevUserId` -> sem `userId`):
  - `queryClient.cancelQueries({ predicate: q => q.queryKey.includes(prevUserId) })`
  - `queryClient.removeQueries({ predicate: q => q.queryKey.includes(prevUserId) })`
  - Limpa snapshot de start page (preferência local) para evitar “leak” entre usuários.

### 1.3 Aceitar/rejeitar convite (recalcula permissões/visibilidade)

- Arquivo: `src/components/InviteGate.tsx`
- Ao **aceitar** (`accept_terreiro_invite` RPC):
  - Chama `fetchTerreirosQueAdministro(userId)` (PreferencesContext) com o objetivo explícito de “recalcular warm cache” de permissões/terreiros.
  - Invalida um lote de queries (React Query) para re-hidratar listas/roles.
- Ao **rejeitar** (`reject_terreiro_invite` RPC):
  - Invalida um subset relacionado a listas/roles.

### 1.4 Criar/editar terreiro (patch + invalidações)

- Arquivo: `src/screens/TerreiroEditor/TerreiroEditor.tsx`
- Após create/update:
  - `applyTerreiroPatch(...)` (PreferencesContext) atualiza listas locais/estado ativo.
  - `patchTerreiroInLists(queryClient, ...)` faz `setQueryData` em listas React Query.
  - `invalidateTerreiro(...)` e `invalidateTerreiroListsForRoles(...)` (helpers) forçam refetch em background.
  - `fetchTerreirosQueAdministro(userId)` é chamado em background.

### 1.5 Realtime (invalidação de caches em background)

- Arquivo: `src/components/TerreirosRealtimeSync.tsx` (global)
  - Ao montar com `userId`, chama `prefetchMyTerreiroAccessIds(...)` para filtrar eventos e evitar “refetch spam”.
- Arquivo: `src/hooks/useRealtimeTerreiroScope.ts` (escopo do terreiro ativo)
  - Monta canais Realtime por `scopeTerreiroId` e invalida caches relacionados a `pontos`, `collections` e `terreiro_members`.

---

## 2) Inventário: o que é aquecido (e o que é “calculado”)

### 2.1 React Query (TanStack Query)

#### Config global do QueryClient

- Arquivo: `app/_layout.tsx`
- `defaultOptions.queries`:
  - `refetchOnWindowFocus: false`
  - `retry: 1`

#### Queries aquecidas no boot (prefetch/fetchQuery)

Abaixo, **o que é calculado** ao aquecer: queryKey → queryFn → Supabase (tabela/RPC) → política de cache.

1. `queryKeys.pontos.feed(userId)`

- Código: `src/queries/pontosFeed.ts`
- `prefetchHomeFeedPontos(...)` → `fetchHomeFeedPontos({ userId, limit })`
- Supabase:
  - `from("pontos")`
  - `select("id,title,lyrics,tags")`
  - filtros: `is_active=true`, `restricted=false`
  - ordenação por `updated_at desc`
  - `limit(limit)`
- Cache:
  - hook (`useHomeFeedPontos`): `staleTime: 5 min`, `gcTime: 30 min`
  - prefetch: usa `prefetchQuery` com `staleTime: 5 min`
- Consumidores encontrados:
  - Nenhum uso de `useHomeFeedPontos(...)` foi encontrado no código atual (apenas a definição e o prefetch no boot).

2. `queryKeys.terreiros.exploreInitial()`

- Código: `src/queries/terreirosExplore.ts`
- `prefetchExploreTerreiros(...)` → `fetchExploreTerreiros(limit)`
- Supabase:
  - `from("terreiros")`
  - `select("id,title,cover_image_url")` com fallback para schemas legados
  - `limit(limit)`
- Cache:
  - hook: `staleTime: 5 min`, `gcTime: 30 min`
- Consumidores encontrados:
  - Nenhum uso de `useExploreTerreiros(...)` foi encontrado (apenas definição e prefetch no boot).

3. `queryKeys.terreiros.editableByUser(userId)` (IDs de terreiros editáveis)

- Código: `src/queries/collections.ts`
- `prefetchEditableTerreiroIds(...)` / `useEditableTerreiroIds(...)` → `fetchEditableTerreiroIds(userId)`
- Supabase:
  - `from("terreiro_members")`
  - `select("terreiro_id, status")` (com fallback se a coluna `status` não existir)
  - filtros: `user_id = userId`, `role in (admin, editor)`, `status = active` (quando disponível)
- Cache:
  - hook: `staleTime: 5 min`, `gcTime: 30 min`
  - prefetch: `fetchQuery` com `staleTime: 5 min`
- Consumidores encontrados:
  - Usado indiretamente por `useEditableCollections(...)` (abaixo).

4. `queryKeys.me.terreiroAccessIds(userId)` (IDs de terreiros com acesso)

- Código: `src/queries/me.ts`
- `prefetchMyTerreiroAccessIds(...)` / `useMyTerreiroAccessIdsQuery(...)`
- Supabase:
  - `from("terreiro_members")`
  - `select("terreiro_id, status")` (fallback se `status` não existir)
  - filtros: `user_id = userId`, `role in (admin, editor, member)`, `status = active` (quando disponível)
- Cache:
  - hook: `staleTime: 60 s` (gcTime não definido explicitamente)
  - prefetch: `fetchQuery` com `staleTime: 60 s`
- Consumidores encontrados:
  - Usado por `TerreirosRealtimeSync` para filtrar eventos.
  - Não foi encontrado uso direto de `useMyTerreiroAccessIdsQuery(...)` em telas.

5. `queryKeys.terreiros.collectionsByTerreiro(terreiroId)`

- Código: `src/queries/terreirosCollections.ts`
- `prefetchCollectionsByTerreiro(...)` / `useCollectionsByTerreiroQuery(...)` → `fetchCollectionsByTerreiro(terreiroId)`
- Supabase:
  - `from("collections")`
  - `select("id,title,description,visibility,owner_terreiro_id")` (fallback sem `description`)
  - filtro: `owner_terreiro_id = terreiroId`
  - ordenação por `updated_at desc`
- Cache:
  - hook: `staleTime: 60 s`, `gcTime: 30 min`
  - prefetch: `fetchQuery` com `staleTime: 60 s`
- Consumidores encontrados:
  - Nenhum uso de `useCollectionsByTerreiroQuery(...)` foi encontrado (apenas definição e prefetch no boot).
  - Observação: a tela do terreiro usa **outra fonte** (fetch direto sem React Query), ver 2.3.

6. `queryKeys.me.editableTerreiros(userId)` (dados mínimos de terreiros editáveis para o sheet)

- Código: `src/queries/me.ts`
- `prefetchMyEditableTerreiros(...)` / `useMyEditableTerreirosQuery(...)` → `fetchMyEditableTerreiros({ userId, editableTerreiroIds? })`
- Supabase:
  - `terreiro_members` para roles `admin/editor` (com `status=active` quando existe)
  - depois `terreiros` para `id,title,cover_image_url` (fallback sem `cover_image_url`)
- Cache:
  - hook: `staleTime: 60 s` (gcTime não definido explicitamente)
  - prefetch: `fetchQuery` com `staleTime: 60 s` e, se `editableTerreiroIds` vazio, faz `setQueryData([])`
- Consumidores encontrados:
  - `src/components/AppHeaderWithPreferences.tsx` usa `useMyEditableTerreirosQuery(userId)`.

7. `queryKeys.collections.editableByUser({ userId, terreiroIdsHash })`

- Código: `src/queries/collections.ts`
- `prefetchEditableCollections(...)` / `useEditableCollections(userId)` → `fetchEditableCollections({ userId, editableTerreiroIds })`
- Supabase:
  - `from("collections")` com join `terreiros:owner_terreiro_id (title)`
  - se `editableTerreiroIds` vazio: filtra `owner_user_id = userId`
  - senão: faz `or(owner_user_id.eq.userId, owner_terreiro_id.in.(...))`
  - ordenação por `updated_at desc`
- Cache:
  - hook: `staleTime: 5 min`, `gcTime: 30 min`
  - prefetch: `prefetchQuery` com `staleTime: 5 min`
- Consumidores encontrados:
  - `src/screens/Home/Home.tsx` usa `useEditableCollections(userId)` para o BottomSheet “Adicionar à coleção”.

#### Queries que são invalidadas/patchadas, mas não são aquecidas no boot

Aquecimento aqui acontece de forma “reativa”: `setQueryData` (patch) e `invalidateQueries` (refetch em background).

- `queryKeys.terreiros.withRole(userId)`

  - Código: `src/queries/terreirosWithRole.ts`
  - Consumidor: `src/screens/Terreiros/Terreiros.tsx`
  - Patch: `src/queries/terreirosCache.ts` (`patchTerreiroInLists`)
  - Invalidação: `invalidateTerreiroListsForRoles` e `TerreirosRealtimeSync`

- `queryKeys.collections.accountable(userId)`

  - Código: `src/queries/collections.ts` (`useAccountableCollections` / `fetchAccountableCollections`)
  - Invalidações encontradas: `src/screens/Home/Home.tsx`, `src/components/InviteGate.tsx`
  - Observação factual: não foi encontrado uso de `useAccountableCollections(...)` em telas.

- `queryKeys.collections.editableByUserPrefix(userId)`
  - Definição: `src/queries/queryKeys.ts`
  - Uso: usada como “prefix” para invalidar **todas** as variantes de `editableByUser` (que incluem `terreiroIdsHash`).

#### QueryKeys definidos que parecem não ter implementação (fetch)

- `queryKeys.me.membership(userId)`
- `queryKeys.me.permissions(userId)`

Factual: no código atual, essas keys aparecem em `queryKeys.ts` e em `invalidateQueries(...)` (InviteGate + realtime scope), mas **não foi encontrado nenhum `useQuery`/`fetchQuery`/`prefetchQuery` que preencha esses caches**.

### 2.2 PreferencesContext + AsyncStorage (warm/hydrate no boot)

- Arquivo: `contexts/PreferencesContext.tsx`

#### Start page preference (backend) + snapshot offline

O que é “calculado” no boot:

- Online:
  - `fetchStartPageFromBackend(userId)` lê `profiles.primary_terreiro_id`.
  - Se existir, valida acesso com `validateTerreiroAccess(terreiroId)` (consulta `terreiros` para campos mínimos).
  - Busca role com `fetchTerreiroRole(userId, terreiroId)` (consulta `terreiro_members.role`).
  - Persiste snapshot em AsyncStorage (`@saravafy:startPageSnapshot`).
- Offline (erro “network-ish”):
  - `readStartPageSnapshot()` lê snapshot do AsyncStorage e pode iniciar em `/terreiro` com `usedOfflineSnapshot: true`.

#### Preferências locais (persistidas)

Também são carregadas no boot do provider:

- `themeMode` (AsyncStorage `@saravafy:themeMode`)
- `curimbaEnabled` e `curimbaOnboardingDismissed` (inclui migração de chaves legadas)

### 2.3 Caches locais fora do React Query

#### Remote config (AsyncStorage com TTL)

- Arquivo: `src/config/remoteConfig.ts`
- `warmRemoteConfig()` chama `getAppInstallUrl()` e guarda em AsyncStorage com TTL (~6h).
- Fonte Supabase: `public_app_config` com key `app_install_url`.

#### InviteGate (cache em memória + throttle)

- Arquivo: `src/components/InviteGate.tsx`
- Convites pendentes são mantidos em estado local do componente.
- Há uma janela de “cache/throttle” (~12s) para evitar chamadas repetidas durante boot/foreground.
- Factual: **não usa React Query** para invites.

#### Tela do Terreiro (fetch direto sem React Query)

- Arquivo: `src/screens/Terreiro/Terreiro.tsx` chama `fetchCollectionsDoTerreiro(terreiroId)`
- Implementação: `src/screens/Terreiro/data/collections.ts`
- Supabase:
  - `collections` por `owner_terreiro_id`
  - contagem de pontos via `collections_pontos` (client-side count)
- Observação importante:
  - Isso é **separado** do cache `queryKeys.terreiros.collectionsByTerreiro(terreiroId)` (React Query), que é prefetched no boot mas não é consumido por esta tela.

---

## 3) Realtime que afeta o warm cache

### 3.1 `TerreirosRealtimeSync` (global)

- Arquivo: `src/components/TerreirosRealtimeSync.tsx`
- Objetivo: manter listas/roles coerentes com eventos Realtime sem “spammar” refetch.
- Estratégia:
  - Warm: `prefetchMyTerreiroAccessIds(queryClient, userId)`.
  - Ao receber evento em `terreiros` / `terreiros_contatos`:
    - Se o evento não foi do próprio usuário, refaz `prefetchMyTerreiroAccessIds(...)` e só invalida se `terreiroId` está no conjunto de acesso.
  - Invalida/atualiza usando helpers:
    - `invalidateTerreiro(queryClient, terreiroId)`
    - `invalidateTerreiroListsForRoles(queryClient, userId)`

### 3.2 `useRealtimeTerreiroScope` (escopo do terreiro ativo)

- Arquivo: `src/hooks/useRealtimeTerreiroScope.ts`
- Canais por `scopeTerreiroId`:
  - `pontos` (INSERT): invalida `queryKeys.pontos.terreiro(scopeTerreiroId)` quando o `owner_terreiro_id` bate.
  - `collections` (\*): invalida `queryKeys.collections.terreiro(scopeTerreiroId)` e `queryKeys.collections.available(...)` conforme owner/escopo.
  - `collections_pontos` (\*): invalida `queryKeys.collections.byId(collectionId)` + listas relacionadas do terreiro + `available`.
  - `terreiro_members` (\*): se o `terreiroId` está em `myTerreiroIds`, invalida `queryKeys.me.terreiros(userId)` e também `queryKeys.me.membership/permissions` (mesmo que não exista implementação de fetch hoje).

---

## 4) Dependências de permissão/roles (como elas entram no warm cache)

- Roles lidas de `terreiro_members.role` controlam quais terreiros entram em:
  - **editável**: roles `admin/editor` (`fetchEditableTerreiroIds`, `fetchMyEditableTerreiros`)
  - **acesso**: roles `admin/editor/member` (`prefetchMyTerreiroAccessIds`)
- A coluna `terreiro_members.status` é usada como filtro `status=active` quando existe; há fallback quando não existe (schema legado).
- Aceitar convite (`accept_terreiro_invite`) força recálculo via:
  - `fetchTerreirosQueAdministro(userId)` (PreferencesContext) + invalidações em lote.

---

## 5) Pontos de melhoria (sem implementar)

---

## Apêndice A) Helpers de cache (setQueryData / invalidate / refetch)

Esta seção lista os pontos “mecânicos” que mexem no cache do React Query (além de prefetch).

### A.1 `patchTerreiroInLists` (atualização local via `setQueryData`)

- Arquivo: `src/queries/terreirosCache.ts`
- Uso encontrado em: `src/screens/TerreiroEditor/TerreiroEditor.tsx`
- Efeito: faz patch em listas já carregadas para refletir create/update de terreiro sem esperar refetch.
- QueryKeys atualizados (quando presentes no cache):
  - `queryKeys.terreiros.withRole(userId)`
  - `queryKeys.me.editableTerreiros(userId)`

### A.2 `invalidateTerreiro` (invalidação focada por terreiro)

- Arquivo: `src/queries/terreirosCache.ts`
- Efeito: invalida caches diretamente relacionados ao `terreiroId`:
  - `queryKeys.terreiros.byId(terreiroId)`
  - `queryKeys.terreiros.collectionsByTerreiro(terreiroId)`

### A.3 `invalidateTerreiroListsForRoles` (invalidação “em lote” por usuário)

- Arquivo: `src/queries/terreirosCache.ts`
- Uso típico: após eventos que mudam role/visibilidade (realtime, aceitar convite, criar/editar terreiro).
- Efeito: invalida listas derivadas de membership/roles:
  - `queryKeys.terreiros.withRole(userId)`
  - `queryKeys.me.terreiroAccessIds(userId)`
  - `queryKeys.me.terreiros(userId)`
  - `queryKeys.me.editableTerreiros(userId)`
  - `queryKeys.me.permissions(userId)` (observação: não há implementação de fetch encontrada)

### A.4 `refetchQueries` explícito

- Arquivo: `src/screens/TerreiroEditor/TerreiroEditor.tsx`
- Após criar terreiro, além de invalidar, chama `queryClient.refetchQueries({ queryKey: queryKeys.terreiros.withRole(userId), type: "all" })` para forçar atualização imediata da lista.

1. Remover ou ligar “warm caches sem consumidor”

- Hoje há prefetches de queries sem uso encontrado (`pontos.feed`, `terreiros.exploreInitial`, `terreiros.collectionsByTerreiro`, `me.terreiroAccessIds` via hook). Ou conectar telas aos hooks (se for o plano) ou remover prefetch para reduzir custo no boot.

2. Unificar fontes de dados de coleções do terreiro

- A tela do terreiro usa fetch direto (`src/screens/Terreiro/data/collections.ts`) enquanto existe uma query React Query equivalente (`src/queries/terreirosCollections.ts`). Unificar evitaria inconsistência e aproveitaria o prefetch.

3. Implementar (ou remover) `me.membership` e `me.permissions`

- Hoje são invalidadas por realtime/InviteGate mas não existe `queryFn` que preencha esses caches. Isso dificulta “recalcular warm cache” com previsibilidade.

4. Revisar invalidations que parecem “órfãs”

- `collections.accountable(userId)` é invalidada, mas não há uso do hook em telas; pode ser legado ou pré-trabalho.
