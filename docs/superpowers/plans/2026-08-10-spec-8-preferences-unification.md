# Spec 8 — Uma implementação só de Preferências: Implementation Plan

**Spec:** [`2026-08-10-spec-8-preferences-unification.md`](../specs/2026-08-10-spec-8-preferences-unification.md)
**Status:** escrito, não executado. **Bloqueado por duas coisas:** a Spec 7 precisa ter caído, e a
pergunta 1 da spec (rota ou overlay?) precisa de resposta do usuário.

Ambiente: `C:\saravafy\saravafy-mobile-app`, Windows, PowerShell ou Git Bash.
Portão em toda task: `npx tsc --noEmit` sem saída, `npm test` com **zero falhas**.

---

## Task 1: Inventário — a task que decide se a fusão é segura

**Só leitura.** É o passo que impede a fusão de perder função em silêncio, e o `D12` já provou que
o overlay tem sites que a rota não tem.

1. Ler por inteiro `src/screens/Preferences/Preferences.tsx`, `components/ProfileSection.tsx`,
   `components/LogoutSection.tsx`, e a região de Preferências de `TabsHeaderWithPreferences.tsx`.
2. Montar **uma tabela** no plano, uma linha por função visível ao usuário, com três colunas:
   *função | existe na rota? | existe no overlay?*
3. Marcar explicitamente cada linha que existe em **um só** lado — são elas que a fusão pode perder.
4. Anotar as **entradas** de navegação para cada uma (quem abre o quê, de onde).

> **Portão.** Se a tabela mostrar divergência de comportamento (não só de presença) — a mesma ação
> fazendo coisas diferentes nos dois lados — **pare e pergunte** qual é a correta. Escolher sozinho
> aqui é decidir produto.

- [ ] Task 1 concluída. Commit: `docs: inventario das duas implementacoes de Preferencias`

---

## Task 2: Testes de render dos guards — antes de qualquer fusão

Isto é o `X12`. Vem **antes** porque é a rede que torna a fusão verificável.

1. Escrever testes de render para os guards de auth da implementação **sobrevivente** (`ProfileSection`,
   `LogoutSection`, e o equivalente no overlay se ele for o escolhido).
2. Cobrir: com usuário, sem usuário, e a transição logado → deslogado.
3. Os guards da Spec 3 são sensíveis à ordem de hooks — a quebra que passa no `tsc` e na suíte atual
   e explode em runtime. É exatamente isso que estes testes precisam pegar.
4. **Provar que os testes falham** removendo um guard temporariamente. Teste que nunca falhou não é
   rede.

- [ ] Task 2 concluída. Commit: `test: cobrir os guards de auth de Preferencias com teste de render`

---

## Task 3: Fundir

1. Levar para a sobrevivente cada linha marcada como "existe em um só lado" na Task 1.
2. Conferir **item a item** contra a tabela, não por impressão.
3. Manter as entradas de navegação funcionando (Task 1 passo 4).

- [ ] Task 3 concluída. Commit: `refactor: absorver a implementacao perdedora de Preferencias`

---

## Task 4: Deletar a perdedora

1. Remover o componente, e todo estado/contexto que só ela usava.
2. `grep -rn "Sair"` e `grep -rn "logout"` em `src/` precisam apontar para **um** arquivo.
3. Justificar cada remoção no commit ([`CLAUDE.md`](../../../CLAUDE.md)).

- [ ] Task 4 concluída. Commit: `chore: deletar a segunda implementacao de Preferencias`

---

## Task 5: Reconciliar ([`CONVENTIONS.md`](../CONVENTIONS.md) §5)

1. Ticar só o que foi feito; desvios inline com `> **DEVIATION:**`.
2. Corrigir a spec onde divergiu.
3. Fila de validação: seção nova cujo roteiro **é a tabela da Task 1**, linha por linha.
4. Fechar `C5` e `X12` no [`BACKLOG.md`](../BACKLOG.md), ou dizer o que sobrou de cada um.
5. Anotar no `D12` que o defeito virou impossível de duplicar.

- [ ] Task 5 concluída. Commit: `docs: reconciliar o Spec 8`
