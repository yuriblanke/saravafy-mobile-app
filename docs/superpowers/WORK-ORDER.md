# Ordem de trabalho autônomo — usuário ausente

**Criado:** 2026-08-09. **Decisão do usuário:** trabalhar a *faixa segura* e, nas sobras, **escrever
as specs** das grandes sem implementar.

Este arquivo existe porque o usuário vai ficar alguns dias sem poder validar no aparelho. Ele é o
ponto de entrada de qualquer sessão nova: leia daqui, não re-derive.

---

## Estado no momento em que isto foi escrito

`main` está em `6de19c1`. `tsc` limpo, 61/61 testes passando.

**Dois builds EAS foram disparados no commit `6de19c1` e estavam em progresso:**
`0ebe51fe` (production, version code 29) e `6b547150` (development). Confira o resultado com
`npx eas-cli build:list --limit 2 --non-interactive` e **atualize os links na
[`HUMAN-VALIDATION-QUEUE.md`](HUMAN-VALIDATION-QUEUE.md)** — as seções 9 e 10 dependem deles.

**Pendente de validação humana, não de código:** seção 9 (rollout do teclado nas 11 telas) e
seção 10 (`D15` — toque nas abas + semântica de "voltar"). Nada disso foi visto num aparelho ainda.

---

## Regras desta fase — o motivo importa

O usuário não pode validar nada por dias. O risco não é escrever código errado; é **acumular delta
não validado**. Se ele voltar e algo estiver quebrado, atribuir a causa entre 30 commits é muito
pior do que entre 5.

1. **Cada mudança nasce com teste ou tipo que a prove.** Se não dá pra provar sem um aparelho, ela
   não é da faixa segura — pare e escreva a spec.
2. **Commits granulares**, um por mudança coesa, mensagem explicando o *porquê*.
3. **Atualizar a fila de validação a cada item concluído**, com o que olhar e o que seria regressão.
   O usuário volta pra um roteiro, não pra uma pilha.
4. **Rodar `npx tsc --noEmit` e `npm test` antes de reportar qualquer coisa como pronta.** Portão é
   zero falhas, nunca um total fixo.
5. **Não disparar build EAS** sem o usuário pedir — ele é quem instala e testa.
6. **Nada que mude layout, navegação ou comportamento visual.** Isso é a faixa proibida abaixo.

---

## Faixa segura — implementar, em ordem de valor

| Ordem | Item | Por que aqui |
|---|---|---|
| 1 | **`X14`** — auditar a RLS de `collections_pontos` (**só ler e reportar, nenhuma alteração no banco**) | A policy de INSERT parece mais larga que as três de SELECT. Hoje (2026-08-09) o gate de permissão da Coleção foi fechado **no cliente** (`8159160`, `5222c9a`) e foi dito que o backstop real era a RLS. Se o `X14` proceder, esse backstop não existe. Ler policy é seguro; **mudar policy exige o usuário.** Ferramentas MCP do Supabase disponíveis |
| 2 | **`D1`** — logout não despeja chaves sem `userId` | `app/_layout.tsx:206,212`. Dado de terreiro de um usuário pode aparecer para o próximo no mesmo aparelho. Testável em unidade. **Cuidado:** não é o `D8` (esse já foi resolvido em `8fd05c3` e é `placeholderData`, não despejo) |
| 3 | **`D4`** + **`C3`** — rollback em mutation otimista | `AddMediumTagSheet.tsx:203`: `setQueriesData` sem snapshot e sem `onError`. `C3` é a regra geral — cancel → snapshot → otimista → rollback → invalidate, ou nada de otimista. Fazer os dois juntos: corrigir só o call site repete o erro no próximo |
| 4 | **`X13`** — `isNetworkError` não casa string pura | `src/lib/errors.ts`. Pré-requisito do `S-3a`: varrer sem isso espalha o buraco |
| 5 | **`X1`, `X2`** — `getErrorMessage` diverge da spec e tem branch morto | Mesmo arquivo do item 4, fazer na mesma passada |
| 6 | **`C1`, `C2`, `C6`, `C7`** — contrato de query keys | Chaves inline, três namespaces de terreiro, chave depreciada ainda invalidada, e `me.profile` guardando booleano de modo curador |
| 7 | **`S-3b`** — varrer os 10+ `role === "admin"` inline pro `useTerreiroRole` | Mesma classe do vazamento de permissão achado na Coleção em 2026-08-09 |
| 8 | **`X15`, `X16`** — sobras da Spec 5 | `AddToCollection.tsx:591-612` (o consumidor inverso que a Spec 5 não alcançou) e as duas queries que o `D9` desgateou junto |
| 9 | **`S-4c`** — cascatas N+1 em `Collection.tsx:300-310` e `PlayerScreen.tsx:226-229` | Lógica de fetch, sem efeito visual se feito certo |
| 10 | **Código morto** — `AppTabSwipeOverlay` (**confirmado: nunca importado em lugar nenhum**, achado ao investigar o `D15`), `assets/images/filler.png` (zero referências desde o rollout), `X5`, `X8`, `X10` | Justificar cada remoção no commit, conforme `CLAUDE.md` |
| 11 | **`X11`, `X12`, `X9`** — dedup do mock do Supabase, testes de render que faltam para os guards da Spec 3 (`ProfileSection`, `LogoutSection`, `TabsHeaderWithPreferences`), e limpar o ruído de `act()` na saída | `X12` é o que mais importa: hoje os guards da Spec 3 não têm teste de render |

---

## Specs a escrever — **escrever, não implementar**

Entregar spec + plano nos formatos de `specs/` e `plans/`, prontos para o usuário aprovar.

- **`S-4a`** — unificar os 4 contextos de gesto/pager (`RootPager`, `TabController`, `GestureBlock`,
  `GestureGate`). O `D15` já entregou metade da investigação: leia a entrada dele no
  [`BACKLOG.md`](BACKLOG.md) antes de começar, inclusive os suspeitos **eliminados** (`navCover` é
  `Modal` opaco; `AppTabSwipeOverlay` é código morto) para não reinvestigar. O alvo final é toque e
  swipe compartilharem um caminho só, o que torna a assimetria do `D15` impossível por construção.
  **Barra de aceite acordada com o usuário:** `navCover.ts` e suas ferramentas de debug podem ser
  deletados por inteiro e a transição continua sem piscar.
- **`C5`** — as duas UIs paralelas de Preferências (`TabsHeaderWithPreferences` overlay vs
  `Preferences.tsx` rota). Já causou defeito real duas vezes: o `D12` existia **independentemente**
  nas duas e precisou de correção em quatro lugares.
- **`N1`** — `react-native-track-player` não suporta New Architecture, e `app.config.ts:76` liga a
  New Architecture. Levantar o risco real e as saídas.

---

## Faixa proibida sem o usuário

- Qualquer coisa que mude **layout, navegação ou comportamento visual** — `S-3c` (adotar
  `<QueryBoundary>` nos ~14 consumidores), `S-4d` (`FlatList` nas listas de membros), `S-4e` (limite
  no `fetchAllPontos`), e a implementação de qualquer spec acima.
- **Alterar policy de RLS** ou qualquer migration no Supabase.
- **`D13`** (foto de perfil) — precisa de coluna nova no schema e é decisão de produto.
- **`D2`, `D3`, `D5`** — dependem de comportamento de backend que ninguém verificou nesta passada.
- **`F1`, `F2`** — features, fora do escopo deste esforço.
- Pull-to-refresh em `AccessManager` e `TerreiroMembersList` — o segundo usa `useInfiniteQuery` e
  precisa de decisão: recarregar todas as páginas ou voltar para a página 1.
- **Disparar build EAS.**
