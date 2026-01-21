# Investigação — Ghosting do header ao abrir Preferences

## 1) Resumo do bug

Ao tocar no botão de abrir **Preferences** a partir de uma rota dentro de `(tabs)`, ocorre um “ghosting” (1–5 frames) em que o **header de tabs** aparece misturado com a UI da rota `/preferences`.

**Critério de aceitação (produto):**

- Frame N: tela antiga inteira
- Frame N+1: tela nova inteira
- Não pode existir frame intermediário com elementos de ambas.

## 2) Hipóteses (o que pode estar acontecendo)

> Importante: não é fix — é lista de causas plausíveis para guiar a coleta.

1. **Stack mantém o screen anterior montado por pelo menos 1 commit** (mesmo com `animation: "none"`), e por 1 frame a renderização da tela nova ainda não cobriu completamente o screen anterior.
2. **Transparência/“buracos” na tela nova por 1 frame** (background/transitions) deixam o screen anterior visível.
3. **Ordem de commit (JS → UI thread)**: o push de rota ocorre e a nova tela começa a montar, mas o detach/ocultação do conteúdo de tabs só ocorre em um commit seguinte.
4. **Z-order inesperado**: algum elemento do header de tabs (absoluto/zIndex) consegue “vazar” por cima da nova tela durante a troca de screens (mais provável se o Stack estiver em modo não-nativo).
5. **Portal/Overlay persistente**: algum overlay/portal (BottomSheet/Portal) que pertence ao “mundo tabs” pode estar acima do Stack, e por isso aparece sobre Preferences.

## 3) Instrumentação adicionada (logs)

A instrumentação foi adicionada **somente para diagnóstico** (dev-only via `__DEV__`).

### Logger

- `navTrace(event, data?)` em [src/utils/navTrace.ts](../../src/utils/navTrace.ts)
  - Prefixo: `[NavTrace +{dt}ms]` com `t0` global.

### Pontos instrumentados

- Tabs header: `TabsHeaderWithPreferences`
  - mount/unmount
  - layoutEffect commits
  - route changes (`pathname`, `segments`)
  - tap “open Preferences”
- Tabs layout: `(app)/(tabs)/_layout.tsx`
  - mount/unmount
  - route changes
- App layout (Stack root): `(app)/_layout.tsx`
  - mount/unmount
  - route changes
- Route `/preferences`: [app/(app)/preferences.tsx](<../../app/(app)/preferences.tsx>)
  - mount/unmount
- Preferences UI root: [src/screens/Preferences/Preferences.tsx](../../src/screens/Preferences/Preferences.tsx)
  - mount/unmount
  - layoutEffect commits
- PreferencesHeader: [src/screens/Preferences/components/PreferencesHeader.tsx](../../src/screens/Preferences/components/PreferencesHeader.tsx)
  - mount/unmount
  - layoutEffect commits
  - tap “back”

## 4) Como coletar evidência (passo a passo)

1. Rode o app em **DEV** (Metro):
   - `npm start` (ou o fluxo normal do projeto)
2. No Metro logs, filtre por `NavTrace`.
3. Reproduza:
   - Estar em uma rota dentro de `(tabs)`
   - Tocar no botão que abre Preferences
4. Copie um trecho contínuo de logs (ideal: do tap até ~300ms depois).

Dica: se necessário, limpe o `t0` reiniciando o app (o `t0` é global por sessão).

## 5) Timeline (com logs)

> Sequências reais observadas no Metro (amostras enviadas em 2026-01-16).

### Amostra A

**T0 (tap):**

- `[NavTrace +10934ms] Tap open Preferences {"activeTab":"pontos","fromPathname":"/","fromSegments":"(app)/(tabs)/(pontos)","headerBg":"#0E2A24"}`

**Esperado (hard cut):**

- Tabs layout deveria ficar totalmente “invisível” no mesmo commit em que Preferences aparece.

**Sequência observada:**

```
[NavTrace +10934ms] Tap open Preferences {"activeTab":"pontos","fromPathname":"/","fromSegments":"(app)/(tabs)/(pontos)","headerBg":"#0E2A24"}
[NavTrace +11093ms] PreferencesHeader layoutEffect commit {"variant":"dark"}
[NavTrace +11095ms] Preferences UI layoutEffect commit
[NavTrace +11103ms] PreferencesHeader mount {"variant":"dark"}
[NavTrace +11114ms] Preferences UI mount
[NavTrace +11115ms] Route /(app)/preferences mount

[NavTrace +11143ms] TabsHeader layoutEffect {"pathname":"/preferences","render":5,"segments":"(app)/preferences","suspended":false,"uiEnabled":true}
[NavTrace +11148ms] TabsHeader route {"pathname":"/preferences","render":5,"segments":"(app)/preferences","suspended":false,"uiEnabled":true}
[NavTrace +11150ms] (tabs) layout route {"pathname":"/preferences","segments":"(app)/preferences"}
[NavTrace +11152ms] (app) layout route {"pathname":"/preferences","segments":"(app)/preferences"}
```

**Leitura direta da amostra:**

- A rota `/preferences` efetivamente **renderiza e comita** (layoutEffect) antes de `useEffect` de mount (esperado).
- Mesmo depois da rota `/preferences` estar montada, o `TabsHeaderWithPreferences` e o layout `(tabs)` ainda estão **vivos o suficiente para reagir à mudança de rota** (layoutEffect + “route” já com `pathname: /preferences`).
- Ou seja: durante o push, existe uma janela real em que **ambos os mundos estão montados e recebendo commits**.

### Amostra B (com `focus/blur`)

```
[NavTrace +5099ms] Tap open Preferences {"activeTab":"pontos","fromPathname":"/","fromSegments":"(app)/(tabs)/(pontos)","headerBg":"#0E2A24"}
[NavTrace +5207ms] PreferencesHeader layoutEffect commit {"variant":"dark"}
[NavTrace +5210ms] Preferences UI layoutEffect commit
[NavTrace +5216ms] PreferencesHeader mount {"variant":"dark"}
[NavTrace +5226ms] Preferences UI mount
[NavTrace +5228ms] Route /(app)/preferences mount
[NavTrace +5229ms] Route /(app)/preferences focus
[NavTrace +5231ms] (tabs) blur {"pathname":"/","segments":"(app)/(tabs)/(pontos)"}

[NavTrace +5256ms] TabsHeader layoutEffect {"pathname":"/preferences","render":6,"segments":"(app)/preferences","suspended":false,"uiEnabled":true}
[NavTrace +5261ms] TabsHeader route {"pathname":"/preferences","render":6,"segments":"(app)/preferences","suspended":false,"uiEnabled":true}
[NavTrace +5263ms] (tabs) layout route {"pathname":"/preferences","segments":"(app)/preferences"}
[NavTrace +5265ms] (app) layout route {"pathname":"/preferences","segments":"(app)/preferences"}
```

**Leitura direta da amostra B:**

- O `/preferences` reporta **focus em +5229ms**, enquanto `(tabs)` só reporta **blur em +5231ms** (diferença de ~2ms).
- Mesmo após o `(tabs) blur`, o `TabsHeaderWithPreferences` ainda executa `layoutEffect` e `route` já com `pathname: /preferences`.

Isso confirma uma “overlap window” não só de montagem, mas também de ciclo de commit, e mostra que **eventos de foco podem ocorrer antes do blur do screen anterior**.

### Amostra C (com `onLayout` + `rAF` + heartbeat)

```
[NavTrace +6737ms] Tap open Preferences {"activeTab": "pontos", "fromPathname": "/", "fromSegments": "(app)/(tabs)/(pontos)", "headerBg": "#0E2A24"}
[NavTrace +6843ms] PreferencesHeader layoutEffect commit {"variant": "dark"}
[NavTrace +6846ms] Preferences UI layoutEffect commit
[NavTrace +6856ms] PreferencesHeader mount {"variant": "dark"}
[NavTrace +6867ms] Preferences UI mount
[NavTrace +6868ms] Route /(app)/preferences mount
[NavTrace +6869ms] Route /(app)/preferences focus
[NavTrace +6871ms] (tabs) blur {"pathname": "/", "segments": "(app)/(tabs)/(pontos)"}

[NavTrace +6891ms] TabsHeader layoutEffect {"pathname": "/preferences", "render": 5, "segments": "(app)/preferences", "suspended": false, "uiEnabled": true}
[NavTrace +6896ms] TabsHeader route {"pathname": "/preferences", "render": 5, "segments": "(app)/preferences", "suspended": false, "uiEnabled": true}
[NavTrace +6897ms] (tabs) layout route {"pathname": "/preferences", "segments": "(app)/preferences"}
[NavTrace +6899ms] (app) layout route {"pathname": "/preferences", "segments": "(app)/preferences"}

[NavTrace +6906ms] Preferences UI onLayout {"baseBgColor": "#0E2A24", "layout": {"height": 834.4615, "width": 375.3846, "x": 0, "y": 0}, "variant": "dark"}
[NavTrace +6907ms] PreferencesHeader onLayout {"headerTotalHeight": 92, "layout": {"height": 92, "width": 375.3846, "x": 0, "y": 0}, "variant": "dark"}
[NavTrace +6908ms] Preferences UI rAF 1

[NavTrace +6951ms] TabsHeader heartbeat on /preferences {"afterMs": 0, "lastLayout": {"height": 103.6923, "width": 375.3846, "x": 0, "y": 0}, "pathname": "/preferences", "render": 5, "segments": "(app)/preferences", "suspended": false, "uiEnabled": true}
[NavTrace +6971ms] Preferences UI rAF 2
[NavTrace +6972ms] TabsHeader heartbeat on /preferences {"afterMs": 16, "lastLayout": {"height": 103.6923, "width": 375.3846, "x": 0, "y": 0}, "pathname": "/preferences", "render": 5, "segments": "(app)/preferences", "suspended": false, "uiEnabled": true}
[NavTrace +6972ms] TabsHeader heartbeat on /preferences {"afterMs": 50, "lastLayout": {"height": 103.6923, "width": 375.3846, "x": 0, "y": 0}, "pathname": "/preferences", "render": 5, "segments": "(app)/preferences", "suspended": false, "uiEnabled": true}
[NavTrace +6987ms] Preferences UI rAF 3

[NavTrace +7100ms] TabsHeader heartbeat on /preferences {"afterMs": 200, "lastLayout": {"height": 103.6923, "width": 375.3846, "x": 0, "y": 0}, "pathname": "/preferences", "render": 5, "segments": "(app)/preferences", "suspended": false, "uiEnabled": true}
[NavTrace +7422ms] TabsHeader heartbeat on /preferences {"afterMs": 500, "lastLayout": {"height": 103.6923, "width": 375.3846, "x": 0, "y": 0}, "pathname": "/preferences", "render": 5, "segments": "(app)/preferences", "suspended": false, "uiEnabled": true}
[NavTrace +7901ms] TabsHeader heartbeat on /preferences {"afterMs": 1000, "lastLayout": {"height": 103.6923, "width": 375.3846, "x": 0, "y": 0}, "pathname": "/preferences", "render": 5, "segments": "(app)/preferences", "suspended": false, "uiEnabled": true}
```

**Leitura direta da amostra C:**

- O `TabsHeaderWithPreferences` permanece **montado e medido em `y: 0`** por pelo menos **1 segundo** após a navegação para `/preferences`.
- Isso confirma que o header de tabs **não está sendo desmontado** e continua no hierarchy de views (ao menos como screen anterior do Stack).
- Como o ghosting observado em produto é de poucos frames (e não permanente), isso torna a hipótese **"portal/overlay acima do Stack" menos provável**.
- A hipótese que fica mais forte é: por alguns frames, a tela de `/preferences` ainda não cobriu o frame 100% (ou por ordem de composição/commit), permitindo que o header anterior seja visível **por baixo**.

### Amostra D (com `transitionStart/transitionEnd`)

```
[NavTrace +5138ms] Tap open Preferences {"activeTab": "pontos", "fromPathname": "/", "fromSegments": "(app)/(tabs)/(pontos)", "headerBg": "#0E2A24"}
[NavTrace +5238ms] PreferencesHeader layoutEffect commit {"variant": "dark"}
[NavTrace +5240ms] Preferences UI layoutEffect commit
[NavTrace +5247ms] PreferencesHeader mount {"variant": "dark"}
[NavTrace +5260ms] Preferences UI mount
[NavTrace +5261ms] Route /(app)/preferences mount
[NavTrace +5262ms] Route /(app)/preferences attach transition listeners
[NavTrace +5264ms] Route /(app)/preferences focus
[NavTrace +5265ms] (tabs) blur {"pathname": "/", "segments": "(app)/(tabs)/(pontos)"}

[NavTrace +5299ms] Preferences UI onLayout {"baseBgColor": "#0E2A24", "layout": {"height": 834.4615, "width": 375.3846, "x": 0, "y": 0}, "variant": "dark"}
[NavTrace +5300ms] PreferencesHeader onLayout {"headerTotalHeight": 92, "layout": {"height": 92, "width": 375.3846, "x": 0, "y": 0}, "variant": "dark"}
[NavTrace +5301ms] Preferences UI rAF 1
[NavTrace +5373ms] Preferences UI rAF 2
[NavTrace +5387ms] Preferences UI rAF 3

[NavTrace +5388ms] Route /(app)/preferences transitionStart {"closing": false}
[NavTrace +5411ms] Route /(app)/preferences transitionEnd {"closing": false}
```

**Leitura direta da amostra D:**

- Mesmo com `animation: "none"`, o React Navigation ainda emite **`transitionStart`/`transitionEnd`** para o push.
- A janela observada é curta (~23ms), o que casa com o relato de **1–2 frames** de ghosting.
- Notavelmente, `transitionStart` ocorre **depois** de `onLayout` e até depois de `rAF 3` do Preferences (na amostra). Isso indica que os eventos de transição não estão alinhados 1:1 ao primeiro frame efetivamente composto/desejado, e que pode existir um pequeno intervalo em que a composição nativa ainda expõe o screen anterior.

### Amostra E (cover via `Modal` + observação visual)

Logs (2026-01-16):

```
[NavTrace +31444ms] Tap open Preferences {"activeTab":"pontos","fromPathname":"/","fromSegments":"(app)/(tabs)/(pontos)","headerBg":"#0E2A24"}
...
[NavTrace +31574ms] Preferences DEBUG cover show
...
[NavTrace +32079ms] Preferences DEBUG cover hide
```

**Observação visual reportada:** parece ser **Pontos → (tela magenta) → Preferences**, sem elementos do header de tabs “por cima” do magenta.

**Implicação:** se confirmado, isso enfraquece bastante a hipótese “header acima do Stack via portal/overlay global”, porque o `Modal` nativo tende a ficar acima de toda a árvore React.

**Próximo passo experimental:** amplificar o sinal do header antigo durante `/preferences`:

- DEV-only: `TabsHeaderWithPreferences` fica **gigante** e verde neon (amplificação armada **no tap**, por ~2s, para não depender do `pathname` já ter mudado).
- DEV-only: após o `cover hide`, o Preferences faz um “**underlay peek**” curto (fundo transparente por alguns ms) para tornar qualquer underlay óbvio.

**Resultado (nova execução):** mesmo com:

- `DEBUG ghost amplify armed` no tap
- `TabsHeader onLayout` com altura grande (~354px)
- `Preferences DEBUG underlay peek on` (fundo do Preferences transparente por alguns ms)

...não foi observado **nenhum** frame com o verde neon do header.

**Leitura:** o `TabsHeaderWithPreferences` está **montado e medido**, mas aparentemente fica **100% ocluído** pelo card/screen de `/preferences` fora da janela de transição. Isso torna bem improvável que o ghosting original seja “o TabsHeader vazando por cima”; se existe ghosting, ele provavelmente acontece dentro de uma janela curta do próprio push (composição/transição) ou vem de outro elemento (ex.: background/card do Stack, top-tabs bar, etc.).

**Nota:** o cover magenta pode mascarar ghosting que aconteça nos primeiros ~ms do push. Para reproduzir sem mascarar (DEV), foi adicionado um toggle para desativar o cover na próxima navegação via **long-press** no botão de abrir Preferences.

**Novo experimento (DEV):** “first-frame stamp” do Preferences

- Ao montar o Preferences, desenha um overlay **opaco** (cyan/teal) gigante escrito **PREFERENCES** por ~500ms e loga `Preferences DEBUG stamp show/hide`.
- Objetivo: separar claramente:
  - “a tela antiga ainda está no frame” (antes do stamp aparecer), vs
  - “o Preferences já está no frame” (stamp visível), e detectar qualquer _mistura_ (se qualquer elemento antigo aparecer junto com o stamp).

Interpretação:

- Se você vê o verde do TabsHeader **junto** do stamp opaco, então o verde está **acima** do Preferences (overlay / z-order acima), o que é bem inesperado.
- Se o verde some assim que o stamp aparece, mas você ainda percebe “fundo mudando” durante o push, isso é compatível com **underlay/transparência** no nível do Stack/card durante a janela de transição.

**Evidência adicional (stamp com altura do header):** ao ajustar o stamp para ter a mesma altura do header (via medida do `TabsHeader onLayout`), foi observado que **não existe nenhum instante em que o verde e o cyan aparecem ao mesmo tempo**. A sequência visual vira:

- Pontos
- (ainda Pontos) com header verde (debug)
- Preferences + barra cyan (stamp)
- Preferences (stamp some)

Isso reforça que o "verde" pertence ao frame antigo (tabs) e não está sendo composto junto com o frame do Preferences.

## 6) Interpretação (o que os logs devem responder)

A partir dos logs, queremos responder:

- O `(tabs)` layout e o `TabsHeaderWithPreferences` chegam a **unmountar** ao abrir Preferences? Ou permanecem montados (apenas ocultos)?
- O `PreferencesRoute`/`Preferences UI` montam **antes** do `(tabs)` ficar invisível?
- Existe diferença entre `mount` e `layoutEffect commit` que indique 1-frame de “buraco” visual?

Com a amostra já dá para afirmar:

- O mundo `(tabs)` não some “instantaneamente” do ponto de vista do React (ele continua processando commits após o push).
- Além disso, os eventos de `focus/blur` não representam necessariamente “o frame já desenhado”; eles indicam o estado de navegação, que pode mudar antes da composição final no UI thread.
- Logo, o ghosting pode ocorrer se a tela `/preferences` deixar o screen anterior aparecer por baixo (transparência/coverage por 1 frame) OU se algum elemento do header de tabs estiver acima do Stack (portal/overlay).

## 7) Root cause mais provável (com base na amostra)

O comportamento observado é compatível com:

- **O Stack mantém o screen anterior (tabs) montado durante o push**, e o layout/header de tabs ainda processa pelo menos um commit após `/preferences` ter montado.

E, especificamente, a amostra B sugere que o “hard cut” no nível de frame não é garantido apenas por remover `fade`, porque:

- O `/preferences` pode ganhar foco antes do `(tabs)` perder foco.
- O tabs ainda processa `layoutEffect` com `pathname: /preferences`.

Ou seja: existe um período real em que **o estado de navegação e o ciclo de render/commit não estão alinhados ao critério Frame N / Frame N+1**.

O ghosting visual em si depende de uma segunda condição (a confirmar):

1. **Preferences não cobre 100% do frame imediatamente** (ex.: algum container/transição com transparência por 1 frame), expondo o screen tabs por baixo; ou
2. **Algum elemento do header de tabs está fora do contexto do screen tabs** (portal/overlay), ficando acima do Stack e portanto visível junto com `/preferences`.

Com a amostra C, dá para reduzir bastante o espaço de incerteza:

- O `TabsHeaderWithPreferences` está comprovadamente **presente e medido em `y=0`** durante `/preferences` por pelo menos 1s.
- Então, se o ghosting é de poucos frames, o mecanismo mais provável é **"underlay revelado"** (tela nova não cobre o frame imediatamente em algum ponto do push) e não um overlay persistente acima do Stack.

### 7.1) Hipóteses refinadas de problema (priorizadas)

As hipóteses abaixo são as mais compatíveis com o conjunto de evidências coletadas até agora.

#### H1 — Handoff (frame antigo → frame novo), não “dois no mesmo frame”

O que parece “ghosting do header” é, na prática, um período em que **o frame ainda é o mundo `(tabs)`**, e só depois o frame passa a ser o Preferences.

Evidências:

- O experimento do **stamp com altura do header** mostrou que **não há instante com verde + cyan ao mesmo tempo**. Sequência observada: tabs → (tabs com verde) → preferences + cyan → preferences.
- Isso indica “troca de frame” (handoff) e não composição simultânea de elementos de duas telas.

Implicação:

- O critério “Frame N / Frame N+1” pode falhar não por sobreposição, mas porque o **push não consegue produzir o novo frame imediatamente** (custo de navegação/mount/layout > 1 frame).

#### H2 — Janela de transição/composição do Stack expõe background “intermediário”

Durante a troca, o usuário percebe que o “fundo do Preferences fica diferente”. Isso é compatível com um background do container do Stack (ou do card) que aparece por alguns ms/frames, mesmo quando `animation: "none"`.

Evidências:

- `transitionStart/transitionEnd` existe mesmo sem animação, e a janela observada é curta (ordem de dezenas de ms).

#### H3 — O screen anterior permanece montado (normal) e reage a commits, mas fica ocluído

O `(tabs)` e o `TabsHeaderWithPreferences` continuam vivos e medidos após ir para `/preferences`, mas **isso não implica que estejam visíveis**.

Evidências:

- Heartbeats e `TabsHeader onLayout` em `/preferences` por ≥1s.
- Mesmo assim, não há frame com verde + cyan simultâneos (oclusão por composição do card/screen novo).

### 7.2) Hipóteses enfraquecidas / descartadas (com evidência)

#### D1 — “Header de tabs acima do Stack via portal/overlay global”

Enfraquecida.

Evidências:

- Com `Modal` nativo opaco (magenta), não foi observado header por cima. Se o header estivesse acima de toda a árvore, ele deveria aparecer sobre o `Modal`.

#### D2 — “Verde e Preferences no mesmo frame por zIndex do header”

Enfraquecida.

Evidências:

- No experimento com **stamp do Preferences** (e principalmente com o stamp na **mesma altura do header**), não foi observado verde+cyân simultâneo.

## 8) Hipóteses de solução (NÃO implementadas)

As soluções abaixo são hipóteses (direções) para atingir o critério “hard cut”. Elas estão ordenadas por custo/benefício e aderência ao que os logs sugerem.

### S1 — Garantir opacidade e cor de fundo no nível do navigator/card (não só no componente)

Ideia:

- Forçar o background do **card/screen do Stack** (ou `contentStyle`) para uma cor sólida, evitando qualquer transparência/background default durante a janela de troca.

O que isso resolveria:

- H2 (background intermediário) e parte de H1 quando o problema percebido é “fundo muda / revela underlay”.

Como validar rapidamente (sem refator grande):

- Definir explicitamente `contentStyle`/`cardStyle` do screen de `/preferences` para ter `backgroundColor` sólido e ver se a percepção de “fundo mudando” desaparece.

### S2 — Usar stack nativo / `react-native-screens` corretamente (reduzir frames intermediários)

Ideia:

- Garantir que a navegação esteja usando um stack nativo quando possível, e que `react-native-screens` esteja habilitado/atualizado.

O que isso resolveria:

- Pode reduzir o tempo em que o screen anterior permanece “ativo” no pipeline de composição e reduzir variações de background durante o push (H2/H3).

Como validar:

- Confirmar se a rota `/preferences` está em native stack (quando aplicável) e comparar a janela percebida.

### S3 — Ajustes de lifecycle do screen anterior: `detachInactiveScreens` / freeze

Ideia:

- Desacoplar/detachar screens inativos ou congelar o screen anterior para reduzir trabalho e chance de commits “tardios” durante o push.

O que isso resolveria:

- Pode reduzir o “ruído” de commits do mundo `(tabs)` após iniciar o push (H3), embora não garanta hard cut por si só.

Como validar:

- Ativar/desativar `detachInactiveScreens` e/ou opções de freeze e comparar: tempo até o primeiro frame do Preferences e se o “fundo intermediário” desaparece.

### S4 — “Cover de produção” (placeholder) para garantir hard cut perceptível

Ideia:

- Assumir que “Frame N+1” estrito após o tap é inviável em alguns dispositivos, e garantir a UX via um **cover imediato** (cor sólida igual ao Preferences, ou skeleton) mostrado no tap, enquanto o push/mount acontece.

O que isso resolveria:

- H1: o usuário nunca veria frames do mundo antigo após o tap, mesmo que o Preferences demore ~80–150ms para montar/layout.

Como validar:

- Trocar o magenta (DEV) por um cover com a cor real do Preferences e medir se o problema “sumiu” visualmente.

Trade-off:

- Tecnicamente ainda existe latência; a diferença é que ela fica “mascarada” por uma transição de UX controlada.

### S5 — Pré-aquecimento (pre-warm) do Preferences

Ideia:

- Reduzir o custo do primeiro frame do Preferences (JS/layout/data) pré-carregando componentes/dados antes do push.

O que isso resolveria:

- Diminui a janela de H1 (tabs ainda desenhando antes do Preferences existir), mas não garante “N+1” estrito.

Como validar:

- Medir `tap → Preferences onLayout` antes/depois de otimizações (lazy imports, evitar trabalho pesado no mount, prefetch de queries).

## 9) Próximas evidências úteis (se quisermos fechar 100%)

- Medir consistentemente `tap → Preferences UI onLayout` (em ms e em frames) em dispositivos diferentes.
- Confirmar qual navigator/stack está de fato renderizando `/preferences` (JS stack vs native stack) e se há `react-native-screens` habilitado.
- Variar `contentStyle/cardStyle` do screen de Preferences para ver se elimina a percepção de “fundo intermediário”.

---

Status: Instrumentação adicionada; aguardando coleta de logs para fechar timeline e conclusão.
