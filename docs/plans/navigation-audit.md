# Auditoria de Navegação — Saravafy Mobile App

Diagnóstico do estado atual do roteamento e do botão "voltar" do Android, feito rota a rota contra o código (não auditoria automática). Base para a Fase 6 do plano de refatoração.

**Pergunta que motivou:** a navegação está madura o suficiente pro "voltar" nativo cair sempre no lugar certo sem especificar destino manualmente?

**Resposta curta:** não ainda. A topologia é boa, mas três padrões ainda forçam navegação manual: `router.replace` com destino fixo, o param `returnTo`, e interceptação de `BackHandler`.

---

## Topologia atual (boa)

```
app/_layout.tsx                    # Stack raiz + redirect de boot (auth)
  (auth)/login
  (app)/_layout.tsx                # Stack do app + BackHandler do RootPager
    (tabs)/_layout.tsx             # material-top-tabs: (pontos) | (terreiros)
      (pontos)/  (terreiros)/      # cada aba é um Stack próprio, animation: none
    player, preferences, terreiro-editor, collection/[id], access-manager, ...   # fullscreen no Stack (app)
    l/[tipo]/[id], l/ponto/[id], ...   # deep links (telas redirect-only)
```

A unificação das telas fullscreen sob o Stack `(app)` (commit `3d2668a`) foi acertada. O problema não é a topologia — é como as telas **saem**.

---

## Diagnóstico por padrão

### Padrão 1 — `router.replace` com destino fixo (DESTRÓI o back)

`replace` apaga a entrada do histórico. Quando uma tela sai com `replace("/(app)/(tabs)/(pontos)")`, o "voltar" nativo não tem mais como saber de onde o usuário veio — o destino virou fixo "Pontos", independente da origem.

**Contagem confirmada: 35 `router.replace` vs 41 `router.back`.**

Classificação:

| Local | Veredito |
|-------|----------|
| `app/_layout.tsx` (boot redirect 276/278/421) | ✅ Legítimo — redirect de auth, back não deve voltar |
| `auth/callback.tsx`, `(auth)/login.tsx` | ✅ Legítimo — fluxo de auth |
| `TabsHeader:914` → `/login` (signout) | ✅ Legítimo |
| `l/*` (todas as telas de deep link) | ✅ Legítimo — são telas redirect-only; back não deve cair numa tela em branco |
| `Player` (153/166/175/183) | ⚠️ Aceitável — **já usa `canGoBack() ? back() : replace(fallback)`**. Verboso, mas correto. Baixa prioridade |
| `ReviewQueue:71`, `ReviewSubmission:570` → `/` | ⚠️ Revisar — `back()` provavelmente serviria |
| `Collection` (205/224) | ❌ Problema — hardcoda `/terreiro` e `(pontos)`, **sem `canGoBack`** |
| `TerreiroBiblioteca` (266/277/571/582) | ❌ Problema — `returnTo` + replace (ver Padrão 2) |
| `TerreiroEditor:943` (pós-save) | ❌ Problema — replace fixo pra `(terreiros)` em vez de `back()` |
| `TabsHeader` (404/441) | ⚠️ Fallback do `!isInTabs` — sintoma do Padrão 3 |

**Offensor-modelo:** abrir Collection a partir da aba Terreiros → voltar te joga na aba Pontos, porque o destino está cravado. O **Player já resolveu isso** com `canGoBack()`; o resto não generalizou esse idioma.

### Padrão 2 — param `returnTo` (especificar o back na mão)

9 ocorrências, concentradas em `TerreiroBiblioteca`. A tela recebe `returnTo` como parâmetro e faz `router.replace(returnTo || fallback)`. É literalmente passar "pra onde o voltar deve ir" como dado — exatamente o que se quer eliminar. Existe porque o histórico de stack é tratado como não-confiável (ver causa-raiz).

### Padrão 3 — `BackHandler` (interceptação manual do back físico)

18 usos em 9 arquivos. Nem todos são ruins — categorizando:

| Local | O que faz | Veredito |
|-------|-----------|----------|
| `TerreiroEditor:1191` | "Descartar alterações?" → `back()` | ✅ Legítimo — guard de form sujo |
| `PlayerAudioUpload`, `AddToCollection`, `EditOrderScreenBase` | (provável) confirmar descarte | ✅ Legítimo se for guard de edição |
| `PreferencesModal:25` | fecha o modal no back | ✅ Legítimo — modal não é rota |
| `InviteGate:698` | `() => true` — **bloqueia o back inteiro** | ⚠️ Agressivo — trava o usuário enquanto o convite não é respondido |
| `Player:196` | chama `handlePlayerNavigateBack` custom | ⚠️ Sintoma — só existe por causa do replace |
| `app/(app)/_layout.tsx:52` | na aba Terreiros, back físico → aba Pontos | ⚠️ Sintoma — pager de tabs não tem back nativo entre abas |

Os legítimos (guard de descarte, fechar modal) devem ficar. Os marcados ⚠️ desaparecem se os Padrões 1 e 2 forem corrigidos.

---

## Causa-raiz

Três decisões se combinam e tornam o histórico de stack não-confiável, o que **força** o código a compensar com destino fixo:

1. **Tabs como pager** (`material-top-tabs`, `animation: "none"`, fundo transparente "cada cena desenha o seu"): trocar de aba não é navegação de stack, então back entre abas precisa ser simulado (BackHandler no `_layout`).
2. **Deep links `l/*` entram com `replace`**: telas abertas por link não têm entrada de back. Por isso as telas-destino *não podem* assumir que há histórico — e caem no replace-pra-destino-fixo em vez de `back()`.
3. **Ausência de um idioma único de saída**: cada tela inventou o seu (`returnTo`, replace fixo, BackHandler custom). O Player chegou no idioma certo (`canGoBack() ? back() : fallback`), mas não foi propagado.

---

## Direção de correção (vira Fase 6)

Objetivo: **um único idioma de "voltar"**, back nativo por padrão, destino fixo só como fallback quando comprovadamente não há histórico.

1. **Helper único de saída** — ex. `useScreenBack(fallbackHref)` que encapsula `canGoBack() ? back() : replace(fallback)` + alinhamento de aba quando necessário. É o que o Player já faz à mão; extrair e aplicar em todas as telas fullscreen.
2. **Matar `returnTo`** — TerreiroBiblioteca passa a usar o helper; remover o param e todo o threading.
3. **`push` na entrada, `back` na saída** — Collection, TerreiroBiblioteca, TerreiroEditor (pós-save) saem via helper, não replace fixo. Conferir que são *entradas* via `push` (já são, na maioria).
4. **Deep links** — manter `replace` na entrada (correto), mas a tela-destino usa o helper: se não há histórico, o fallback leva ao root sensato do contexto (ex.: ponto → Pontos, coleção de terreiro → aquele terreiro).
5. **Reduzir `BackHandler`** ao conjunto legítimo: guards de descarte de edição e fechar modal. Remover os que só existem por causa do replace (Player custom; reavaliar o tab-back do `_layout` se o pager virar stack-aware).
6. **Reavaliar `InviteGate` bloquear back inteiro** — confirmar se é requisito de produto ou se pode degradar pra "fecha o banner".
7. **Limpeza de config órfã** (investigado — ver abaixo): remover o `detachPreviousScreen` stale em `(terreiros)/_layout.tsx`. `app/(app)/terreiro.tsx` **não** é dead code.

### Resultado da investigação (decisões 6.5)

- **`app/(app)/terreiro.tsx` — NÃO é dead code.** É o arquivo de rota da URL `/terreiro`, que renderiza `TerreiroBiblioteca` (`export default TerreiroBiblioteca`). Referenciado por 8+ sites de navegação + redirect de boot. O commit `cccb401` removeu outro `Terreiro.tsx` (componente antigo), não este alias. **Manter.** Renomear para `terreiro-biblioteca.tsx` mudaria a URL — não vale.
- **`detachPreviousScreen` — stale confirmado, remover.** O stack `(terreiros)/` contém só `index.tsx`; as rotas `terreiro` e `collection/[id]` da condição vivem no nível `(app)`, então a condição nunca casa. Órfã da migração `3d2668a`. No-op — remover por clareza.
- **Topologia confirmada limpa:** cada stack de aba tem só seu index; todas as telas fullscreen no nível `(app)`.

### Pré-requisito de validação

Sem suíte de testes, cada mudança de navegação precisa de teste manual no Android cobrindo: entrada via aba, entrada via deep link, e back físico vs gesto vs botão da UI — os três têm que cair no mesmo lugar.

---

## Veredito

A arquitetura de roteamento é **intencional e bem melhor que o histórico de bugs sugere**, mas **não está madura** para o back nativo "que cai sozinho no lugar certo". Falta um idioma único de saída. O Player já mostra o caminho (`canGoBack()`); a Fase 6 é generalizar isso e aposentar `returnTo` + replace-fixo + BackHandler supérfluo.
