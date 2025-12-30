# Roles (papéis) de usuário em relação a Terreiro — mapeamento (frontend + scripts do repo)

Este documento consolida, **sem suposições**, todos os valores de `role` que aparecem no **frontend** (TypeScript/React Native) e nos **scripts SQL versionados** neste repositório, e descreve onde cada um impacta:

- visibilidade/leitura de conteúdo
- permissões de edição
- UX (quais telas/listas exibem ou “normalizam” o role)
- participação em warm cache/prefetch (React Query)

> Escopo: este mapeamento descreve **o que o frontend faz** (checks, filtros de query, UI gating) e **o que os scripts SQL no repo definem**.
> Ele **não afirma** o comportamento do backend em produção além do que está explícito nos scripts.

## Vocabulário de roles encontrado

### Strings de role que aparecem no frontend

- `"admin"`
- `"editor"`
- `"member"`
- `"follower"`

### Tipos/unions que definem “domínios” diferentes

1. **Preferências / listas / navegação**

- `TerreiroRole = "admin" | "editor" | "member" | "follower"` em [contexts/PreferencesContext.tsx](contexts/PreferencesContext.tsx)
- Usado em tipos/estruturas locais e em algumas listas do app. Não existe mais “troca de perfil” nem role vindo de “contexto ativo”.

2. **Membership/Convites/Requests (acesso “membro”)**

- `TerreiroAccessRole = "admin" | "editor" | "member"` em [src/hooks/terreiroMembership.ts](src/hooks/terreiroMembership.ts)
- `InviteRole = "admin" | "editor" | "member"` em [src/components/InviteGate.tsx](src/components/InviteGate.tsx)

3. **Editor de Terreiro (administração)**

- `TerreiroRole = "admin" | "editor"` local em [src/screens/TerreiroEditor/TerreiroEditor.tsx](src/screens/TerreiroEditor/TerreiroEditor.tsx)

➡️ Consequência: hoje o app tem **dois domínios de role** relevantes ("admin/editor/follower" vs "admin/editor/member"), com impactos na UX e em “normalizações” (ver seção “Ambiguidades”).

## Tabela — capacidades por role (sem inferir RLS)

Interpretação desta tabela:

- **SIM/NÃO** aqui significa: _há ou não há lógica explícita no frontend_ que concede/bloqueia a capacidade com base naquele role.
- Quando o frontend **não** decide, a célula registra **NÃO (depende de RLS)**.

| Role         | Leitura de terreiro “privado”                                                                    | Leitura de coleções do terreiro                                                                                                                                                                                                                                                                             | Edição de coleções do terreiro                                                                                     | Edição de pontos                           | Adicionar ponto em coleção do terreiro                                                                                 | Presença em UI                                                                                                                                                                                                                                  | Warm cache / prefetch                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **admin**    | **NÃO (depende de RLS)** — telas buscam `terreiros`/`collections` sem checagem de role no client | **NÃO (depende de RLS)** para a lista de coleções do terreiro (fetch por `owner_terreiro_id`)                                                                                                                                                                                                               | **SIM** — `canEdit = role === "admin"                                                                              |                                            | "editor"` em [src/screens/Terreiro/Terreiro.tsx](src/screens/Terreiro/Terreiro.tsx)                                    | **NÃO (não há gating por role no client)** — envio de ponto é “curadoria”/login em [src/components/SubmitPontoModal.tsx](src/components/SubmitPontoModal.tsx)                                                                                   | **SIM** — coleções “editáveis” incluem coleções do terreiro somente se `terreiro_members.role in (admin, editor)` em [src/queries/collections.ts](src/queries/collections.ts)        | **SIM** — aparece como “Minhas páginas” (Preferências) via [src/queries/me.ts](src/queries/me.ts) + [src/components/AppHeaderWithPreferences.tsx](src/components/AppHeaderWithPreferences.tsx) | **SIM** — boot prefetch aquece admin/editor: [app/\_layout.tsx](app/_layout.tsx) passos 3–5 |
| **editor**   | **NÃO (depende de RLS)**                                                                         | **NÃO (depende de RLS)** para lista de coleções do terreiro                                                                                                                                                                                                                                                 | **SIM** — mesmo `canEdit` (admin/editor) em [src/screens/Terreiro/Terreiro.tsx](src/screens/Terreiro/Terreiro.tsx) | **NÃO (não há gating por role no client)** | **SIM** — mesmo pipeline “editáveis” (admin/editor) em [src/queries/collections.ts](src/queries/collections.ts)        | **SIM** — aparece em “Minhas páginas” (Preferências) como role do terreiro (admin/editor)                                                                                                                                                       | **SIM** — boot prefetch aquece admin/editor                                                                                                                                          |
| **member**   | **NÃO (depende de RLS)**                                                                         | **SIM (apenas para coleções `visibility=members`)** — para carregar pontos de uma coleção members-only, exige membership ativa (admin/editor/member) em [src/screens/Collection/Collection.tsx](src/screens/Collection/Collection.tsx) + [src/hooks/terreiroMembership.ts](src/hooks/terreiroMembership.ts) | **NÃO** — não passa no `canEdit` (só admin/editor) e não entra em `fetchEditableTerreiroIds` (filtra admin/editor) | **NÃO (não há gating por role no client)** | **NÃO** — não entra em coleções “editáveis” (admin/editor) em [src/queries/collections.ts](src/queries/collections.ts) | **SIM** — role é preservado na Aba Terreiros (não colapsa para follower); InviteGate e hooks de membership                                                                                                                                      | **SIM (read-side)** — participa de `prefetchMyTerreiroAccessIds` + `prefetchCollectionsByTerreiro` (coleções por terreiro); **não** participa do prefetch “editáveis” (admin/editor) |
| **follower** | **NÃO (depende de RLS)**                                                                         | **NÃO (depende de RLS)**                                                                                                                                                                                                                                                                                    | **NÃO** — não passa no `canEdit` (só admin/editor)                                                                 | **NÃO (não há gating por role no client)** | **NÃO** — não entra em coleções “editáveis”                                                                            | **SIM** — é usado como default/role não-editável na Aba Terreiros (fallback) em [src/screens/Terreiros/data/terreiros.ts](src/screens/Terreiros/data/terreiros.ts) e [src/screens/Terreiros/Terreiros.tsx](src/screens/Terreiros/Terreiros.tsx) | **NÃO** — não participa do prefetch “editáveis”                                                                                                                                      |

## Onde cada role é usado (por área)

### 1) Preferências / Start Page / Filtro explícito

- Preferências mantém um filtro explícito opcional (`selectedTerreiroFilterId`) para telas globais, sem depender de “perfil ativo”, em [contexts/PreferencesContext.tsx](contexts/PreferencesContext.tsx).
- O sheet de preferências renderiza a usuária logada + seção “Meus terreiros” (Admin), via `useMyEditableTerreirosQuery` em [src/components/AppHeaderWithPreferences.tsx](src/components/AppHeaderWithPreferences.tsx).

### 2) Aba “Terreiros” (lista)

- `fetchTerreirosWithRole(userId)` busca `terreiros` com join em `terreiro_members(role, user_id)` e define role default como `"follower"`.
- Na normalização, **aceita explicitamente** `admin/editor/member/follower` (preserva `member`, não colapsa para `follower`) em [src/screens/Terreiros/data/terreiros.ts](src/screens/Terreiros/data/terreiros.ts).
- Ao abrir um terreiro, a navegação é feita por rota com `terreiroId`/`terreiroTitle` e as permissões são derivadas de membership em [src/screens/Terreiro/Terreiro.tsx](src/screens/Terreiro/Terreiro.tsx).

Observação: a aba Terreiros usa o `role` do item para decisões locais de UI (ex.: preview de coleções), mas **não concede edição** para `member`.

### 3) Tela “Terreiro” (coleções do terreiro)

- A lista de coleções do terreiro é carregada por `fetchCollectionsDoTerreiro(terreiroId)` (query por `owner_terreiro_id`) em [src/screens/Terreiro/data/collections.ts](src/screens/Terreiro/data/collections.ts).
- A capacidade de **editar** coleções nessa tela é definida por membership ativa:
  - `canEdit = isActiveMember && (role === "admin" || role === "editor")` em [src/screens/Terreiro/Terreiro.tsx](src/screens/Terreiro/Terreiro.tsx).

### 4) Coleções “members-only” (acesso por membership)

- Uma coleção pode ter `visibility = "members"` (members-only) em [src/screens/Collection/Collection.tsx](src/screens/Collection/Collection.tsx).
- Para carregar os pontos, a tela exige `membership.data.isActiveMember === true`.
- `isActiveMember` é `true` quando existe uma linha em `terreiro_members` com role em `admin/editor/member` e (quando existe) `status = "active"` em [src/hooks/terreiroMembership.ts](src/hooks/terreiroMembership.ts).

### 5) Convites

- InviteGate reconhece convites com role `admin/editor/member` e aceita/rejeita via RPC em [src/components/InviteGate.tsx](src/components/InviteGate.tsx).
- O script SQL versionado para essas RPCs insere/upserta `terreiro_members.role = v_invite.role` e ativa status quando a coluna existe em [scripts/supabase/2025-12-29_accept_terreiro_invite_rpc.sql](scripts/supabase/2025-12-29_accept_terreiro_invite_rpc.sql).

### 6) Administração do Terreiro (TerreiroEditor)

- O editor de terreiro opera com roles **apenas** `admin/editor` em [src/screens/TerreiroEditor/TerreiroEditor.tsx](src/screens/TerreiroEditor/TerreiroEditor.tsx).
- A tela calcula `nextMyRole` aceitando somente `admin/editor` (qualquer outro vira `null`).
- Convites pendentes (e envio) são carregados **apenas quando admin** (há um `computedIsAdmin` que libera o fetch de invites).

### 7) Realtime scope (assinaturas/invalidations)

- O app mantém uma lista “meus terreiros” (membership ativa quando existe coluna `status`) sem filtrar role em `useMyTerreiroIdsQuery` em [src/queries/me.ts](src/queries/me.ts).
- Esses IDs entram no escopo do realtime via [app/(app)/\_layout.tsx](<app/(app)/_layout.tsx>) + [src/hooks/useRealtimeTerreiroScope.ts](src/hooks/useRealtimeTerreiroScope.ts) (hook não mapeado aqui por não conter domain de role em si).

## Participação em warm cache / prefetch (React Query)

O boot prefetch executa um pipeline pós-login (somente quando há `userId`) em [app/\_layout.tsx](app/_layout.tsx):

1. `prefetchHomeFeedPontos`
2. `prefetchExploreTerreiros`
3. `prefetchEditableTerreiroIds` (**filtra role admin/editor** em `terreiro_members`)
4. `prefetchMyEditableTerreiros` (**admin/editor** → usado no sheet de Preferências)
5. `prefetchEditableCollections` (**depende do 3**, coleções pessoais + coleções de terreiros onde a usuária é admin/editor)
6. `prefetchMyTerreiroAccessIds` (**filtra role admin/editor/member**; tenta `status=active` quando a coluna existe)
7. `prefetchCollectionsByTerreiro` (para cada terreiro dos accessIds; aquece cards de coleções da aba Terreiros)

Conclusão:

- **admin/editor** participam do warm cache específico de “Minhas páginas” e “coleções editáveis”.
- **admin/editor/member** participam do warm cache de **coleções por terreiro** (read-side), para a aba Terreiros renderizar preview imediatamente quando possível.

## Decisões implícitas encontradas (evidência em código)

1. **“Editável” = admin/editor**

- O domínio de “editável” é consistente em:
  - [src/queries/collections.ts](src/queries/collections.ts) (`fetchEditableTerreiroIds` filtra admin/editor)
  - [src/queries/me.ts](src/queries/me.ts) (terreiros do perfil admin/editor)
  - [src/screens/Terreiro/Terreiro.tsx](src/screens/Terreiro/Terreiro.tsx) (`canEdit` só admin/editor)

2. **Acesso “members-only” é um conceito separado de “editável”**

- A tela de coleção members-only usa membership ativa (admin/editor/member), não “follower” (ver [src/screens/Collection/Collection.tsx](src/screens/Collection/Collection.tsx)).

3. **O app normaliza/colapsa roles fora do domínio local**

- A Aba Terreiros aceita apenas `admin/editor/follower` e qualquer outro role vindo do join (ex.: `member`) vira `follower` por default em [src/screens/Terreiros/data/terreiros.ts](src/screens/Terreiros/data/terreiros.ts).
- `fetchTerreiroRole` também descarta valores que não sejam `admin/editor/follower` em [contexts/PreferencesContext.tsx](contexts/PreferencesContext.tsx).

Atualização: a Aba Terreiros passou a preservar `member` (não colapsa para `follower`).

## Ambiguidades ou riscos atuais (sem assumir backend)

1. **Domínio de role inconsistente ("follower" vs "member")**

- O repo contém código que trata `member` como role “real” de membership (hooks + convites), e ao mesmo tempo trata `follower` como role de contexto/lista.
- Se o backend retorna `terreiro_members.role = "member"` no join da Aba Terreiros, o frontend **não preserva** esse role (vira `follower`).

2. **Start page: não carrega role**

- A decisão de start page (home vs terreiro) não depende de role no client; permissões são resolvidas na tela via membership.

3. **RPCs de membership request não estão versionadas em SQL neste repo**

- O frontend chama `approve_terreiro_membership_request` e `reject_terreiro_membership_request` em [src/hooks/terreiroMembership.ts](src/hooks/terreiroMembership.ts), mas não há definição SQL correspondente em `scripts/supabase/` (ao contrário das RPCs de convites).

## Base para decisões futuras (descrição, não implementação)

- Unificar o “domínio” de roles em um único tipo no frontend (ex.: `admin/editor/member/follower`) e decidir explicitamente como mapear cada um em listas e permissões.
- Tornar a normalização explícita: se `member` deve aparecer como “member” na Aba Terreiros, o parser precisa aceitar esse valor.
- Documentar/versão-controlar no repo as RPCs de membership requests, assim como já existe para invites.
