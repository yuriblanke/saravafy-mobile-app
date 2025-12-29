# 📊 AUDITORIA DE NAVEGAÇÃO - PLAYER DO SARAVAFY

## 1️⃣ MAPA DE ROTAS (Expo Router)

```
app/
├── _layout.tsx                    # Root layout (auth check, boot)
├── (auth)/
│   ├── _layout.tsx               # Auth group (login flow)
│   └── login.tsx
├── (app)/                         # Main app group (authenticated)
│   ├── _layout.tsx               # Stack navigator + SaravafyScreen
│   ├── index.tsx                 # RootPager (TabView: Pontos ↔ Terreiros)
│   ├── player.tsx                # ⭐ PLAYER ROUTE (Stack screen)
│   ├── terreiro.tsx              # Single terreiro details
│   ├── terreiro-editor.tsx       # Modal full-screen
│   ├── access-manager.tsx        # Modal full-screen
│   └── collection/
│       └── [id].tsx              # Collection details
└── collection/
    └── [id].tsx                  # (alternate route, not used)
```

**Estrutura de navegação:**
- **Root**: Stack (expo-router file-based)
- **Main App**: Nested Stack dentro de `(app)/_layout.tsx`
- **RootPager**: TabView (react-native-tab-view) para Pontos ↔ Terreiros (swipe horizontal)
- **Player**: Stack screen, sem tab bar, sem swipe entre tabs

---

## 2️⃣ PLAYER ATUAL

### Rota
- **Path**: `/player` (via expo-router)
- **Arquivo**: `app/(app)/player.tsx` → re-exporta `src/screens/Player/PlayerScreen.tsx`

### Como recebe parâmetros
```tsx
const params = useLocalSearchParams();

// Parâmetros lidos:
const source = params.source;              // "all" | undefined
const searchQuery = params.q;              // string (query de busca)
const collectionId = params.collectionId;  // string (UUID da collection)
const initialPontoId = params.initialPontoId || params.pontoId;  // string (UUID do ponto)
const initialPosition = params.initialPosition;  // number (posição na lista)
```

### Contrato de parâmetros
**Modo 1 - Collection específica:**
```
/player?collectionId=<uuid>&initialPontoId=<uuid>
```

**Modo 2 - Biblioteca completa (all pontos):**
```
/player?source=all&q=<search>&initialPontoId=<uuid>
```

### Arquitetura interna
- **Hook de dados**: `useCollectionPlayerData()` - busca dados do Supabase baseado nos params
- **Estado local**: 
  - `activeIndex` (índice do ponto ativo no swipe horizontal)
  - `lyricsFontSize` (tamanho da fonte)
  - `isSearchOpen`, `isShareOpen` (modais auxiliares)
- **Swipe horizontal**: `FlatList` com `pagingEnabled` + `onMomentumScrollEnd` atualiza `activeIndex`
- **Sem Context global de playback**: estado vive apenas no componente PlayerScreen

---

## 3️⃣ ENTRADAS PARA O PLAYER

### 🔹 Entrada 1: Home (Pontos - biblioteca completa)
**Arquivo**: `src/screens/Home/Home.tsx` (linha 373)

```tsx
router.push({
  pathname: "/player",
  params: {
    source: "all",
    q: searchQuery,              // query de busca ativa (pode ser "")
    initialPontoId: item.id,     // ponto clicado
  },
});
```

**Contexto**: Usuário clica em um ponto na lista de Pontos (biblioteca completa com busca).

**Parâmetros passados**:
- `source: "all"` → indica biblioteca completa
- `q: string` → query de busca atual
- `initialPontoId: string` → ponto inicial

---

### 🔹 Entrada 2: Collection (página de collection específica)
**Arquivo**: `src/screens/Collection/Collection.tsx` (linha 457)

```tsx
router.push({
  pathname: "/player",
  params: {
    collectionId,                  // UUID da collection
    initialPontoId: item.ponto.id, // ponto clicado
  },
});
```

**Contexto**: Usuário clica em um ponto dentro de uma collection específica.

**Parâmetros passados**:
- `collectionId: string` → UUID da collection
- `initialPontoId: string` → ponto inicial

---

### 🔹 Entrada 3: Terreiro (NÃO navega para Player)
**Arquivo**: `src/screens/Terreiro/Terreiro.tsx`

**Observação**: Terreiro **NÃO** navega direto para o Player. Navega para:
- `/collection/[id]` (linha 515) → abre collection do terreiro
- `/terreiro-editor` (linha 865) → edita terreiro

O fluxo Terreiro → Player é: **Terreiro → Collection → Player**

---

## 4️⃣ PARÂMETROS E ESTADO DE PLAYBACK

### Parâmetros suportados pelo Player
| Parâmetro | Tipo | Origem | Uso |
|-----------|------|--------|-----|
| `source` | `"all"` \| undefined | Home (Pontos) | Define modo biblioteca completa |
| `q` | `string` | Home (Pontos) | Query de busca para filtrar biblioteca |
| `collectionId` | `string (UUID)` | Collection | Define collection específica |
| `initialPontoId` | `string (UUID)` | Home/Collection | Ponto inicial a exibir |
| `pontoId` | `string (UUID)` | (fallback) | Alias para initialPontoId |
| `initialPosition` | `number` | (não usado atualmente) | Posição inicial na lista |

### Estado de playback
**NÃO existe Context/Store global de playback.**

**Estado vive em `PlayerScreen` (componente local):**
```tsx
const [activeIndex, setActiveIndex] = useState(0);  // índice do ponto ativo
const [lyricsFontSize, setLyricsFontSize] = useState(20);
const [isSearchOpen, setIsSearchOpen] = useState(false);
const [isShareOpen, setIsShareOpen] = useState(false);
```

**Hook de dados**: `useCollectionPlayerData(params)`
- Faz fetch do Supabase baseado em `source === "all"` ou `collectionId`
- Retorna `items: CollectionPlayerItem[]` (lista de pontos)
- Filtra por query (`q`) no modo "all"
- **Sem cache global**: cada navegação refaz fetch

**Como influencia swipe:**
- `FlatList` horizontal com `pagingEnabled`
- `onMomentumScrollEnd` atualiza `activeIndex`
- `activeIndex` determina qual ponto está ativo
- `activePonto = items[activeIndex]?.ponto`
- AudioPlayerFooter recebe `activePonto`

---

## 5️⃣ RECOMENDAÇÃO DE ROTA ALVO (Opção C)

### 🎯 Proposta recomendada

**Padrão de URL:**
```
/player?source=<source>&collectionId=<id>&pontoId=<id>&q=<query>
```

**Exemplos concretos:**
```
# Collection específica
/player?source=collection&collectionId=abc123&pontoId=def456

# Biblioteca completa (all pontos)
/player?source=all&pontoId=def456&q=exu

# Collection do terreiro (source identifica origem)
/player?source=terreiro&collectionId=abc123&pontoId=def456
```

### ✅ Prós
- **Query params flexíveis**: Suporta combinações sem criar rotas duplicadas
- **Deep link friendly**: URL completa contém todo contexto necessário
- **Compatível com atual**: Apenas adiciona `source` obrigatório + mantém params atuais
- **Fácil debug**: URL legível, fácil testar no browser/Postman
- **Extensível**: Adicionar novos modos (source=search, source=favorites) sem quebrar

### ❌ Contras
- Query params são strings, precisa parse/validação
- URL pode ficar longa com múltiplos params (mas Expo Router suporta)

### 🚫 Alternativas descartadas

**Opção A - Rotas separadas:**
```
/player/collection/[collectionId]/[pontoId]
/player/all/[pontoId]
```
❌ **Contras**: Duplica screens, complica lógica compartilhada, mais arquivos.

**Opção B - Path params:**
```
/player/[mode]/[id1]/[id2]
```
❌ **Contras**: Semântica confusa, ordem fixa, difícil adicionar params opcionais.

---

## 6️⃣ JUSTIFICATIVA DA RECOMENDAÇÃO

### Por que query params com `source` obrigatório?

1. **Seguir a collection**: `collectionId` no query param garante que Player busca dados da collection correta
2. **Biblioteca completa**: `source=all` + `q` suporta busca global
3. **Deep link**: URL autocontida, pode ser copiada/colada/compartilhada
4. **Evitar duplicação**: Uma única tela `/player` com lógica condicional baseada em params
5. **Compatível com Expo Router**: Query params são suportados nativamente via `useLocalSearchParams()`
6. **Extensível para futuro**:
   - `source=favorites` → pontos favoritados
   - `source=history` → histórico de reprodução
   - `source=search` → resultado de busca global

### Implementação sugerida (SEM fazer agora)

```tsx
// PlayerScreen.tsx
const params = useLocalSearchParams<{
  source: "all" | "collection" | "terreiro";
  collectionId?: string;
  pontoId: string;
  q?: string;
}>();

const dataParams = (() => {
  if (params.source === "all") {
    return { mode: "all", query: params.q ?? "" };
  }
  if (params.collectionId) {
    return { collectionId: params.collectionId };
  }
  throw new Error("Invalid player params");
})();

const { items, ... } = useCollectionPlayerData(dataParams);
```

---

## 7️⃣ VALIDAÇÕES EXECUTADAS

```bash
✅ npx tsc --noEmit
   → Nenhum erro de tipo encontrado

✅ Nenhuma alteração feita
   → Código auditado sem modificações
```

---

## 📌 CONCLUSÃO

**Arquitetura atual:**
- Player é uma Stack screen simples (`/player`) com query params
- Recebe parâmetros via `useLocalSearchParams()`
- Sem Context global de playback (estado local)
- Swipe horizontal via FlatList com `onMomentumScrollEnd`
- Fetch de dados via hook `useCollectionPlayerData()` (sem cache global)

**Navegação atual:**
- **Home → Player**: `source=all` + `q` + `initialPontoId`
- **Collection → Player**: `collectionId` + `initialPontoId`
- **Terreiro → Collection → Player**: fluxo indireto

**Recomendação:**
Usar query params com `source` obrigatório:
```
/player?source=<mode>&collectionId=<id>&pontoId=<id>&q=<query>
```

Essa abordagem é a mais flexível, extensível e compatível com deep links, sem duplicar telas nem criar rotas complexas.

---

**Data da auditoria**: 29 de dezembro de 2025  
**Arquivo gerado automaticamente pela auditoria de navegação**
