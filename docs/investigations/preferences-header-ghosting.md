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
- Route `/preferences`: [app/(app)/preferences.tsx](../../app/(app)/preferences.tsx)
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

1) **Preferences não cobre 100% do frame imediatamente** (ex.: algum container/transição com transparência por 1 frame), expondo o screen tabs por baixo; ou
2) **Algum elemento do header de tabs está fora do contexto do screen tabs** (portal/overlay), ficando acima do Stack e portanto visível junto com `/preferences`.

## 8) Direções de fix (NÃO implementadas)
Quando a timeline estiver confirmada, possíveis direções (a validar):
- Forçar opacidade/cobertura do screen de Preferences no nível do Stack (ex.: `contentStyle`/`cardStyle`/`backgroundColor` no screen).
- Garantir isolamento de screens via stack nativo (se não estiver usando) / `react-native-screens`.
- Evitar header absoluto com zIndex elevado fora do contexto do Stack; mover para header do próprio navigator.
- Revisar qualquer Portal/BottomSheet que possa estar acima do Stack.

Próximas evidências úteis (pra “fechar” entre (1) vs (2)):
- Logar `TabsHeader unmount` e `(tabs) layout unmount` ao abrir Preferences (se nunca acontece, tabs fica montado mesmo após a troca).
- Logar foco: `useFocusEffect` no `(tabs)` layout e na rota `/preferences` para cravar em que instante o tabs perde foco.
- Checar se existe algum `Portal` (ex.: bottom sheets) ou provider global que renderize o header fora do screen.

---
Status: Instrumentação adicionada; aguardando coleta de logs para fechar timeline e conclusão.
