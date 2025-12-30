# Relatório Técnico — Swipe funciona, clique falha após reload

Data: 2025-12-29

## 1. Visão Geral

Sintoma reportado:

- Swipe entre abas funciona.
- Clique/tap em cards/itens (principalmente em Home/Terreiro/Collection) falha logo após reload.
- Após realizar swipes, o clique passa a funcionar (ou fica muito mais consistente).
- Header e navegação por Preferências/Modais continuam funcionando.

Este relatório é **somente diagnóstico**. Não propõe correção, refatoração ou mudança de comportamento.

## 2. Estado inicial após reload (o que os logs devem responder)

Com os logs adicionados (DEV-only), queremos observar:

### 2.1 GestureBlock inicia bloqueado ou não?

Evidências esperadas nos logs:

- `[GestureBlock] mount { blockedUntil, blockWindowMs }`
- Primeiros cliques em cards devem gerar logs do guard:
  - `[PressGuard] blocked { screen, now }` OU
  - `[PressGuard] allowed { screen, now }`
- Sempre que `shouldBlockPress()` for consultado, haverá:
  - `[GestureBlock] shouldBlockPress { now, blockedUntil, blocked, dt }`

Interpretação:

- Se após reload `blocked=true` sem ter havido swipe (`markSwipeRecognized`), então existe algum caminho chamando `markSwipeRecognized()` cedo ou `blockedUntil` sendo armado por efeito colateral.
- Se `blocked=false`, mas o clique não navega e **não existe** nenhum `[PressGuard] ...`, então o `onPress` pode nem estar disparando (tap não chega ao handler).

### 2.2 SwipeOverlay monta antes ou depois das telas?

Evidências esperadas:

- `[SwipeOverlay] mount` / `[SwipeOverlay] unmount`
- `[SwipeOverlay] state { pathname, activeTab, ... }`

Interpretação:

- Se o overlay monta cedo e cobre a área de conteúdo, ele pode interferir no roteamento de eventos de toque (mesmo sem virar responder). Isso é testável observando se taps geram ou não logs do `[PressGuard]`.

## 3. Sequência após primeiro swipe (o que muda)

O swipe deve produzir:

- `[SwipeOverlay] grant { ... }`
- logs de crossing thresholds em move (apenas quando cruzar)
- `[SwipeOverlay] release { ... }`
- Se navegar: `[SwipeOverlay] shouldNavigate { ... }`
- Se `markSwipeRecognized()` for chamado, deve haver:
  - `[GestureBlock] markSwipeRecognized { now, blockedUntil, windowMs }`

Após o swipe, ao tocar em um card:

- Deve aparecer `[PressGuard] allowed { screen, now }` seguido de
- `[Navigation] click -> <rota> { screen, now, ... }`

Interpretação:

- Se após o swipe o clique passa a navegar, os logs indicarão qual condição mudou:
  - `GestureBlock` parou de bloquear?
  - Ou o `onPress` passou a disparar (ou seja, antes ele não chegava no handler)?

## 4. Mapa de responsabilidade

| Componente                              | Responsabilidade                                | Evidência no runtime/logs                                               | Possível interferência no clique                                                       |
| --------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `GestureBlockContext`                   | Bloquear taps logo após swipe real              | `[GestureBlock] markSwipeRecognized`, `[GestureBlock] shouldBlockPress` | Pode bloquear `onPress` mesmo quando tap é legítimo se armado indevidamente            |
| `AppTabSwipeOverlay`                    | Capturar swipe horizontal e navegar entre abas  | `[SwipeOverlay] grant/move/release/shouldNavigate`                      | Pode capturar/consumir eventos de toque se estiver por cima da UI e recebendo hit-test |
| Press guards (Home/Terreiro/Collection) | Cancelar `onPress` quando GestureBlock bloquear | `[PressGuard] blocked/allowed`                                          | Se os logs **não aparecem**, o handler pode não estar sendo chamado                    |
| `router.push` (click navigation)        | Navegar para rota alvo                          | `[Navigation] click -> ...`                                             | Se não aparece, o clique não chegou no ponto de navegação                              |

## 5. Hipóteses técnicas (baseadas no que os logs podem mostrar)

Sem corrigir, apenas hipóteses a validar com os logs:

1. **GestureBlock armado indevidamente após reload**

- Evidência: `[GestureBlock] markSwipeRecognized` aparece sem swipe/navegação real, ou `blocked=true` antes de qualquer swipe.

2. **Tap não chega no onPress (interferência de hit-testing / camada overlay)**

- Evidência: ao tocar em card, não existe `[PressGuard] blocked/allowed` e não existe `[Navigation] click -> ...`.
- Isso sugere que o Pressable não recebeu o evento.

3. **Dependência implícita do swipe para “destravar” a UI**

- Evidência: após um swipe, começam a aparecer logs de `[PressGuard] allowed` / `[Navigation] click -> ...` para taps que antes não geravam nada.

4. **Bloqueio ocorrendo só em telas específicas**

- Evidência: logs mostram `blocked` apenas para `screen: Home` ou apenas em `Terreiro/Collection`.

## 6. Conclusão

Com a instrumentação atual, é possível separar o problema em duas classes:

- **Bloqueio lógico**: o tap chega no handler, mas é cancelado por `shouldBlockPress()`.

  - Evidência: `[PressGuard] blocked` + `[GestureBlock] shouldBlockPress blocked=true`.

- **Bloqueio de entrega do evento**: o tap não chega no handler.
  - Evidência: ausência de `[PressGuard] ...` e ausência de `[Navigation] click -> ...` após taps.

A diferença entre “clicar não funciona após reload” e “passa a funcionar após swipes” deve ficar evidente comparando os logs antes/depois do primeiro swipe.
