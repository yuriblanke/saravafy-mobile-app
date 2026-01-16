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

## 5) Timeline (a preencher com logs)
> Preencher com a sequência real observada no Metro.

**T0 (tap):**
- `[NavTrace +…] TabsHeaderWithPreferences Tap open Preferences …`

**Esperado (hard cut):**
- Tabs layout deveria ficar totalmente “invisível” no mesmo commit em que Preferences aparece.

**Sequência observada (colar aqui):**

```
# TODO: colar logs NavTrace aqui
```

## 6) Interpretação (o que os logs devem responder)
A partir dos logs, queremos responder:
- O `(tabs)` layout e o `TabsHeaderWithPreferences` chegam a **unmountar** ao abrir Preferences? Ou permanecem montados (apenas ocultos)?
- O `PreferencesRoute`/`Preferences UI` montam **antes** do `(tabs)` ficar invisível?
- Existe diferença entre `mount` e `layoutEffect commit` que indique 1-frame de “buraco” visual?

## 7) Root cause mais provável (prévia, sem cravar)
Sem os logs ainda, a hipótese principal é:
- O Stack mantém o screen de tabs montado e visível por 1 commit durante o push, e a tela Preferences não cobre 100% imediatamente (ou por ordem de zIndex/stacking), resultando em 1 frame de composição mista.

## 8) Direções de fix (NÃO implementadas)
Quando a timeline estiver confirmada, possíveis direções (a validar):
- Forçar opacidade/cobertura do screen de Preferences no nível do Stack (ex.: `contentStyle`/`cardStyle`/`backgroundColor` no screen).
- Garantir isolamento de screens via stack nativo (se não estiver usando) / `react-native-screens`.
- Evitar header absoluto com zIndex elevado fora do contexto do Stack; mover para header do próprio navigator.
- Revisar qualquer Portal/BottomSheet que possa estar acima do Stack.

---
Status: Instrumentação adicionada; aguardando coleta de logs para fechar timeline e conclusão.
