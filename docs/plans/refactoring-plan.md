# Plano de Refatoração — Saravafy Mobile App

Objetivo: deixar o código mais limpo, sustentável e bem componentizado, seguindo as convenções do projeto (ver CLAUDE.md).

> **Revisado contra o código real** (não só auditoria automática). Os números de duplicação e tamanho foram confirmados via grep/wc. A premissa de estrutura segue a convenção de co-localização já existente no projeto.

---

## Princípio que guia onde cada coisa vai

O projeto já co-localiza código por tela (`screens/Home/components`, `screens/Home/data`, `screens/Player/hooks`). O plano respeita isso:

- **Global** (`src/utils`, `src/hooks`, `src/components`): só o que é compartilhado por 2+ telas.
- **Co-localizado** (`screens/X/...`): tudo que é específico de uma tela.

Quando em dúvida, co-localizar. Promover para global só quando a segunda tela precisar.

---

## Fase 1 — Utilitários compartilhados (eliminar duplicação)

Estas funções estão genuinamente espalhadas por várias telas, então vão para o global `src/utils/`. Contagens confirmadas via grep. Fazer primeiro: as fases seguintes consomem esses utilitários.

### 1.1 `src/utils/errors.ts`
Consolidar `getErrorMessage` — **13 definições** confirmadas — mais `serializeSupabaseErrorForLog` / `safeJsonForLog` (concentrados em ReviewSubmission).
- `getErrorMessage(error: unknown): string`
- `serializeErrorForLog(error: unknown): Record<string, unknown>`

### 1.2 `src/utils/format.ts`
- `getInitials` — **5 definições**
- `formatTimeAgo` — **2 definições** (AccessManager, TerreiroMembers)
- `normalizeEmail` — **10 definições**
- `normalize` (busca: remove acento + lower) — espalhado
- `formatPhone`, `normalizeInstagram` — hoje inline no TerreiroEditor; só promover se uma 2ª tela precisar, senão deixar co-localizado (ver 4.2)

### 1.3 `src/utils/color.ts`
- `hexToRgba` — **2 definições** (TerreiroBiblioteca, Collection)

> Convenção de `src/utils/` já existente: um arquivo camelCase por tema (authLogger.ts, mergeTags.ts...). Manter o estilo.

---

## Fase 2 — Hooks (a maioria co-localizada)

Extrair lógica das telas para hooks. **Onde** cada hook vive depende de ser compartilhado ou não:

| Hook | Onde | Extraído de |
|------|------|-------------|
| `useImageUpload` | `src/hooks/` se Collection/Ponto também usarem; senão `TerreiroEditor/hooks/` | TerreiroEditor (supabase.storage inline) |
| `useIbgeMunicipios` (React Query) | `src/queries/ibge.ts` | TerreiroEditor (fetch IBGE inline) |
| `useAudioValidation` | `src/components/pontos/` (perto do PontoUpsertModal) | PontoUpsertModal |
| `useAppStateListener` | `src/hooks/` (genérico) | CuratorInviteGate |
| `useInvitePolling` | co-localizado no InviteGate/CuratorInviteGate | CuratorInviteGate |
| `useAudioReview` | `CuratorReviewQueue/hooks/` | ReviewSubmission |

> **Já existe parcialmente:** o "wizard de adicionar a coleção" já é `Home/components/HomeAddToCollectionWizard.tsx`. Em vez de criar `useAddToCollectionWizard` do zero, **consolidar a lógica de estado restante de Home.tsx dentro desse componente** (ou um `Home/hooks/useAddToCollectionWizard.ts`).

---

## Fase 3 — Tirar Supabase inline dos componentes de tela

Regra (CLAUDE.md): componentes `*.tsx` não chamam `supabase` direto. Um arquivo `data/` da tela fazendo isso é aceitável (é a convenção). O alvo são os **componentes** que chamam inline.

Ofensores confirmados (supabase.rpc/storage dentro do `.tsx`):
- **`TerreiroBiblioteca.tsx`** — `supabase.rpc("get_terreiro_members_count")`, `supabase.rpc("delete_collection")` → mover para query/mutation
- **`TerreiroEditor.tsx`** — `supabase.storage` (upload de capa) → mover para `useImageUpload` (Fase 2)
- **`ReviewSubmission.tsx`** — wrapper `callRpcWithParamFallback` com `supabase.rpc` → extrair para hook/util reutilizável (já existe `callRpcWithParamFallback`, centralizar)

`fetch()` inline a revisar: TerreiroEditor (IBGE → Fase 2), Home, Terreiros, TerreirosSection, LibraryPlayerAddToCollectionModal — checar se já têm `data/` equivalente antes de criar query nova.

---

## Fase 4 — Quebrar arquivos gigantes

Tamanhos confirmados via `wc -l`. **Inclui dois que o plano original esqueceu** (api/pontoAudio.ts, hooks/terreiroMembership.ts).

| Arquivo | Linhas | Estratégia |
|---------|--------|-----------|
| `components/TabsHeaderWithPreferences.tsx` | 3164 | Decompor: TabsHeader + PreferencesModal + PreferencesSections/ + TerreiroSwitcher; estado → `useTabsHeaderState` |
| `screens/TerreiroEditor/TerreiroEditor.tsx` | 2906 | Subforms (BasicInfo / Location / Contact / AdminPanel) em `TerreiroEditor/components/`; estado → `TerreiroEditor/hooks/`; capa → `useImageUpload` |
| `screens/TerreiroBiblioteca/TerreiroBiblioteca.tsx` | 2113 | Compartilha animação de header com Collection → `useScrollHeaderAnimation` (global); tirar supabase inline (Fase 3) |
| `screens/Home/Home.tsx` | 2109 | Busca/filtro → `usePontosFilter` (já há `usePontosSearch`); wizard → consolidar no HomeAddToCollectionWizard; `getLyricsPreview` → utils |
| `screens/Collection/Collection.tsx` | 2009 | `useScrollHeaderAnimation` compartilhado; `hexToRgba` → utils (Fase 1.3) |
| `screens/CuratorReviewQueue/ReviewSubmission.tsx` | 1959 | `useAudioReview`; utils de erro → Fase 1.1; RPC fallback → Fase 3 |
| `components/pontos/PontoUpsertModal.tsx` | 1840 | FormFields / AudioSection / TermsSection; `usePontoFormState`; `useAudioValidation` |
| `components/InviteGate.tsx` | 1498 | Lógica de mutation de convite → hook; `useInvitePolling` |
| **`api/pontoAudio.ts`** | **1425** | Avaliar split por responsabilidade (upload / playback prep / cache). Cuidado: é áudio, testar bem |
| `screens/TerreiroMembers/TerreiroMembers.tsx` | 1332 | `getInitials`/`formatTimeAgo` → utils; lista de membros → componente |
| `screens/CollectionAddToCollection/AddToCollection.tsx` | 1328 | Decompor seleção/criação de coleção |
| **`hooks/terreiroMembership.ts`** | **1250** | Já é coleção de hooks, mas grande demais. Separar por sub-domínio (membros / convites / papéis) |

Ordem sugerida dentro da fase: começar pelos que mais se beneficiam das Fases 1–2 já prontas (Collection, TerreiroBiblioteca, ReviewSubmission, Home), deixar TabsHeaderWithPreferences e TerreiroEditor (os dois maiores) por último, com mais cuidado.

---

## Fase 5 — Props e composição

### 5.1 PreferencesPageItem (9 props)
Avaliar API de composição:
```tsx
<PreferencesPageItem onPress={...}>
  <PreferencesPageItem.Avatar url={...} initials={...} />
  <PreferencesPageItem.Content title={...} subtitle={...} />
  <PreferencesPageItem.Controls onEdit={...} rightAccessory={...} />
</PreferencesPageItem>
```

### 5.2 BaseSheet
Vários bottom sheets com implementações ligeiramente diferentes. Avaliar `BaseSheet.tsx` com estilo base; sheets específicos viram wrappers finos. (Já existe `src/components/BottomSheet` — checar se basta estendê-lo antes de criar algo novo.)

---

## Fase 6 — Navegação (back nativo único)

> Detalhe completo do diagnóstico em `docs/plans/navigation-audit.md`. Esta fase executa a correção.

**Objetivo:** um único idioma de "voltar". Back nativo por padrão; destino fixo só como fallback quando comprovadamente não há histórico. Aposentar `returnTo` e o replace-com-destino-fixo; reduzir `BackHandler` ao conjunto legítimo.

**Por que existe:** a navegação foi historicamente a maior fonte de bug do app. O Player já chegou no idioma correto (`canGoBack() ? back() : replace(fallback)`); falta generalizar.

### 6.1 Helper único de saída

Criar `src/hooks/useScreenBack.ts`:

```ts
// Generaliza o que PlayerScreen já faz à mão.
function useScreenBack(fallbackHref: Href, opts?: { alignTab?: "pontos" | "terreiros" })
  → () => void
```

Comportamento: alinha aba (se `alignTab`), depois `router.canGoBack() ? router.back() : router.replace(fallbackHref)`. É o ponto único onde a lógica de saída vive — telas só declaram seu fallback.

### 6.2 Migrar telas para o helper

| Tela | Hoje | Fallback do helper |
|------|------|--------------------|
| Collection | replace fixo `/terreiro` e `(pontos)`, sem `canGoBack` | terreiro de origem se houver `terreiroId`, senão `(pontos)` |
| TerreiroBiblioteca | `returnTo` + replace (4 sites) | `(terreiros)` — e **remover o param `returnTo` e todo o threading** |
| TerreiroEditor | replace fixo `(terreiros)` pós-save | `back()` para a tela de origem |
| Player | já correto, mas verboso | refatorar `handlePlayerNavigateBack` para usar o helper |
| ReviewQueue / ReviewSubmission | `replace("/")` | avaliar `back()`; manter replace só se a fila não deve ser back-reachable |

### 6.3 Deep links `l/*`

Manter `replace` na **entrada** (correto — são telas redirect-only). A tela-destino usa o helper: sem histórico, o fallback leva ao root sensato do contexto (ponto → Pontos; coleção de terreiro → aquele terreiro).

### 6.4 Reduzir BackHandler

Manter só os legítimos: guard de "descartar alterações?" (TerreiroEditor, e confirmar PlayerAudioUpload / AddToCollection / EditOrderScreenBase) e fechar modal (PreferencesModal). Remover os que só existem por causa do replace (Player custom). Reavaliar o tab-back em `app/(app)/_layout.tsx` depois que 6.1–6.2 estabilizarem.

### 6.5 Decisões em aberto (resolver antes de fechar a fase)

- [x] ~~InviteGate bloqueia o back inteiro?~~ **Resolvido (produto): suavizar.** O back passa a fechar/dispensar o banner em vez de travar (`() => true` → fecha o convite e retorna `true`). Alinha ao back nativo único da fase.
- [x] ~~`app/(app)/terreiro.tsx` é dead code?~~ **Resolvido: NÃO é.** É a rota `/terreiro` que renderiza TerreiroBiblioteca. Manter.
- [x] ~~`detachPreviousScreen` em `(terreiros)/_layout.tsx`~~ **Resolvido: stale, remover.** Condição nunca casa (rotas vivem no nível `(app)`). No-op órfão da migração `3d2668a`.

### 6.6 Validação (sem suíte de testes)

Cada tela migrada precisa de teste manual no Android cobrindo os 3 caminhos de entrada (via aba, via deep link, sem histórico) × 3 formas de voltar (back físico, gesto, botão da UI). Todos têm que cair no mesmo lugar.

---

## Checklist de progresso

### Fase 1 — Utils
- [ ] `src/utils/errors.ts` (consolidar 13 getErrorMessage + serializers)
- [ ] `src/utils/format.ts` (getInitials, formatTimeAgo, normalizeEmail, normalize)
- [ ] `src/utils/color.ts` (hexToRgba)

### Fase 2 — Hooks
- [ ] `useImageUpload` (TerreiroEditor; decidir local vs global)
- [ ] `src/queries/ibge.ts` + `useIbgeMunicipios`
- [ ] `useAudioValidation`
- [ ] `useAppStateListener`
- [ ] `useInvitePolling`
- [ ] `useAudioReview`
- [ ] Consolidar wizard em HomeAddToCollectionWizard

### Fase 3 — Supabase inline → camada de dados
- [ ] TerreiroBiblioteca.tsx (rpc inline)
- [ ] TerreiroEditor.tsx (storage inline → useImageUpload)
- [ ] ReviewSubmission.tsx (centralizar callRpcWithParamFallback)
- [ ] Revisar fetch() inline: Home, Terreiros, TerreirosSection, LibraryPlayerAddToCollectionModal

### Fase 6 — Navegação
- [ ] `src/hooks/useScreenBack.ts` (helper único de saída)
- [ ] Migrar Collection para o helper
- [ ] Migrar TerreiroBiblioteca + remover `returnTo`
- [ ] Migrar TerreiroEditor (pós-save)
- [ ] Refatorar Player para usar o helper
- [ ] Revisar ReviewQueue / ReviewSubmission `replace("/")`
- [ ] Telas-destino de deep link `l/*` usam o helper
- [ ] Podar BackHandler ao conjunto legítimo
- [ ] Suavizar InviteGate (back fecha o banner em vez de travar)
- [ ] Remover `detachPreviousScreen` stale em `(terreiros)/_layout.tsx`

### Fase 4 — Gigantes
- [ ] TabsHeaderWithPreferences (3164)
- [ ] TerreiroEditor (2906)
- [ ] TerreiroBiblioteca (2113)
- [ ] Home (2109)
- [ ] Collection (2009)
- [ ] ReviewSubmission (1959)
- [ ] PontoUpsertModal (1840)
- [ ] InviteGate (1498)
- [ ] api/pontoAudio.ts (1425)
- [ ] TerreiroMembers (1332)
- [ ] AddToCollection (1328)
- [ ] hooks/terreiroMembership.ts (1250)

### Fase 5 — Composição
- [ ] PreferencesPageItem
- [ ] BaseSheet / estender BottomSheet existente

---

## Princípios durante a refatoração

1. **Uma mudança por vez** — não misturar refatoração estrutural com mudança de comportamento.
2. **Refatoração é comportamento-preservante** — se algo mudou de comportamento, é bug, não melhoria.
3. **Co-localizar por padrão** — promover para global só com 2º consumidor real.
4. **Sem abstração especulativa** — extrair o que está duplicado *agora*.
5. **Testar manualmente** as telas afetadas a cada fase (não há suíte de testes no projeto).
6. **Commits atômicos** — um por extração/quebra, mensagem descritiva em PT.
