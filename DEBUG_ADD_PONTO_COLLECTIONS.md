# DEBUG — “Adicionar ponto → escolher coleção” abre vazio na 1ª vez (pós-login)

## Objetivo

Documentar e instrumentar (DEV-only) o bug de timing onde, após login, na **primeira** abertura do fluxo **“Adicionar à coleção”** a lista de coleções aparece vazia, mas “se corrige” depois de navegar/trocar de tela.

**Escopo desta entrega:** apenas diagnóstico (logs + hipóteses). **Sem correção funcional**, sem novas queries/backends, sem mudanças de regra de produto.

---

## Sintoma

- Após login, abrir **Home → “Adicionar à coleção”**.
- A lista de coleções (writable) vem vazia (mostra empty-state).
- Depois de navegar para outra tela e voltar, ou repetir a ação mais tarde, a lista aparece corretamente.

O comportamento sugere **corrida entre boot/auth/prefs e a query global de coleções**, ou cache retornando vazio na primeira renderização.

---

## Onde acontece (código)

- UI / BottomSheet do seletor: `src/screens/Home/Home.tsx`
- Query global de coleções: `src/queries/collections.ts`
- Prefetch no boot: `app/_layout.tsx`
- Auth state transitions: `contexts/AuthContext.tsx`

O fluxo de dados (alto nível):

1. `AuthContext` define `user`/`userId` após `getSession()` e/ou `onAuthStateChange`.
2. No boot (`app/_layout.tsx`), quando `user.id` está disponível, chama `prefetchAccountableCollections()` (React Query) para aquecer cache.
3. Em `Home`, o hook `useAccountableCollections(userId)` roda com `enabled: !!userId`.
4. A lista exibida é derivada de:
   - `allCollections` (query)
   - `filteredCollections` (por `activeContext`)
   - `writableCollections` (por role: dona / admin/editor)

---

## Instrumentação adicionada (DEV-only)

### Auth

- `[Auth] getSession ok` — confirma sessão inicial + `userId`.
- `[Auth] onAuthStateChange` — evento e `userId`.

### Boot prefetch

- `[Boot] prefetch accountable collections start` — quando o prefetch começa.
- `[Boot] prefetch accountable collections done` — quando termina + `cachedCount`.

### Query de coleções

- `[Collections] fetchAccountableCollections start|ok|error` — timing e quantidade de itens retornados.

### Home / BottomSheet

- `[AddToCollectionDebug] collections query state` — mudanças de status/fetch + `dataCount`.
- `[AddToCollectionDebug] derived collections` — contagens `all/filtered/writable` + estado de role (activeContext e terreirosAdmin).
- `[AddToCollectionDebug] open sheet` — snapshot no clique do botão “Adicionar à coleção”.
- `[AddToCollectionDebug] sheet visible` — snapshot quando o sheet realmente fica visível.
- `[AddToCollectionDebug] close sheet` — snapshot no fechamento.

---

## Como usar os logs (checklist)

Reproduzir em DEV (com console aberto) e observar a ordem:

1. Aparece `[Auth] onAuthStateChange` com `userId`?
2. Aparece `[Boot] prefetch ... start` logo após `userId`?
3. Aparece `[Collections] fetch... start` e depois `ok` com `count > 0`?
4. Ao clicar “Adicionar à coleção”, o log `[AddToCollectionDebug] open sheet` mostra:
   - `query.status` / `fetchStatus`
   - `dataCount` (quantas coleções já estavam no cache)
5. Quando o sheet fica visível (`sheet visible`), `allCount/filteredCount/writableCount` ainda estão 0?
6. No momento em que “se corrige”, qual foi o evento imediatamente anterior?
   - um novo `[Collections] fetch... ok`?
   - um `invalidateQueries`?
   - mudança de `activeContext`?

---

## Interpretação (o que cada cenário sugere)

### Cenário A — `Boot prefetch` não roda antes do primeiro clique

- `[Auth] ... userId` acontece, mas `[Boot] prefetch ... start` demora ou não aparece.
- Na abertura do sheet, `query.status` está `pending`/`loading` e `dataCount=0`.

Sugere:

- O usuário consegue abrir o sheet antes do prefetch acontecer.
- Ou o efeito do prefetch foi “latchado” tarde (ex.: `isLoading` ainda true).

### Cenário B — Prefetch roda, mas cache fica vazio

- `[Boot] ... done` mostra `cachedCount=0`.
- `[Collections] fetch... ok` retorna `count=0`.

Sugere:

- RLS retornando zero (não parece, já que depois aparece).
- Sessão ainda não está efetiva no Supabase client no momento do fetch.
- O fetch está acontecendo com credenciais “não prontas” (timing de auth).

### Cenário C — Query resolve com dados, mas `writableCollections` fica 0

- `allCount > 0`, mas `writableCount=0`.

Sugere:

- Race de role/permissões (ex.: `terreirosAdmin` ainda não carregou e `activeContext.role` está vazio).
- `activeContext` ainda não está no perfil esperado.

### Cenário D — “Corrige” após navegação

- Após mudar de tela/voltar, aparecem logs de `fetch... ok` (refetch) ou `derived collections` muda.

Sugere:

- invalidation/refetch disparado indiretamente.
- ou `activeContext`/prefs só estabiliza após a navegação.

---

## Hipóteses prováveis (sem corrigir aqui)

1. **Timing de sessão no Supabase vs primeira query**: a query roda antes do client estar com a sessão efetiva.
2. **Cache global com queryKey fixa**: `queryKeys.collections.accountable()` não inclui `userId`, então o cache pode ficar “preso” em um estado anterior (ex.: vazio) até um refetch.
3. **Boot prefetch concorrendo com a primeira abertura do sheet**: a UI abre antes do prefetch completar.
4. **Dependência em roles (terreirosAdmin / activeContext.role)**: `writableCollections` pode ficar vazio até roles carregarem.

---

## Próximos passos sugeridos (para quando formos corrigir)

(Não implementar agora.)

- Decidir se a queryKey de `accountableCollections` deve incluir `userId` (para isolar cache por sessão).
- Garantir invalidation/refetch no momento exato de transição de auth (login/logout).
- Se a intenção for “não piscar loading”, considerar um estado intermediário explícito (ex.: mostrar “Carregando coleções…” quando `dataCount=0` e `isFetching=true`) — _apenas se UX permitir_.
- Se `writableCollections` depende de role, discutir estratégia:
  - carregar roles antes de permitir abrir o fluxo,
  - ou usar permissões server-side para derivar “writable” diretamente.

---

## Referências de logs

- Auth: `[Auth] ...`
- Boot: `[Boot] ...`
- Fetch: `[Collections] ...`
- Home/Sheet: `[AddToCollectionDebug] ...`
