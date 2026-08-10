# Spec 7 — Unificar navegação: Implementation Plan

**Spec:** [`2026-08-10-spec-7-navigation-unification.md`](../specs/2026-08-10-spec-7-navigation-unification.md)
**Status:** escrito, não executado.

Ambiente: `C:\saravafy\saravafy-mobile-app`, Windows, PowerShell ou Git Bash.
**Nunca escrever caminhos WSL** ([`CONVENTIONS.md`](../CONVENTIONS.md) §2).

Portão em toda task: `npx tsc --noEmit` sem nenhuma saída, e `npm test` com **zero falhas** (nunca
comparar com um total fixo — §3).

Um commit por task. A última é reconciliação (§5).

---

## Task 1: Baseline — reconfirmar o terreno, não confiar na spec

**Só leitura. Nenhuma edição.**

1. `git log --oneline -1` e anotar o SHA.
2. `npx tsc --noEmit` e `npm test` — anotar o estado inicial.
3. Rodar e **anotar a saída de cada um**:
   - `grep -rn "GestureBlock" src/ app/ contexts/`
   - `grep -rn "GestureGate" src/ app/ contexts/`
   - `grep -rn "shouldBlockPress" src/ app/ contexts/`
   - `grep -rn "navCover" src/ app/ contexts/`
   - `grep -rn "goToTabRef\|registerGoToTab\|goToTab(" src/ app/ contexts/`
   - `grep -rn "RootPager" src/ app/ contexts/`
4. Ler por inteiro: `contexts/TabControllerContext.tsx`, `app/(app)/(tabs)/_layout.tsx`,
   `src/utils/navCover.ts`, e as regiões de `TabsHeaderWithPreferences.tsx` que aparecerem nos greps.
5. **Responder por escrito, no plano:** `GestureBlock` e `GestureGate` têm escritor vivo? O header
   precisa da aba corrente para algo além de estilo?

> **Portão de decisão.** Se algum dos dois contextos ganhou escritor desde 2026-08-10, **pare** e
> registre — a spec presume que não têm, e essa presunção é da spec, não do código.

- [ ] Task 1 concluída. Commit: `docs: baseline do Spec 7 com as respostas da Task 1`

---

## Task 2: Extrair a troca de aba para um módulo testável — TDD

Hoje a lógica vive dentro de componentes e contextos, e por isso não tem teste.

1. **Escrever o teste primeiro**, em `src/navigation/tabNavigation.test.ts`: dado um objeto de
   navegação, `goToTab(nav, "pontos")` chama a operação de troca uma vez, com o nome certo; um nome
   inválido não chama nada e não lança.
2. Criar `src/navigation/tabNavigation.ts` até o teste passar.
3. **Não ligar em nada ainda.** Esta task não pode mudar comportamento.

- [ ] Task 2 concluída. Commit: `feat: extrair a troca de aba para um modulo testavel`

---

## Task 3: Fazer o toque usar o módulo, sem o `ref`

1. Em `TabsHeaderWithPreferences.tsx`, trocar `tabController.goToTab()` pela chamada ao módulo,
   usando o objeto de navegação da instância visível.
2. Ajustar `AndroidBackBehavior` (`app/(app)/_layout.tsx:49-68`), que é consumidor do mesmo caminho.
3. Remover `registerGoToTab`/`goToTabRef` de `TabControllerContext.tsx` e o registro por foco em
   `app/(app)/(tabs)/_layout.tsx` — o layer 2 do `D15` fica **redundante por construção** aqui, e é
   este o momento certo de removê-lo.
4. **Teste:** exercitar as duas entradas (toque e swipe) e observar o mesmo efeito — é o critério 1
   da spec, e é o teste que torna a assimetria do `D15` impossível.

> Se depois disto `TabControllerContext` não guardar mais estado, deletar o arquivo e o provider.
> Se guardar (resposta da Task 1), deixá-lo **somente leitura**, sem nenhuma escrita.

- [ ] Task 3 concluída. Commit: `refactor: toque e swipe passam pelo mesmo caminho de troca de aba`

---

## Task 4: Remover `GestureBlock` e `GestureGate`

Condicional ao portão da Task 1.

1. Deletar os contextos, providers e consumidores.
2. Remover as chamadas a `shouldBlockPress()`, que já retornavam `false` sempre.
3. **Justificar a remoção no commit**, conforme [`CLAUDE.md`](../../../CLAUDE.md).

- [ ] Task 4 concluída. Commit: `chore: remover os contextos de gesto sem escritor vivo`

---

## Task 5: Deletar o `navCover` — a barra de aceite

**Esta é a task que define se a spec cumpriu o objetivo.**

1. Deletar `src/utils/navCover.ts`.
2. Remover `showNavCover`/`prewarmPreferences` de `TabsHeaderWithPreferences.tsx` e
   `setNavCoverVisible`/`useNavCoverState` de `Preferences.tsx`.
3. Remover as ferramentas de debug: `__saravafyDebugGhostAmplifyUntil`,
   `__saravafyDebugPrefsCoverEnabled`.
4. `grep -rn "navCover" src/ app/` precisa voltar **vazio**.

> **Não reintroduzir cover se aparecer flicker.** Registrar o observado e levar para a fila. A
> pergunta 2 da spec já define o destino: item próprio, não guarda-chuva desta spec.

- [ ] Task 5 concluída. Commit: `chore: deletar o navCover e suas ferramentas de debug`

---

## Task 6: Reconciliar ([`CONVENTIONS.md`](../CONVENTIONS.md) §5)

1. Marcar `- [x]` só no que foi realmente feito.
2. Registrar desvios inline, marcados `> **DEVIATION:**`.
3. Corrigir a spec onde a realidade divergiu.
4. Acrescentar a seção de validação humana na
   [`HUMAN-VALIDATION-QUEUE.md`](../HUMAN-VALIDATION-QUEUE.md), cobrindo: sessão longa aleatória,
   toque × swipe, semântica de voltar nas 5 telas do layer 1, e **o flicker com o cover removido**.
5. Fechar o `S-4a` no [`BACKLOG.md`](../BACKLOG.md) e anotar no `D15` que a assimetria virou
   impossível por construção.
6. Rodar os quatro greps de aceite e colar a saída no plano.

- [ ] Task 6 concluída. Commit: `docs: reconciliar o Spec 7`
