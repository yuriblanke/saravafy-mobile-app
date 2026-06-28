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

- **`api/`** — chama o Supabase diretamente, retorna dados brutos
- **`queries/`** — wrappa `api/` em hooks React Query; é a única camada que os componentes devem usar para dados remotos
- **`screens/`** — orquestra queries + hooks + UI; não deve conter lógica de negócio inline
- **`components/`** — UI reutilizável, sem dependência de queries específicas de domínio
- **`domain/`** — lógica de negócio pura, sem side effects

**Regra:** screens e components nunca chamam `supabase` diretamente. Toda comunicação com o backend passa por `api/` + `queries/`.

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
- Mover chamadas diretas ao Supabase para `api/` + `queries/`
- Criar hooks faltantes (useImageUpload, useIbgeMunicipios, etc.)

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
