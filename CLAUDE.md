# CLAUDE.md — Saravafy Mobile App

Contexto para sessões de Claude Code neste repositório.

---

## Workspace

Este repo faz parte de um workspace com múltiplos projetos Saravafy:

- `saravafy-mobile-app` ← **este repo**
- `saravafy-backoffice`
- `saravafy-web-app`
- `saravafy-design-tokens`

O pacote `@saravafy/design-tokens` é instalado como dependência GitHub e é a fonte única de verdade para cores, espaçamentos e radii. Não inventar valores; usar sempre os tokens expostos via `src/theme/`.

---

## O que é o Saravafy

Aplicativo mobile para preservação digital de pontos de Umbanda e Candomblé (música de terreiro afro-brasileira). Usuários gravam, revisam, catalogam e reproduzem pontos organizados por terreiro, orixá e entidade.

**Personas principais:** Membro, Curimba (músico), Admin de terreiro, Curador global.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | React Native 0.81.x + Expo SDK 54 |
| Linguagem | TypeScript 5.9 (strict) |
| Roteamento | Expo Router 6 — grupos `(auth)` e `(app)` |
| Estado servidor | TanStack React Query 5.x |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions Deno) |
| Áudio | react-native-track-player 4.1.2 |
| Storage local | AsyncStorage |
| UI tokens | `@saravafy/design-tokens` via `src/theme/` |
| Ícones | Lucide React Native |
| Build | Expo + EAS (dev / preview / production) |

---

## Arquitetura

### Estrutura de pastas (`src/`)

```
api/          # Funções puras de chamada ao Supabase/RPCs
audio/        # Serviço de playback (TrackPlayer)
components/   # Componentes reutilizáveis de UI
config/       # Configurações de ambiente
constants/    # Enums e constantes
contexts/     # AuthContext, NetworkContext, LoginPromptContext
domain/       # Modelos de domínio puro (tipos, enums, lógica de negócio)
features/     # Lógica por feature (ex: identity/)
hooks/        # Custom hooks React
lib/          # Cliente Supabase
offline/      # Suporte offline (network detection, cache de áudio, pacotes)
queries/      # Definições React Query (queryKeys + hooks de query/mutation)
screens/      # Componentes de tela (13 screens)
services/     # Serviços stateless (pontoAudio, search)
theme/        # Facades sobre design-tokens
types/        # Tipos TypeScript globais
utils/        # Funções utilitárias puras
```

### Separação de responsabilidades

- **`queries/`** — hooks React Query que chamam o Supabase diretamente (`lib/supabase`). É a camada de dados remotos principal; é o que os componentes devem usar.
- **`screens/`** — orquestra queries + hooks + UI. Cada tela pode co-localizar código próprio em subpastas (ver convenção abaixo).
- **`components/`** — UI reutilizável cross-screen, sem dependência de queries específicas de domínio.
- **`domain/`** — lógica de negócio pura, sem side effects.
- **`api/`** — atualmente quase não usado (só `pontoAudio.ts`). Não é uma camada intermediária genérica; `queries/` fala com o Supabase direto.

### Convenção de co-localização

Código específico de uma tela vive na pasta da própria tela, não no global:

```
screens/Home/
  Home.tsx
  components/    # componentes só usados por Home
  hooks/         # hooks só usados por Home
  data/          # funções de acesso a dados específicas de Home
```

**Regra de extração:** só vai para `src/hooks/`, `src/components/` ou `src/utils/` o que for genuinamente compartilhado entre 2+ telas. O resto fica co-localizado na tela.

**Regra Supabase:** componentes de tela (`*.tsx`) não devem chamar `supabase` inline (storage/rpc/from). Isso vai para um hook, uma query, ou o `data/` da tela.

### Imports

Alias `@/*` → raiz do repo (configurado em `tsconfig.json`). Ex: `@/src/components/...`, `@/contexts/...`. Preferir alias a caminhos relativos profundos.

---

## Contrato de Cache (React Query)

Documentado em detalhes em `docs/cache-contract.md`. Resumo:

- **Query keys** hierárquicas: `["domínio", "escopo", id]`
- Usar **prefix keys** para invalidar múltiplas variantes de uma vez
- **Template padrão de mutation:**
  1. `onMutate` → cancelar queries + snapshot + optimistic update
  2. `onError` → rollback do snapshot
  3. `onSuccess` → reconciliar IDs temporários
  4. `onSettled` → invalidar o mínimo necessário
- Helpers em `src/queries/mutationUtils.ts`: `cancelQueries`, `snapshotQueries`, `rollbackQueries`, `setQueriesDataSafe`, `upsertById`, `patchById`, `removeById`, `replaceId`, `makeTempId`

---

## Convenções de Código

### Geral

- TypeScript strict sempre; sem `any` implícito
- Sem comentários explicando o que o código faz — nomes descritivos são suficientes
- Comentários apenas para invariantes não óbvios, workarounds ou restrições externas
- Sem features, abstrações ou error handling especulativo — resolver o problema em mãos

### Componentes

- Componentes com mais de ~150 linhas provavelmente precisam ser divididos
- Props com mais de 5-6 parâmetros: avaliar composição ou contexto
- Estilos via `StyleSheet.create()` + tokens do tema; sem values hardcoded de cor/espaçamento
- Lógica de negócio não fica em componentes — vai para hooks ou `queries/`

### Hooks

- Um hook por responsabilidade
- Hooks de mutation seguem o template de cache-contract
- Hooks que wrappam queries ficam em `queries/`; hooks de UI/interação ficam em `hooks/`

### Utils

- Funções utilitárias puras ficam em `src/utils/`
- Sem duplicação — antes de criar um utilitário, verificar se já existe
- Utilitários de formatação (phone, email, initials, timeAgo) ficam centralizados

---

## Estado da Refatoração

Ver plano detalhado em `docs/plans/refactoring-plan.md`.

**Já feito:**
- Navegação unificada em `(app)` com `router.back()` nativo
- Migração para arquitetura `ponto_versoes` (versões de pontos)
- Suporte a variações e entidades (orixá/entidade nos chips)
- Remoção de dead code (Terreiro.tsx, modais não usados, boilerplate)
- Suporte offline básico (NetworkContext, LoginPromptContext, cache de áudio)
- Patch RNTP 4.1.2 para Kotlin nullability

**Em andamento / falta:**
- Extrair utilitários duplicados para `src/utils/`
- Quebrar componentes gigantes (TabsHeaderWithPreferences 3164 linhas, TerreiroEditor 2906 linhas)
- Tirar chamadas inline ao Supabase dos componentes de tela (mover para query/hook/data)
- Quebrar os dois gigantes não-tela: `api/pontoAudio.ts` (1425 linhas) e `hooks/terreiroMembership.ts` (1250 linhas)
- Criar hooks faltantes, co-localizados na tela quando específicos

---

## Builds e Ambientes

```bash
npm run start:dev          # Metro bundler (dev)
npm run android:dev        # Build Android local (dev)
npm run eas:dev            # EAS development client
npm run eas:preview        # EAS preview
npm run eas:prod           # EAS production
```

Variantes: `dev` (nome "Saravafy Dev"), `preview`, `production` (nome "Saravafy").  
Config em `app.config.ts`. Pipelines em `eas.json`.

---

## Arquivos de referência importantes

- `PRD.md` — requisitos do produto completos
- `docs/cache-contract.md` — estratégia de cache React Query
- `docs/schema.md` — schema completo do banco de dados
- `docs/plans/refactoring-plan.md` — plano de refatoração priorizado
