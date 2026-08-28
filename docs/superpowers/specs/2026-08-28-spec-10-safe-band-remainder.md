# Spec 10 — Fechar a faixa segura restante

**Data:** 2026-08-28
**Origem:** [`WORK-ORDER.md`](../WORK-ORDER.md) itens 7, 8 e 11, mais os investigativos que não
mudam código.
**Autorização:** sessão autônoma. O usuário pediu *"faça tudo que não precisar de decisão minha"*
e delegou as decisões intermediárias ao agente principal.

---

## 1. Por que esta spec existe

A sessão de 2026-08-10 fechou 7 dos 11 itens da faixa segura e escreveu as Specs 7, 8 e 9 sem
implementar. Sobrou uma lista curta e nomeada — `X15`, `X11`, `X12`, `X9`, e o `S-3b` que fica
atrás do `X12` — mais duas specs cujo *trabalho de leitura* é executável por agente ainda que a
implementação não seja.

Esta spec não introduz alvo novo. Ela encerra o que já estava enumerado, na ordem em que as
dependências permitem, e para explicitamente na fronteira de cada decisão que é do usuário.

---

## 2. Objetivos

| # | Item | Contrato |
|---|---|---|
| 2.1 | **`X18`** | Reordenar uma coleção não altera `added_by` de nenhuma linha. Vale para os **dois** repositórios: `saravafy-mobile-app` e `saravafy-web-app` |
| 2.2 | **`X15`** | No fluxo inverso (`AddToCollection.tsx`), uma adição que volta `alreadyExists` deixa o cache **idêntico** ao estado anterior à tentativa — sem item fantasma na lista e sem `pontosCount` inflado — e a invalidação de `onSettled` alcança a chave que o patch otimista tocou |
| 2.3 | **`X11`** | O mock do query-builder do Supabase e o `flushMacrotask` existem em **um** lugar, importados pelos dois testes |
| 2.4 | **`X9`** | `npm test` não emite nenhum `not wrapped in act(...)`. O portão da suíte volta a ser legível |
| 2.5 | **`X12`** | `ProfileSection`, `LogoutSection` e o cabeçalho de Preferências têm teste de render que falha se o guard de `!user` for removido ou se a ordem dos hooks quebrar |
| 2.6 | **`S-3b`** | Os quatro sítios que derivam papel à mão passam a derivar por `useTerreiroRole`. Refatoração **preservadora de comportamento**, provada por teste, não mudança de regra |
| 2.7 | **`S-3a`** | Nenhuma cópia local de extração de mensagem de erro sobrevive fora de `src/lib/errors.ts` |
| 2.8 | **`X4`** | `PontoSubmissionKind` e o mapeamento da UI de revisão concordam sobre o nome do valor, ou a divergência é provada inofensiva e registrada |
| 2.9 | **Spec 9** | Executada como investigação: o risco de `react-native-track-player` sob New Architecture é quantificado e as saídas custeadas, com recomendação |
| 2.10 | **Spec 8 Task 1** | Inventário das duas UIs de Preferências entregue. **Para antes da fusão** — a escolha rota-vs-overlay é do usuário |
| 2.11 | **`X14`/`X17`** | O SQL de correção das policies fica **escrito e revisável**, em arquivo, **não aplicado** |

---

## 3. Não-objetivos, e por quê

Cada linha aqui foi considerada e recusada nesta passada. O motivo importa mais que a recusa.

| Item | Por que fica fora |
|---|---|
| **`X16`** | O `WORK-ORDER` o listava na faixa segura, mas condicionar `useEditableCollections` e `useMyEditableTerreirosQuery` a `visible` troca *quando* a busca acontece: hoje ela está quente quando a folha abre, depois passaria a começar na abertura. Isso é spinner onde não havia — **comportamento visual**, que é faixa proibida. O próprio `BACKLOG.md` já o classificava como "registrado em vez de acionado" por custo baixo. Fica registrado |
| **`C4`** | Utilitário compartilhado de tolerância a schema, replicado em 10+ arquivos. É lógica de sobrevivência, e a [`CONVENTIONS.md`](../CONVENTIONS.md) §10 manda portar sem "melhorar". Consolidar dez cópias de fallback sem aparelho para confirmar que cada uma continua degradando igual é exatamente o risco que a §10 descreve |
| **`X3`** | 507 casts `any`. Volume alto, valor por unidade baixo, e cada remoção pode revelar um tipo que só o runtime conhece |
| **`X6`** | `bytesEstimate` mede o blob de metadados e é exibido como "Tamanho". Corrigir exige decidir *o que* mostrar no lugar — decisão de produto |
| **Spec 7** (`S-4a`) | Unificação de navegação. Faixa proibida explícita |
| **Spec 8 Tasks 3-5** | A fusão depende de escolher rota ou overlay. Decisão do usuário |
| **Aplicar policy RLS** | Faixa proibida explícita. Esta spec entrega o SQL, não a migration |
| **Rotacionar o PAT do `saravafy-web-app`** | Só o usuário tem acesso ao dashboard |
| **`saravafy-web-app` paridade, `saravafy-backoffice` apostilas** | Trabalho de feature e de pipeline de conteúdo, ambos fora de "faça o que não precisa de decisão". A única exceção é o `X18`, que é correção de defeito |

---

## 4. Restrições globais (vinculantes para todas as tasks)

1. **Portão de agente:** `npx tsc --noEmit` com **saída zero** e `npm test` com **zero falhas**.
   Nunca afirmar um total de testes ([`CONVENTIONS.md`](../CONVENTIONS.md) §3).
2. **Nada de layout, navegação ou comportamento visual.** Se uma task descobrir que sua correção
   muda o que o usuário vê, ela para e reporta em vez de seguir.
3. **Um commit por mudança coesa**, Conventional Commits, mensagem explicando o *porquê*.
   Direto em `main`, sem branch ([`CLAUDE.md`](../../../../CLAUDE.md)).
4. **Chave de cache vem do registro** ([`CONVENTIONS.md`](../CONVENTIONS.md) §11). Nenhum literal
   inline novo.
5. **Teste encoda a spec, não a implementação** ([`CONVENTIONS.md`](../CONVENTIONS.md) §7). Um
   teste que passa antes da correção não prova nada e é defeito da task.
6. **Colar saída real de comando**, nunca afirmar sucesso ([`CONVENTIONS.md`](../CONVENTIONS.md) §3).
7. **Nada de build EAS.**
8. **Nada de escrita no Supabase** — nem migration, nem `INSERT`/`UPDATE`/`DELETE`. Leitura é
   permitida.

---

## 5. Definição de pronto

**Agent DoD:** objetivos 2.1 a 2.11 satisfeitos ou explicitamente parqueados com decisão
registrada; `tsc` limpo; zero falhas; zero avisos de `act()`; commits no `main`.

**Human DoD:** apêndice novo na [`HUMAN-VALIDATION-QUEUE.md`](../HUMAN-VALIDATION-QUEUE.md)
cobrindo o `S-3b` (as quatro telas continuam mostrando os mesmos controles para os mesmos papéis)
e o `S-3a` (as mensagens de erro varridas continuam legíveis). Nada disso bloqueia commit.
