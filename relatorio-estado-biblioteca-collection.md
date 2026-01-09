# Relatório — Estado atual (Biblioteca do Terreiro / Collection)

Data: 2026-01-09

Este documento descreve **exatamente o estado atual** do fluxo e das telas envolvidas, com foco no bug de *overlap/overlay* durante navegação e na estratégia atual de fundo (SaravafyScreen global + fundo por-cena no fluxo Terreiros + header global transparente).

## 1) Objetivo de UX (como está implementado hoje)

- O app tem um **fundo global** provido por `SaravafyScreen` no layout principal.
- O **header global** (`AppHeaderWithPreferences`) está configurado para ser **transparente**.
- No **fluxo de Terreiros** (lista → Biblioteca → Collection), o `SaravafyScreen` global fica **flat** (só `baseColor` opaco) para não existir “variant duplo” competindo.
- No fluxo de Terreiros, as telas desenham o **fundo Saravafy por-cena** via `SaravafyStackScene`.
- As cenas são **opacas desde o primeiro frame** (não dependem de Stack transparente nem de “cover” temporário).

## 2) Arquitetura atual (camadas)

### 2.1 Layout principal do app
Arquivo: [app/(app)/_layout.tsx](app/(app)/_layout.tsx)

- O app inteiro é envolvido por:
  - `SaravafyScreen theme={effectiveTheme} variant={saravafyVariant}`
- Regras para `saravafyVariant`:
  - Se estiver no fluxo de Terreiros (`segments.includes("(terreiros)")`): `"focus"` (flat)
  - Caso contrário: segue a regra antiga (root das abas: `"tabs"`; rotas empilhadas: `"stack"`)
- O `Stack` do expo-router no layout principal roda com:
  - `contentStyle: { backgroundColor: baseColor }` (opaco)
  - `animation: "none"`

Implicação direta:
- O “card” da cena (stack) é **opaco** por padrão, impedindo vazamento visual da tela anterior em frames intermediários.
- O fundo “bonito” continua existindo (Saravafy), mas **não depende** de transparência do Stack.
- No fluxo de Terreiros, o fundo global é deliberadamente flat para não competir com o fundo por-cena.

### 2.2 Header global
Arquivo: [src/components/AppHeaderWithPreferences.tsx](src/components/AppHeaderWithPreferences.tsx)

- `styles.header.backgroundColor = "transparent"`.

Arquivo (camada/ordem): [app/(app)/_layout.tsx](app/(app)/_layout.tsx)

- O container do header recebe `zIndex/elevation` para ficar **acima** de qualquer fundo de cena que se estenda para a área do header.

Implicação direta:
- Header global não pinta “faixa” própria. Ele deixa o fundo visível por trás.
- No fluxo de Terreiros, o header não “vê” um variant diferente do body porque:
  - o fundo global é flat (baseColor), e
  - o fundo por-cena usa o mesmo `baseColor` como primeira camada.

### 2.3 Fundo global (`SaravafyScreen`)
Arquivo: [src/components/SaravafyScreen.tsx](src/components/SaravafyScreen.tsx)

- Sempre desenha uma base opaca (primeiro frame):
  - `View` absoluta com `backgroundColor: baseColor`.
- Para `variant !== "focus"`, desenha camadas extras:
  - Gradiente (se `expo-linear-gradient` existir)
  - Luzes (brass/paper)
  - Vinheta
  - Noise (imagem repetida)

Implicação direta:
- Do ponto de vista do *fundo do app*, o `SaravafyScreen` já é opaco desde o primeiro frame.
- O “overlap” observado não é por falta de opacidade do `SaravafyScreen` em si; era a composição com Stack/cenas transparentes.

Observação:
- `SaravafyScreen` continua existindo como fundo global (e para telas que não desenham fundo por-cena).
- Biblioteca/Collection agora desenham fundo por-cena para garantir compartilhamento com o header sem transparência do Stack.

## 3) Estado atual das telas

### 3.1 Biblioteca do Terreiro (tela `Terreiro`)
Arquivo: [src/screens/Terreiro/Terreiro.tsx](src/screens/Terreiro/Terreiro.tsx)

- A tela usa `SaravafyStackScene` como wrapper da cena.
- `SaravafyStackScene` desenha o fundo Saravafy por-cena (base + camadas) e usa a altura medida do header via contexto para tentar estender o fundo para cima (sem depender de cenas transparentes).
- Header de contexto da tela:
  - “Biblioteca de” (1 linha)
  - Nome do terreiro (até 2 linhas, ellipsis)
  - Botão primário `+ Nova coleção` no topo direito (quando pode editar e não está criando).
- Linha de ações globais abaixo:
  - “Editar” (ícone `reorder-three-outline` + texto)
  - “Compartilhar” (ícone `share-outline` somente)
- Menu de 3 pontos da biblioteca: removido.
- Navegação relevante:
  - Abrir uma coleção: `router.push({ pathname: "/collection/[id]", params: { ... }})`

### 3.2 Collection (detalhe)
Arquivo: [src/screens/Collection/Collection.tsx](src/screens/Collection/Collection.tsx)

- A tela usa `SaravafyStackScene` como wrapper da cena.
- Header interno da collection:
  - Back
  - Título (1 linha)
  - Ações à direita:
    - Editar (se permitido)
    - Compartilhar (ícone `share-outline`)

  ### 3.3 Terreiros (lista)
  Arquivo: [src/screens/Terreiros/Terreiros.tsx](src/screens/Terreiros/Terreiros.tsx)

  - A tela usa `SaravafyStackScene` (variant `"tabs"`) para manter o fundo Saravafy no root da aba Terreiros, mesmo com o `SaravafyScreen` global flat nesse fluxo.

## 4) Mitigações / garantias atuais contra o bug de overlap

### 4.1 `detachPreviousScreen` em Terreiros
Arquivo: [app/(app)/(tabs)/(terreiros)/_layout.tsx](app/(app)/(tabs)/(terreiros)/_layout.tsx)

- O Stack de Terreiros usa `screenOptions` como função.
- Ativa `detachPreviousScreen` quando:
  - `route.name === "terreiro"` ou `route.name === "collection/[id]"`.

Observação:
- Isso tenta evitar que a tela anterior permaneça montada/renderizada por baixo no push para essas rotas.

Estado prático após a mudança de arquitetura:
- Mesmo que a tela anterior continue montada, o Stack/cena atual é opaco e a Biblioteca/Collection desenham fundo por-cena, reduzindo drasticamente a chance de “vazar” UI anterior por transparência.

Ponto crítico:
- O Stack do grupo Terreiros não usa mais `contentStyle.backgroundColor = "transparent"`.

### 4.2 Remoção do “cover” temporário

- O componente `OpaqueBootCover` foi removido.
- As telas Biblioteca/Collection não dependem mais de “cobrir alguns frames”: a opacidade é garantida estruturalmente.

## 5) Bug atual reportado

- Ainda existe *overlap/overlay* ao navegar no fluxo.
- Hipótese operacional consistente com o estado do código:
  1) Antes, o Stack/cena estava transparente e isso podia deixar vazar UI anterior por um frame.
  2) Agora, o Stack é opaco e Biblioteca/Collection desenham fundo por-cena estendido atrás do header.
  3) Se ainda houver qualquer “flash/overlap”, ele tende a estar ligado a uma outra camada fora desse par (ex.: alguma rota que ainda dependa de transparência, ou um layout alternativo).

## 6) Pontos de atenção (fatos do estado atual)

- O Stack do layout principal do app continua com:
  - `contentStyle.backgroundColor = baseColor` (opaco).
- O Stack de Pontos não aplica `detachPreviousScreen` (apenas Terreiros).
- No fluxo de Terreiros, o `SaravafyScreen` global está em modo flat (`variant="focus"`).
- Terreiros (lista), Biblioteca e Collection desenham fundo por-cena via `SaravafyStackScene`.
- O header global está comprovadamente transparente e explicitamente em camada superior (zIndex/elevation) para ficar acima do fundo das cenas.

## 7) Próximas ações sugeridas (diagnóstico)

Para tornar o relatório acionável, aqui vão as próximas checagens possíveis (sem assumir soluções):

1) Identificar **em qual transição** exata o overlap ainda acontece:
   - Terreiros → Biblioteca (`terreiro`)
   - Biblioteca → Collection (`collection/[id]`)
   - Voltar (pop)

2) Verificar se existe algum outro Stack/navigator no caminho com `contentStyle` transparente.

3) Se ainda houver casos de “nunca ver tela anterior em nenhuma condição”, checar:
  - Se algum componente faz overlay/transição por fora do Stack.
  - Se há diferença de clipping/overflow entre iOS/Android na área do header.

---

Fim do relatório.
