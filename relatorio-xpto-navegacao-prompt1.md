# Relatório XPTO — Navegação / Swipe Global (Prompt 1)

Data: 2025-12-29

## Escopo verificado

Prompt 1/3: **SWIPE GLOBAL COM PANRESPONDER** (captura em todas as telas do grupo `(app)`, exceto `/player`) com **stub de callback** (somente `console.log` DEV-only), **sem trocar aba/rotas ainda**.

## Resultado: NÃO atende o Prompt 1 (parcial)

O projeto **já tem** um capturador global de swipe horizontal via `PanResponder`, porém:

- não existe o componente exigido `components/navigation/GlobalTabSwipePanResponder.tsx`;
- não há logs DEV-only `SWIPE->PONTOS` / `SWIPE->TERREIROS` (stub solicitado);
- o capturador atual **faz navegação/troca de aba** (com router/tabController), o que o Prompt 1 proíbe (“não mexer no TabView em si ainda”).

## Evidências no código

### 1) Capturador global existente

- O layout do grupo `(app)` monta um overlay global:
  - app/(app)/\_layout.tsx monta `AppTabSwipeOverlay` como overlay absoluto “topo real”.
- O `AppTabSwipeOverlay` usa `PanResponder.create(...)`:
  - src/components/AppTabSwipeOverlay.tsx.

### 2) Desabilitado em `/player`

- `AppTabSwipeOverlay` tem `isPlayerActive = pathname === "/player"` e retorna `null` quando ativo.

✅ Isso atende o requisito de **não capturar em /player**.

### 3) Critério de captura horizontal (Prompt 1 vs atual)

Prompt 1 exige capturar quando:

- `abs(dx) > 12`
- `abs(dx) > abs(dy) * 1.2`

Implementação atual (AppTabSwipeOverlay) é diferente:

- usa `absX > absY` (sem fator 1.2)
- usa `absX > 8` (não 12)
- tem regras adicionais de vertical `absY > 15` para rejeitar.

⚠️ Isso pode funcionar na prática, mas **não está aderente ao critério determinístico do Prompt 1**.

### 4) Ao soltar: disparo e stub

Prompt 1 exige:

- ao soltar, se `abs(dx) >= 40`, decidir direção e chamar `onSwipeTab(direction)`
- por enquanto, apenas log DEV-only `SWIPE->PONTOS`/`SWIPE->TERREIROS`

Implementação atual:

- ao soltar, se `dx > 40` ou `dx < -40`, executa **troca de aba + navegação** (router/tabController), não apenas log.
- não existem logs com `SWIPE->...`.

❌ Não atende.

## Aceite manual do Prompt 1 (estado atual)

1. Terreiro: swipe horizontal detectado (log DEV-only aparece)
   - ❌ Não (não há log; pode haver navegação)
2. Collection: swipe horizontal detectado (log DEV-only aparece)
   - ❌ Não (não há log; pode haver navegação)
3. /player: nenhum log de swipe de aba aparece
   - ✅ Overlay está desabilitado no player

## Observações importantes

- O repositório está num estado híbrido (há mudanças locais e arquivos não rastreados relacionados ao swipe) e isso pode afetar qualquer implementação do Prompt 1.
- O capturador atual já está “mais avançado” (Prompt 2/3), então implementar o Prompt 1 “ao pé da letra” exigiria:
  - ou introduzir o componente novo e **desativar** a lógica de navegação do overlay atual,
  - ou trocar o overlay atual pelo componente pedido e deixar a navegação para os prompts seguintes.

## Recomendação de próximos passos (se você pedir execução)

Para atender estritamente o Prompt 1 sem perder refactors:

- Criar `components/navigation/GlobalTabSwipePanResponder.tsx` conforme o spec.
- Montar no `app/(app)/_layout.tsx`.
- Deixar o callback só com logs DEV-only.
- Garantir que o `AppTabSwipeOverlay` atual não esteja ativo ao mesmo tempo (evitar dois PanResponders globais competindo).
