# Plano de Refatoração — Saravafy Mobile App

Objetivo: deixar o código mais limpo, sustentável e bem componentizado, seguindo as convenções do projeto (ver CLAUDE.md).

---

## Prioridades

As tarefas estão organizadas por impacto e dependência. Fazer na ordem sugerida: utilitários primeiro (outros itens dependem deles), depois hooks, depois componentes.

---

## Fase 1 — Utilitários e helpers (eliminar duplicação)

Problema central: funções como `getErrorMessage`, `normalizeEmail`, `getInitials`, `formatTimeAgo`, `hexToRgba` e `normalize` estão copiadas em 10+ arquivos. Isso precisa ser resolvido primeiro porque as fases seguintes vão usar esses utilitários.

### 1.1 `src/utils/errors.ts`

Consolidar todas as variantes de `getErrorMessage`, `serializeSupabaseErrorForLog`, `safeJsonForLog` num único módulo.

Funções a criar:
- `getErrorMessage(error: unknown): string` — mensagem segura para exibir ao usuário
- `serializeErrorForLog(error: unknown): Record<string, unknown>` — serialização para logging

Fontes (remover após migração):
- `src/screens/CuratorReviewQueue/ReviewSubmission.tsx`
- `src/screens/Home/Home.tsx`
- `src/screens/Collection/Collection.tsx`
- `src/components/AddMediumTagSheet.tsx`
- `src/components/RemoveMediumTagSheet.tsx`
- `src/hooks/terreiroMembership.ts`
- `src/queries/collections.ts`
- +5 outros

### 1.2 `src/utils/format.ts`

Consolidar formatadores de strings:

- `getInitials(name: string): string`
- `formatTimeAgo(date: string | Date): string`
- `normalizeEmail(email: string): string`
- `normalize(text: string): string` — para busca (remove acentos, lower)
- `formatPhone(phone: string): string`
- `normalizeInstagram(handle: string): string`

Fontes (remover após migração):
- `getInitials` → TabsHeaderWithPreferences.tsx + TerreiroMembers.tsx
- `formatTimeAgo` → AccessManager.tsx + TerreiroMembers.tsx
- `normalizeEmail` → 75+ ocorrências espalhadas
- `normalize` → 20+ ocorrências espalhadas

### 1.3 `src/utils/color.ts`

- `hexToRgba(hex: string, alpha: number): string`

Fontes:
- `TerreiroBiblioteca.tsx`
- `Collection.tsx`

---

## Fase 2 — Hooks faltantes

Hooks que precisam ser criados para desacoplar lógica das screens.

### 2.1 `src/hooks/useImageUpload.ts`

Lógica de seleção + compressão de imagem extraída do TerreiroEditor.
- Selecionar imagem da galeria/câmera
- Comprimir para WebP
- Fazer upload para Supabase Storage
- Retornar URL com cache-bust

### 2.2 `src/queries/ibge.ts` + `src/hooks/useIbgeMunicipios.ts`

Atualmente TerreiroEditor faz `fetch()` direto para a API do IBGE.  
Criar query React Query para municípios por UF, com cache.

### 2.3 `src/hooks/useAddToCollectionWizard.ts`

Estado e lógica do fluxo de adicionar ponto a coleção (Home.tsx tem isso inline com múltiplos states).

### 2.4 `src/hooks/useAudioValidation.ts`

Validação de arquivo de áudio (formato, tamanho, duração) extraída do PontoUpsertModal.

### 2.5 `src/hooks/useAppStateListener.ts`

Wrapper sobre AppState do React Native para detectar foreground/background, extraído do CuratorInviteGate.

### 2.6 `src/hooks/useInvitePolling.ts`

Lógica de polling de convites de terreiro, extraída do CuratorInviteGate.

---

## Fase 3 — Mover chamadas diretas ao Supabase para queries/

Regra: screens não chamam `supabase` diretamente. Todo acesso ao backend via `api/` + `queries/`.

### 3.1 TerreiroEditor — membros e convites

Atualmente busca membros e convites com `supabase.from("profiles")` e `supabase.from("terreiro_invites")` inline.  
Criar hooks React Query equivalentes em `src/queries/terreiroMembers.ts` (se não existirem).

### 3.2 Terreiros.tsx, TerreirosSection.tsx

Verificar e mover fetch() diretos para queries/.

### 3.3 LibraryPlayerAddToCollectionModal.tsx

Verificar e mover fetch() diretos para queries/.

---

## Fase 4 — Quebrar componentes gigantes

### 4.1 TabsHeaderWithPreferences (3164 linhas) — CRÍTICO

Este componente mistura: tab control, preferences modal, terreiro switcher, avatar, notificações.

Divisão sugerida:
- `TabsHeader.tsx` — apenas a barra de abas
- `PreferencesModal.tsx` — container do modal de preferências
- `PreferencesSections/` — subcomponentes por seção (conta, terreiro, tema, etc.)
- `TerreiroSwitcher.tsx` — lista e troca de terreiros
- Extrair lógica de estado → `useTabsHeaderState.ts`

### 4.2 TerreiroEditor (2906 linhas) — CRÍTICO

Formulário de edição de terreiro que mistura dados, upload, localização, membros e administração.

Divisão sugerida:
- `TerreiroBasicInfoForm.tsx` — nome, descrição, foto
- `TerreiroLocationForm.tsx` — UF, município (usa `useIbgeMunicipios`)
- `TerreiroContactForm.tsx` — telefone, Instagram
- `TerreiroAdminPanel.tsx` — gerenciamento de membros e convites
- `useTerreiroEditorState.ts` — estado consolidado do formulário
- Foto de capa → `useImageUpload`

### 4.3 PontoUpsertModal (1840 linhas)

Divisão sugerida:
- `PontoFormFields.tsx` — campos de texto do ponto
- `PontoAudioSection.tsx` — upload e validação do áudio (usa `useAudioValidation`)
- `PontoTermsSection.tsx` — aceite de termos
- `usePontoFormState.ts` — estado do formulário

### 4.4 Home (2109 linhas)

Extrair:
- Lógica de busca/filtro → `usePontosFilter` (complementar ao `usePontosSearch` existente)
- Fluxo de adicionar à coleção → `useAddToCollectionWizard` (Fase 2.3)
- `getLyricsPreview` → `src/utils/format.ts`

### 4.5 TerreiroBiblioteca (2113 linhas) e Collection (2009 linhas)

Ambos têm lógica de animação scroll + header similar.  
Extrair padrão compartilhado:
- `useScrollHeaderAnimation.ts` — hook com lógica de animação baseada em scroll
- `hexToRgba` → `src/utils/color.ts` (Fase 1.3)

### 4.6 CuratorReviewQueue/ReviewSubmission (1959 linhas)

Extrair:
- `useAudioReview.ts` — controle de áudio no contexto de revisão
- Utilitários de erro → `src/utils/errors.ts` (Fase 1.1)

---

## Fase 5 — Props e composição

### 5.1 PreferencesPageItem

9 props atualmente. Avaliar composição:
```tsx
<PreferencesPageItem onPress={...}>
  <PreferencesPageItem.Avatar url={...} initials={...} />
  <PreferencesPageItem.Content title={...} subtitle={...} />
  <PreferencesPageItem.Controls onEdit={...} rightAccessory={...} />
</PreferencesPageItem>
```

### 5.2 Modal/Sheet padronizado

Múltiplos bottom sheets com implementações ligeiramente diferentes. Avaliar extrair um `BaseSheet.tsx` com props de estilo base, mantendo os sheets específicos como wrappers.

---

## Checklist de progresso

### Fase 1 — Utils
- [ ] `src/utils/errors.ts` — consolidar getErrorMessage e serializers
- [ ] `src/utils/format.ts` — consolidar getInitials, formatTimeAgo, normalizeEmail, normalize, formatPhone, normalizeInstagram
- [ ] `src/utils/color.ts` — hexToRgba

### Fase 2 — Hooks
- [ ] `src/hooks/useImageUpload.ts`
- [ ] `src/queries/ibge.ts` + `src/hooks/useIbgeMunicipios.ts`
- [ ] `src/hooks/useAddToCollectionWizard.ts`
- [ ] `src/hooks/useAudioValidation.ts`
- [ ] `src/hooks/useAppStateListener.ts`
- [ ] `src/hooks/useInvitePolling.ts`

### Fase 3 — Supabase direto → queries
- [ ] TerreiroEditor — membros e convites
- [ ] Terreiros.tsx + TerreirosSection.tsx
- [ ] LibraryPlayerAddToCollectionModal.tsx

### Fase 4 — Componentes gigantes
- [ ] TabsHeaderWithPreferences → decomposição
- [ ] TerreiroEditor → decomposição
- [ ] PontoUpsertModal → decomposição
- [ ] Home → extrair lógica
- [ ] TerreiroBiblioteca + Collection → hook de animação compartilhado
- [ ] ReviewSubmission → extrair utils e hook de áudio

### Fase 5 — Props e composição
- [ ] PreferencesPageItem → composição
- [ ] BaseSheet → padrão de bottom sheets

---

## Princípios a seguir durante a refatoração

1. **Uma mudança por vez** — não misturar refatoração de componente com mudança de comportamento
2. **Sem remoção de funcionalidade** — refatoração pura; se algo mudar de comportamento, é um bug
3. **Testar manualmente** as screens afetadas após cada fase
4. **Sem abstrações especulativas** — só extrair o que está duplicado agora, não o que pode duplicar no futuro
5. **Commits atômicos** — um commit por extração/quebra, com mensagem descritiva
