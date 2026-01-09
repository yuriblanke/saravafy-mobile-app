# Diagnóstico — Navegação, layouts e hipótese do “frame de sobreposição”

Data: 2026-01-09

Objetivo deste documento: **mapear o estado atual real** da navegação (Expo Router/React Navigation), **como as rotas herdam layouts/containers**, e **formular hipóteses técnicas** (baseadas no código) para o problema sistêmico de UX em transições de stack onde duas telas aparecem simultaneamente por um frame.

Restrições deste diagnóstico:

- Não propõe correção definitiva.
- Não altera comportamento.
- Serve como base para refatoração consciente.

---

## Estrutura de rotas e layouts

### 1) Árvore real de rotas (baseada em `app/`)

Diagrama (simplificado):

```
app/
  _layout.tsx                        # RootLayout: providers + Slot
  +not-found.tsx
  +html.tsx
  politica-de-privacidade.tsx
  modal.tsx

  (auth)/
    _layout.tsx                      # Auth Stack (header off)
    login.tsx
  auth/
    callback.tsx                     # bridge transitório pós OAuth

  (app)/
    _layout.tsx                      # SaravafyScreen + AppHeaderWithPreferences + Stack
    index.tsx                         # redirect para /(app)/(tabs)/(pontos)
    player.tsx
    access-manager.tsx                # modal
    terreiro-editor.tsx               # modal
    review-submissions/
      index.tsx
      [submissionId].tsx
    l/
      [tipo]/[id].tsx                 # deep link bridge genérico
      ponto/[id].tsx
      colecao/[id].tsx
      terreiro/[id].tsx
    (tabs)/
      _layout.tsx                     # MaterialTopTabs (tabBar oculto)
      (pontos)/
        _layout.tsx                   # Stack de Pontos (header off)
        index.tsx
      (terreiros)/
        _layout.tsx                   # Stack de Terreiros (header off)
        index.tsx
        terreiro.tsx
        collection/[id].tsx

  (fullscreen)/
    _layout.tsx                       # Stack isolado: sem header/tabs + background sólido
    collection/[id]/edit.tsx
    terreiro-collections/[terreiroId]/edit.tsx
```

Observações relevantes (do código):

- `app/_layout.tsx` é o **root**: monta providers (React Query, Auth, Preferences, RootPager, Toast, gates) e renderiza `RootLayoutNav` + overlays persistentes (`InviteGate`, `CuratorInviteGate`, etc.).
- `app/(app)/_layout.tsx` é o **shell visual do app**:
  - desenha o background (`SaravafyScreen`),
  - desenha o header global (`AppHeaderWithPreferences`),
  - define um `Stack` com `contentStyle: { backgroundColor: "transparent" }` e `animation: "none"`.
- `app/(app)/(tabs)/_layout.tsx` implementa as abas **Pontos ↔ Terreiros** como `createMaterialTopTabNavigator()` (tabBar oculto), com `sceneStyle: { backgroundColor: "transparent" }`.
- `app/(app)/(tabs)/(pontos)/_layout.tsx` e `app/(app)/(tabs)/(terreiros)/_layout.tsx` criam **Stacks por aba**, também com `contentStyle` transparente e `animation: "none"`.
- `app/(fullscreen)/_layout.tsx` é um grupo **fora do shell `(app)`**: define Stack sem header/tabs e com **background sólido** (`paper50`/`forest900`), e `animation: "fade"` apenas neste grupo.

### 2) Quais rotas herdam tabs, header global e backgrounds

Definições (do projeto):

- “Tabs” = `MaterialTopTabNavigator` em `app/(app)/(tabs)/_layout.tsx`.
- “Header global” = componente `AppHeaderWithPreferences` desenhado em `app/(app)/_layout.tsx` (não é o header do React Navigation).
- “Background do shell” = `SaravafyScreen` desenhado em `app/(app)/_layout.tsx`.

Mapa:

- Rotas **com tabs**: tudo sob `app/(app)/(tabs)/**`.
  - Ex.: `/(app)/(tabs)/(pontos)` e `/(app)/(tabs)/(terreiros)`.
- Rotas **sem tabs** mas ainda dentro do shell `(app)`:
  - `/(app)/player` (tela imersiva, mas ainda sob `SaravafyScreen`).
  - `/(app)/terreiro-editor` e `/(app)/access-manager` (modais).
  - `/(app)/review-submissions/*`.
  - `/(app)/l/*` (bridges de deep link).
- Rotas **full screen reais (fora do shell `(app)`)**:
  - Tudo sob `app/(fullscreen)/**`.
  - Ex.: `/collection/[id]/edit` e `/terreiro-collections/[terreiroId]/edit`.

### 3) Rotas “equivalentes” / duplicidade semântica (risco)

Mesmo conceito pode ser alcançado por paths diferentes (dependendo de `router.push/replace`):

- Player:
  - `/(app)/player` (rota declarada em `app/(app)/player.tsx`)
  - Em alguns bridges há `router.replace({ pathname: "/(app)/player", ... })`.
- Tabs:
  - `/(app)` hoje apenas redireciona para `/(app)/(tabs)/(pontos)` via `app/(app)/index.tsx`.

Risco: diferenças de pathname podem gerar histórico/stack com entradas redundantes, e também alterar `useSegments()` (ex.: para lógica de “suspender header global” em `app/(app)/_layout.tsx`).

---

## Fluxos principais de navegação

### 1) Terreiros → Collection → Ponto/Player

Sequência típica (nível de navigators):

1. Terreiros (aba)

   - Rota: `/(app)/(tabs)/(terreiros)`
   - Navigator: TopTabs ➜ Stack(terreiros)

2. Collection (ainda dentro da aba Terreiros)

   - Rota: `/(app)/(tabs)/(terreiros)/collection/[id]`
   - Navigator: TopTabs ➜ Stack(terreiros) (push dentro do stack da aba)

3. Player (fora das tabs)
   - Rota: `/(app)/player`
   - Navigator: Stack do grupo `(app)` (push acima de `(tabs)`)

Observação: o passo 3 cruza a fronteira “tabs ➜ stack do `(app)`”, mantendo `(tabs)` montado atrás.

### 2) Pontos → Ponto/Player

1. Pontos (aba)

   - Rota: `/(app)/(tabs)/(pontos)`
   - Navigator: TopTabs ➜ Stack(pontos)

2. Player
   - Rota: `/(app)/player`
   - Navigator: Stack do grupo `(app)` (push acima de `(tabs)`)

### 3) Troca entre abas (Pontos ↔ Terreiros)

- Feita pelo `MaterialTopTabNavigator` (TopTabs) em `app/(app)/(tabs)/_layout.tsx`.
- Controle programático de troca via `TabControllerContext` (registro de `goToTab`).
- `swipeEnabled` pode ser desabilitado quando `RootPagerContext.isBottomSheetOpen` está true.

---

## Containers visuais e backgrounds

### 1) Containers/layouts que desenham UI persistente

No root (`app/_layout.tsx`):

- Providers: React Query, Auth, Preferences, RootPager, Toast.
- Overlays persistentes:
  - `TerreirosRealtimeSync`
  - `InviteGate`
  - `CuratorInviteGate`

No shell do app (`app/(app)/_layout.tsx`):

- `SaravafyScreen`: background/texture/gradiente do app.
- `AppHeaderWithPreferences`: header global (UI própria do app).
  - Suspenso (não desmontado) quando `leaf` em `useSegments()` é:
    - `player`, `edit`, `terreiro-editor`, `access-manager`.

### 2) Transparência como padrão (impacto em transições)

O projeto explicitamente usa `backgroundColor: "transparent"` em múltiplos níveis:

- `app/(app)/_layout.tsx` (Stack do app)
- `app/(app)/(tabs)/_layout.tsx` (sceneStyle do TopTabs)
- `app/(app)/(tabs)/(pontos)/_layout.tsx` e `app/(app)/(tabs)/(terreiros)/_layout.tsx` (stacks das abas)

Consequência arquitetural:

- As telas filhas frequentemente **não têm background opaco próprio**; elas “deixam aparecer” o `SaravafyScreen`.
- Em navegação por stack, a tela anterior permanece montada atrás; se a nova tela inicia com UI parcial/placeholder/transparente (por render inicial ou carregamento), o usuário pode ver **a tela anterior através**.

O grupo `app/(fullscreen)` é uma exceção importante:

- `contentStyle` define background sólido, evitando que o stack revele a tela anterior por transparência.

---

## Hipóteses para o problema de sobreposição

Hipóteses fundamentadas no estado atual do código (não “chutes”):

1. **Stacks com fundo transparente revelam a tela anterior**

   - Evidência: `contentStyle: { backgroundColor: "transparent" }` aparece no Stack do `(app)` e nos Stacks das abas.
   - Mecanismo: a tela anterior continua montada atrás; se a nova tela não pinta um background opaco imediatamente, o frame mostra “duas telas”.

2. **Transições cruzando a fronteira tabs ➜ stack do `(app)` aumentam o efeito**

   - Ex.: abrir `/(app)/player` a partir de uma screen dentro de `/(app)/(tabs)/...`.
   - Mecanismo: o navigator `(tabs)` permanece montado; qualquer transparência na screen de destino (ou no container do Stack) pode expor o conteúdo do tab atual.

3. **Inconsistência de paths (histórico/segmentos) pode gerar stack redundante**

   - Evidência: há uso de `"/player"` e também `"/(app)/player"` em bridges.
   - Risco: entradas duplicadas no histórico e variações em `useSegments()` podem afetar lógica de UI global (ex.: suspensão do header global).

4. **“Primeiro frame” sem background por render incremental/carregamento**

   - Muitas telas (ex.: Collection) carregam dados e exibem estado “Carregando…”.
   - Se a estrutura inicial não cobre o viewport com algo opaco, a tela anterior aparece por baixo nesse intervalo.

5. **SetState antes de navegar (precisa ser auditado por fluxo)**
   - Este documento não confirma ocorrências em todos os fluxos; porém é um padrão que pode causar um render intermediário visível antes do `router.push`.
   - Exemplo a procurar: handlers que fazem `setState` e só depois navegam.

---

## Pontos de atenção para refatoração futura

Sem propor solução definitiva, pontos que merecem padronização/inspeção por serem “sensíveis” ao bug:

- **Política de backgrounds**: telas de Stack devem explicitar se são opacas ou transparentes (e em qual nível).
- **Consolidação de paths**: padronizar uso de `pathname` (ex.: sempre `/(app)/player` ou sempre `/player`) para evitar histórico redundante e diferenças de `segments`.
- **Navegação cruzando tabs**: mapear todos os pontos que fazem push para rotas fora de `(tabs)` (ex.: player, modais) e checar comportamento.
- **Auditoria de handlers**: em fluxos críticos (Terreiros → Collection → Player), verificar se existe qualquer `setState` antes do push.
- **Overlays persistentes**: `InviteGate/CuratorInviteGate/TerreirosRealtimeSync` vivem acima da navegação; entender se algum overlay pode contribuir para percepção de “duas telas”.

---

## Histórico (preservado)

O conteúdo abaixo foi mantido como registro de investigação anterior (2026-01-07). Algumas partes descrevem uma arquitetura antiga (ex.: RootPager com TabView) e podem estar desatualizadas em relação ao estado atual.

# Investigação — Swipe entre abas “Pontos” ↔ “Terreiros” e conflito com Player

Data: 2026-01-07

> Observação sobre paths: este relatório lista paths completos do Windows, sempre prefixados com `c:\saravafy\`.

## Contexto e objetivo

Precisamos investigar e corrigir o comportamento de navegação via **swipe** entre as abas **“Pontos”** e **“Terreiros”**.

### Problema atual (reprodução)

1. Estando na aba Pontos, faço swipe para ir para a aba Terreiros.
2. Se eu já estava “dentro” de Terreiros (ex: tela do terreiro específico mostrando collections, ou tela listando pontos de uma collection), o swipe de volta para Pontos **NÃO** funciona.
3. Além disso: quando tento swipar e o gesto termina em cima de um card (collection/ponto), o app interpreta como toque e abre o card (abre a collection ou abre o ponto). Isso é ruim: swipe nunca deve virar “tap acidental”.

### Comportamento desejado

A) O swipe horizontal deve estar **SEMPRE** ativo e consistente entre as abas “Pontos” e “Terreiros”, independentemente de em que profundidade eu esteja na navegação dentro da aba Terreiros.

B) O estado/navegação interna da aba Terreiros deve ser preservado:

- Exemplo: se estou na tela “pontos de uma collection” em Terreiros, faço swipe para Pontos e depois volto para Terreiros, eu devo voltar exatamente para a mesma tela “pontos de uma collection” (com os mesmos params, scroll e estado do que for possível).

C) Exceção: quando um ponto é aberto no Player (tela/modal/rota do player), o swipe **NÃO** pode mais trocar de abas. A partir desse momento, o swipe horizontal deve ser exclusivamente para navegar entre pontos dentro do Player (próximo/anterior ponto no player). Ao sair/fechar o player, volta a valer a regra A/B.

---

## 1) Arquitetura atual de navegação

### 1.1) Quais libs e padrões estão sendo usados

- **Expo Router** (baseado em React Navigation) usando um **Stack** para o grupo `(app)`.
  - Layout principal: `c:\saravafy\app\(app)\_layout.tsx`
- Swipe entre “Pontos” e “Terreiros” é feito por **react-native-tab-view** (não usa `Tabs` do Expo Router).
  - Root pager: `c:\saravafy\app\(app)\index.tsx`
- Gestos fora do player: **PanResponder** (React Native) em overlay global.
  - Overlay: `c:\saravafy\src\components\AppTabSwipeOverlay.tsx`
- Player: swipe horizontal interno entre pontos via **FlatList horizontal + pagingEnabled**.
  - Player: `c:\saravafy\src\screens\Player\PlayerScreen.tsx`

### 1.2) Onde exatamente está implementado o swipe entre abas

Existem **dois mecanismos**:

1. **RootPager (TabView) — quando a rota atual é `/(app)` (pathname `/`)**

- Arquivo: `c:\saravafy\app\(app)\index.tsx`
- Implementa `<TabView />` com `renderTabBar={() => null}`.
- Observação: `swipeEnabled` é condicionado por `RootPagerContext.isBottomSheetOpen`.

2. **Overlay global de swipe — para telas profundas como `/terreiro` e `/collection/[id]`**

- Arquivo: `c:\saravafy\src\components\AppTabSwipeOverlay.tsx`
- Montado globalmente no layout do grupo `(app)`.
- Responsável por:
  - reconhecer pan horizontal,
  - impedir toque acidental em cards via gate/block,
  - navegar para `/(app)` e restaurar estado.

### 1.3) Como “Pontos” e “Terreiros” estão estruturados no filesystem (Expo Router)

- Layout do grupo `(app)`:

  - `c:\saravafy\app\(app)\_layout.tsx`
  - Define o Stack com as screens:
    - `index` (RootPager)
    - `terreiro`
    - `collection/[id]`
    - `player`
    - além de rotas auxiliares e modais (`terreiro-editor`, `access-manager`, etc)

- RootPager (duas páginas):

  - `c:\saravafy\app\(app)\index.tsx`
  - Renderiza:
    - “Pontos”: `c:\saravafy\src\screens\Home\Home.tsx`
    - “Terreiros”: `c:\saravafy\src\screens\Terreiros\Terreiros.tsx`

- Rotas profundas (Stack):
  - `/terreiro` → `c:\saravafy\app\(app)\terreiro.tsx` → `c:\saravafy\src\screens\Terreiro\Terreiro.tsx`
  - `/collection/[id]` → `c:\saravafy\app\(app)\collection\[id].tsx` → `c:\saravafy\src\screens\Collection\Collection.tsx`
  - `/player` → `c:\saravafy\app\(app)\player.tsx` → `c:\saravafy\src\screens\Player\PlayerScreen.tsx`

---

## 2) Por que o swipe “morre” em profundidade

### 2.1) Identificar em qual nível o gesto deixa de ser reconhecido

- O swipe do `<TabView>` existe **somente** no RootPager (`pathname === "/"` dentro do grupo `(app)`).

  - Arquivo: `c:\saravafy\app\(app)\index.tsx`
  - Comentário no próprio arquivo sugere explicitamente que rotas profundas são “Stack normal sem swipe”.

- Ao navegar para telas profundas (`/terreiro`, `/collection/[id]`), o usuário **sai do RootPager** (TabView) e o swipe de abas passa a depender **exclusivamente** do overlay global:
  - `c:\saravafy\src\components\AppTabSwipeOverlay.tsx`

### 2.2) Conflitos potenciais e componentes capturando pan/touch

O overlay usa `PanResponder` e tenta capturar pan horizontal “real” (dominância horizontal + thresholds) para:

- bloquear press acidental,
- navegar de volta para `/(app)` e trocar a aba,
- (opcionalmente) restaurar um href profundo.

**Hipótese (forte): overlay não recebe eventos por causa de `pointerEvents`.**

Evidência no overlay:

- O `Animated.View` do overlay é renderizado com `pointerEvents={panPointerEvents}`.
- O estado inicial é `"none"` e só muda para `"auto"` depois que o PanResponder decide capturar.

Trecho relevante (curto) — `c:\saravafy\src\components\AppTabSwipeOverlay.tsx`:

```tsx
<Animated.View
  pointerEvents={panPointerEvents}
  style={[styles.overlay, { transform: [{ translateX }] }]}
  {...panResponder.panHandlers}
/>
```

**Risco:** com `pointerEvents="none"`, o overlay não entra no hit-test, então não recebe eventos de toque/move, e o PanResponder não chega a capturar; logo, o swipe “morre” em profundidade.

**Como confirmar (sem mudar código):**

- Rodar em DEV e checar logs existentes:
  - `"[SwipeOverlay] grant"`, `"move"`, `"release"`.
- Se em `/terreiro` ou `/collection/[id]` os logs não aparecem ao tentar swipar, confirma que o overlay não está recebendo eventos.

### 2.3) Gesture handler root ausente (GestureHandlerRootView, etc)

- Aqui o overlay e outros gestos principais usam **PanResponder** (React Native), não RNGH.
- Portanto, ausência de `GestureHandlerRootView` não é hipótese principal para esse bug específico.

---

## 3) Por que o swipe vira “tap” em cima de card

### 3.1) Identificar qual componente de card está capturando press

Os cards navegam usando `Pressable` com `onPress`.

Exemplos:

- Terraeiro → abrir collection: `c:\saravafy\src\screens\Terreiro\Terreiro.tsx`
- Collection → abrir player: `c:\saravafy\src\screens\Collection\Collection.tsx`

Exemplo curto (Collection → Player) — `c:\saravafy\src\screens\Collection\Collection.tsx`:

```tsx
<Pressable
  onPress={() => {
    if (shouldBlockPress()) return;
    router.push({ pathname: "/player", params: { collectionId, initialPontoId: item.ponto.id } });
  }}
>
```

### 3.2) Thresholds e por que o press dispara ao final do pan

O projeto já tenta impedir esse problema via:

- `GestureBlockContext` (`markSwipeRecognized()` + `shouldBlockPress()`), arquivo:
  - `c:\saravafy\contexts\GestureBlockContext.tsx`
- `GestureGateContext` (`markSwipeStart/end()` + `shouldBlockPress()`), arquivo:
  - `c:\saravafy\contexts\GestureGateContext.tsx`

O overlay chama `gestureBlock.markSwipeRecognized()` **somente quando vai navegar**:

- `c:\saravafy\src\components\AppTabSwipeOverlay.tsx`

Se o overlay não capturar o gesto (hipótese do `pointerEvents`), então:

- o press guard não é marcado,
- o `Pressable` recebe a interação,
- e o `onPress` dispara ao soltar o dedo sobre o card.

### 3.3) Proposta de correção técnica (cancelar press quando houve pan)

3 opções (podem ser combinadas):

1. **Corrigir o overlay para capturar pan horizontal de forma confiável**

- Isso faz com que:
  - o swipe funcione em profundidade,
  - o overlay consiga marcar `markSwipeRecognized` / gate,
  - e os cards parem de abrir por “tap acidental”.

2. **Padronizar o press guard**

- Hoje há mistura de `GestureGateContext` e `GestureBlockContext` em diferentes telas.
- Centralizar/normalizar reduz pontos cegos.

3. **Migrar para RNGH Gestures (Tap + Pan)**

- Usar `requireFailure`/`simultaneousHandlers` e thresholds explícitos.
- Mais robusto, mas tem maior custo e mexe na arquitetura de gestos.

---

## 4) Preservação do estado da aba Terreiros

### 4.1) Confirmar se hoje o tab troca desmonta/remonta

- No RootPager (TabView), as duas cenas tendem a permanecer montadas (não vi `lazy` explicitamente habilitado).
- **Porém**, em telas profundas (`/terreiro`, `/collection/[id]`), não há TabView: é Stack.

### 4.2) Flags relevantes (unmountOnBlur, detachInactiveScreens, freezeOnBlur, lazy)

- No layout `(app)`, o Stack tem `animation: "none"` e não vi `unmountOnBlur/freezeOnBlur` configurados explicitamente.
  - `c:\saravafy\app\(app)\_layout.tsx`

### 4.3) Se existe um “reset” ao voltar para Terreiros

O overlay, ao navegar em profundidade, faz o seguinte fluxo:

- `router.push("/(app)")`
- troca aba
- se houver `restoreHref`, faz `router.push(restoreHref)`

Trecho (curto) — `c:\saravafy\src\components\AppTabSwipeOverlay.tsx`:

```tsx
router.push("/(app)");
requestAnimationFrame(() => tabController.goToTab(targetTab));
if (shouldRestoreDeep)
  requestAnimationFrame(() => router.push(restoreHref as any));
```

**Hipótese:** isso tende a **remontar/duplicar** telas profundas (porque é `push`), então não preserva scroll/estado “vivo” (requisito B).

### 4.4) Como params são passados hoje

- Padrão predominante: `router.push({ pathname, params })`.
- Existe um mecanismo de “último href por aba” em:
  - `c:\saravafy\contexts\TabControllerContext.tsx`

---

## 5) Exceção do Player

### 5.1) Como o Player é aberto hoje

- O Player é uma rota do Stack: `player`.
  - Layout: `c:\saravafy\app\(app)\_layout.tsx`
  - Rota: `c:\saravafy\app\(app)\player.tsx`
  - Tela: `c:\saravafy\src\screens\Player\PlayerScreen.tsx`

### 5.2) Onde está implementado o swipe para trocar de ponto no player

- `FlatList` horizontal com `pagingEnabled`.
- Arquivo: `c:\saravafy\src\screens\Player\PlayerScreen.tsx`

Trecho (curto):

```tsx
<FlatList
  horizontal
  pagingEnabled
  data={items}
  onMomentumScrollEnd={(e) => {
    const nextIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    if (Number.isFinite(nextIndex)) setActiveIndex(nextIndex);
  }}
/>
```

### 5.3) Como desligar swipe de tabs quando player está ativo

Hoje já existe proteção no overlay:

- Overlay desabilitado quando `pathname === "/player"`.
  - Arquivo: `c:\saravafy\src\components\AppTabSwipeOverlay.tsx`

O TabView (RootPager) não concorre porque o Player é tela do Stack, fora do RootPager.

### 5.4) Fonte de verdade para “playerOpen”

Hoje a fonte de verdade é **a rota atual**:

- `usePathname()` comparando com `"/player"` no overlay.
- `useSegments()` no layout para suspender header.

---

## 6) Evidências concretas

### 6.1) Lista dos principais arquivos inspecionados

- `c:\saravafy\app\(app)\index.tsx`
- `c:\saravafy\app\(app)\_layout.tsx`
- `c:\saravafy\src\components\AppTabSwipeOverlay.tsx`
- `c:\saravafy\contexts\RootPagerContext.tsx`
- `c:\saravafy\contexts\TabControllerContext.tsx`
- `c:\saravafy\contexts\GestureBlockContext.tsx`
- `c:\saravafy\contexts\GestureGateContext.tsx`
- `c:\saravafy\src\screens\Terreiros\Terreiros.tsx`
- `c:\saravafy\src\screens\Terreiro\Terreiro.tsx`
- `c:\saravafy\src\screens\Collection\Collection.tsx`
- `c:\saravafy\src\screens\Player\PlayerScreen.tsx`

### 6.2) Trechos curtos (pontos mais relevantes)

**(a) RootPager (TabView)** — `c:\saravafy\app\(app)\index.tsx`

```tsx
<TabView
  navigationState={{ index: ctx?.index ?? 0, routes: routes as any }}
  onIndexChange={(next) => ctx?.setIndex(next)}
  swipeEnabled={!ctx?.isBottomSheetOpen}
  renderTabBar={() => null}
  renderScene={renderScene as any}
/>
```

**(b) Overlay: desabilitado no player** — `c:\saravafy\src\components\AppTabSwipeOverlay.tsx`

```tsx
const isPlayerActive = pathname === "/player";
const isOverlayDisabled =
  isPlayerActive || isModalActive || !!rootPager?.isBottomSheetOpen;
```

**(c) Overlay: pointerEvents controlado (suspeito)** — `c:\saravafy\src\components\AppTabSwipeOverlay.tsx`

```tsx
<Animated.View
  pointerEvents={panPointerEvents}
  style={[styles.overlay, { transform: [{ translateX }] }]}
  {...panResponder.panHandlers}
/>
```

**(d) Overlay: navegação/restauração em tela profunda** — `c:\saravafy\src\components\AppTabSwipeOverlay.tsx`

```tsx
router.push("/(app)");
requestAnimationFrame(() => {
  tabController.goToTab(targetTab);
});
if (shouldRestoreDeep) {
  requestAnimationFrame(() => {
    router.push(restoreHref as any);
  });
}
```

### 6.3) Diagnóstico (causa raiz provável)

**Problema 1: swipe não volta para Pontos em profundidade**

- Causa raiz provável: em profundidade não há TabView; depende do overlay.
- Hipótese forte: overlay não recebe eventos por iniciar `pointerEvents="none"` e tentar alternar para `"auto"` somente depois que capturar (paradoxo de hit-test).
- Como confirmar: logs do overlay não aparecem ao swipar em `/terreiro` ou `/collection/[id]`.

**Problema 2: swipe dispara tap em card**

- Causa raiz provável: como overlay não captura, o Pressable recebe o toque e `onPress` dispara ao final do arrasto.
- `GestureBlock/Gate` só bloqueia press quando o overlay marca swipe reconhecido — o que não ocorre se overlay não captura.

### 6.4) Abordagens possíveis (da mais recomendada à alternativa)

1. **(Recomendada)** Transformar o conceito em “tabs reais com stacks por aba”

- Cada aba tem seu próprio stack; trocar abas preserva a navegação interna.
- Prós: atende A e B corretamente; Player fica fora e atende C naturalmente.
- Contras: refatoração maior.

2. **(Menor impacto)** Consertar overlay para capturar pan horizontal com confiabilidade

- Prós: tende a resolver A e o tap acidental rapidamente.
- Contras: não resolve B plenamente porque a restauração atual usa `push` e pode remount/duplicar telas (scroll/estado).

3. **(Intermediária)** Manter arquitetura, mas mudar restauração para evitar duplicação/remount

- Prós: pode aproximar B sem refatorar tabs completas.
- Contras: pode ficar frágil/complexo (gerenciar stacks manualmente).

---

## Plano de Implementação (proposto — sem codar ainda)

1. Confirmar a hipótese do overlay (instrumentação já existe)

- Testar swipe em `/terreiro` e `/collection/[id]` e validar se aparecem logs `grant/move/release` do overlay.

2. Corrigir o reconhecimento/captura do swipe em profundidade (para atender A)

- Ajustar overlay para receber eventos sempre e capturar só quando thresholds horizontais forem atingidos.

3. Corrigir “tap acidental” de forma determinística (para atender A)

- Garantir marcação de swipe reconhecido antes de qualquer `Pressable` reagir.
- Padronizar uso do gate/block em todos os cards navegáveis.

4. Decisão de arquitetura para preservar profundidade/estado (para atender B)

- Preferência: stacks por aba (tabs reais).
- Alternativa: evitar `push` duplicado na estratégia de restore (usar `replace/back` conforme apropriado).

5. Exceção do Player (para atender C)

- Manter overlay desabilitado em `/player`.
- Se migrar para tabs reais, assegurar que gestures do player tenham prioridade sobre swipe de tabs.

---

## Investigação — Swipe Overlay e pointerEvents

### 1) Hipótese investigada

O `AppTabSwipeOverlay` não recebe eventos de toque em telas profundas (`/terreiro`, `/collection/[id]`) porque o overlay inicia com `pointerEvents="none"` e só tenta mudar para `"auto"` depois de “decidir capturar”. Isso cria um paradoxo de hit-test: com `pointerEvents="none"`, o overlay não entra no hit-test e não recebe os eventos necessários para decidir capturar.

Arquivo instrumentado:

- `c:\saravafy\src\components\AppTabSwipeOverlay.tsx`

### 2) Experimento A (baseline)

Baseline = comportamento atual do overlay:

- `pointerEventsEffective` acompanha o estado interno (`pointerEventsRaw`), que começa como `"none"`.
- O overlay só tenta mudar para `"auto"` dentro de `moveShouldSet*` quando `shouldCaptureSwipe(dx,dy)` retorna `true`.

Como rodar:

1. Navegue para `/terreiro`.
2. Faça swipe horizontal em:

- área vazia/fora de cards
- em cima de um card

3. Repita em `/collection/[id]`.
4. Abra `/player` e confirme que o overlay fica desabilitado.

### 3) Experimento B (forçado)

Forçado = overlay com `pointerEventsEffective="auto"` fixo em runtime (DEV), via menu de dev:

- Abrir o Dev Menu e selecionar: `SwipeOverlay: Toggle force pointerEvents=auto`.
- Quando ativo, os logs mostram `forcePointerEventsAuto: true` e `pointerEventsEffective: "auto"`.

Repita o mesmo roteiro do Experimento A (mesmas telas e mesmos dois cenários de swipe).

### 4) Resultado observado (A vs B)

Preencher após executar a reprodução em DEV e coletar logs do console.

Critério objetivo esperado para confirmar a hipótese:

- Se no Experimento A **não aparecem** logs de callbacks do PanResponder (ex: `startShouldSet`, `moveShouldSet*`, `grant`, `move`, `release`) em `/terreiro` e `/collection/[id]`, mas no Experimento B eles **passam a aparecer**, então o `pointerEvents="none"` estava bloqueando o hit-test.

Pequenos exemplos de logs (formato esperado, prefixo único):

```text
[SwipeOverlay] {"phase":"disabled","pathname":"/player","isOverlayDisabled":true,"isPlayerActive":true,...}
[SwipeOverlay] {"phase":"moveShouldSetCapture","pathname":"/terreiro","pointerEventsEffective":"auto","dx":-32,"dy":4,"decision":true,...}
[SwipeOverlay] {"phase":"grant","pathname":"/terreiro","pointerEventsEffective":"auto",...}
```

### 5) Conclusão

- Status: **PENDENTE** (necessário rodar Experimento A e B e comparar os logs nas rotas-alvo).

### 6) Implicações para a próxima etapa

- Se a hipótese for confirmada, a próxima correção mínima provável é eliminar o paradoxo (garantir que o overlay entre no hit-test de forma controlada) antes de qualquer refatoração maior.
- Se a hipótese for refutada, a próxima linha de investigação deve focar em conflitos de gesture responder (ScrollView/FlatList), overlays acima do swipe overlay, ou short-circuit via `isOverlayDisabled`/routing.
