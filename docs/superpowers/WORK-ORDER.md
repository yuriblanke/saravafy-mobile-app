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

## Faixa segura — estado em 2026-08-10

Sessão autônoma de 2026-08-10 trabalhou esta lista de cima para baixo. `main` saiu de `6de19c1` e
está em 10 commits novos; `tsc` limpo, **115 testes, zero falhas** (eram 61).

| Ordem | Item | Estado |
|---|---|---|
| 1 | **`X14`** — auditar a RLS de `collections_pontos` | ✅ **Confirmado**, e rendeu dois achados novos: `X17` (policy de UPDATE com `WITH CHECK (true)` — escalação de privilégio) e `X18` (reordenar coleção reescreve `added_by`). **Corrige a premissa deste item:** o backstop RLS por trás do gate da Coleção **existe e está correto**; `X14` é assimetria de leitura, não buraco de escrita. Corrigir as policies precisa de você — [`QUESTIONS-FOR-USER.md`](QUESTIONS-FOR-USER.md) |
| 2 | **`D1`** — logout não despeja chaves sem `userId` | ✅ Corrigido invertendo o predicado: nega por padrão, allowlist explícita. O vazamento era maior que o descrito — incluía convites por **e-mail** do usuário anterior. Fila: seção 11 |
| 3 | **`D4`** + **`C3`** — rollback em mutation otimista | ✅ **Premissa refutada** — não havia update otimista nos dois sheets. Corrigido o que de fato faltava (invalidação, duplicação, patch espúrio). O sintoma de ~60s segue **sem causa**: fila seção 12, item 12.1 |
| 4 | **`X13`** — `isNetworkError` não casa string pura | ✅ Corrigido estruturalmente: extração única compartilhada. **`S-3a` desbloqueado** |
| 5 | **`X1`, `X2`** | ✅ Resolvidos a favor da spec; ramo morto removido |
| 6 | **`C1`, `C2`, `C6`, `C7`** | ✅ Todos. Guardados por um teste que percorre o registro e falha se duas entradas colidirem — verificado re-inserindo o alias e vendo quebrar |
| 7 | **`S-3b`** | ⏸️ **Não varrido de propósito.** O "10+" era enganoso: 58 ocorrências, a maioria não é o defeito. Inventário refinado no backlog. **Fazer o `X12` antes** — é derivação de permissão em 4 telas sem teste de render |
| 8 | **`X15`, `X16`** — sobras da Spec 5 | ⬜ Não feito |
| 9 | **`S-4c`** — cascatas N+1 | 🚫 **Bloqueado.** Estava listado aqui por engano: depende de RPC nova, que é faixa proibida |
| 10 | **Código morto** | ✅ `AppTabSwipeOverlay`, `filler.png`, `X5`, `X8`, `X10`. O `X5` cascateou: dois módulos inteiros e duas chaves órfãs saíram junto |
| 11 | **`X11`, `X12`, `X9`** | ⬜ Não feito. **O `X12` foi absorvido pela Spec 8** (Task 2), que é onde ele tem mais valor |

**O que sobrou, em ordem:** `X15`/`X16` (item 8), depois `X11`/`X9` (item 11). O `S-3b` fica atrás do
`X12`, que agora vive na Spec 8.

---

## Specs a escrever — ✅ **entregues 2026-08-10**

As três estão escritas com spec + plano, prontas para aprovação. **Nenhuma foi implementada.**

- **`S-4a`** → [Spec 7](specs/2026-08-10-spec-7-navigation-unification.md) + [plano](plans/2026-08-10-spec-7-navigation-unification.md)
- **`C5`** → [Spec 8](specs/2026-08-10-spec-8-preferences-unification.md) + [plano](plans/2026-08-10-spec-8-preferences-unification.md) — depende da Spec 7 e de uma decisão sua
- **`N1`** → [Spec 9](specs/2026-08-10-spec-9-player-new-architecture.md) + [plano](plans/2026-08-10-spec-9-player-new-architecture.md) — levantamento, não implementação

Descrição original de cada uma, mantida:

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
