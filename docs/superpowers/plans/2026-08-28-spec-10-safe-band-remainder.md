# Spec 10 — Fechar a faixa segura restante: Implementation Plan

**Spec:** [`specs/2026-08-28-spec-10-safe-band-remainder.md`](../specs/2026-08-28-spec-10-safe-band-remainder.md)
**Working directory:** `C:\saravafy\saravafy-mobile-app` (Windows, PowerShell ou Git Bash).
**Baseline verificado 2026-08-28:** `npx tsc --noEmit` saída zero; `npm test` 12 suítes,
115 testes, 0 falhas, com os 3 avisos de `act()` do `X9` presentes.

---

## Restrições globais — valem para toda task

Copiadas da spec §4. Todo subagente recebe este bloco literalmente.

1. Portão: `npx tsc --noEmit` com **saída zero**; `npm test` com **zero falhas**. Nunca afirmar um
   total de testes.
2. **Nada de layout, navegação ou comportamento visual.** Se a correção mudar o que o usuário vê,
   pare e reporte.
3. Um commit por mudança coesa. Conventional Commits. Mensagem explica o *porquê*. Direto em `main`.
4. Chave de cache só do registro `src/queries/queryKeys.ts`. Nenhum literal inline novo.
5. Teste encoda a spec, não a implementação. Teste que passa **antes** da correção é defeito da task:
   rode-o contra o código não corrigido e cole a falha.
6. Cole saída real de comando. Nunca afirme sucesso sem ela.
7. Nada de build EAS. Nada de escrita no Supabase (leitura é permitida).

---

## Ordem e dependências

```
Task 1 (X18) ──┐
Task 2 (X15) ──┤  independentes entre si
Task 3 (X11) ──┘
                  Task 4 (X9)   depende do Task 3 (mesmos arquivos de teste)
Task 5 (X12) ──── Task 6 (S-3b)   o X12 é o que torna o S-3b verificável
Task 7 (S-3a) ─── independente
Task 8 (X4)   ─── independente
Task 9 (Spec 9 investigação) ─── independente, só leitura
Task 10 (Spec 8 Task 1 inventário) ─── independente, só leitura
Task 11 (SQL X14/X17, não aplicado) ─── independente, só escrita de arquivo
Task 12 (Reconciliar) ─── main thread, por último
```

---

## Task 1 — `X18`: reordenar não reescreve autoria

**Modelo:** Sonnet. Dois repositórios, teste novo, mas mudança pequena e totalmente especificada.

**Defeito:** `src/screens/CollectionEdit/CollectionEdit.tsx` monta as duas fases da reordenação com
`added_by: userId` no payload. `supabase-js` faz `upsert` com `ignoreDuplicates: false`, ou seja
`ON CONFLICT … DO UPDATE SET` de **toda** coluna presente no payload. Reordenar troca o `added_by`
de todos os pontos para quem arrastou a lista. `position` é a única coluna que deveria mudar.

O mesmo defeito existe, duplicado, em `saravafy-web-app`:
`src/features/collections/saveCollectionPontosOrder.ts` (linhas ~45 e ~62 no estado de 2026-08-10;
**confirme por leitura, não confie no número**).

### Steps

1. Ler `CollectionEdit.tsx` inteiro na região da reordenação. Confirmar que as linhas de `INSERT`
   real (linhas que ainda não existem na tabela) **não** passam por esse caminho — o comentário do
   código diz que as fases 1 e 2 operam sobre `keepIds`, que por definição já estão na coleção.
   Se essa premissa for falsa, **pare e reporte**: remover `added_by` quebraria o insert.
2. Escrever o teste primeiro, em `src/screens/CollectionEdit/` seguindo o padrão de teste de
   payload já usado no repo. Contrato: **o payload de nenhuma das duas fases contém a chave
   `added_by`**, e ambas contêm `collection_id`, `ponto_id`, `position`.
3. Rodar o teste contra o código **não corrigido** e colar a falha. Se ele passar, a asserção está
   errada — conserte a asserção, não o código.
4. Remover `added_by` dos dois payloads. Verde.
5. Aplicar a mesma correção em `saravafy-web-app/src/features/collections/saveCollectionPontosOrder.ts`.
   Ali o portão é o `tsc`/build daquele repo, não a suíte do mobile. Rodar o que aquele repo tiver
   (`npx tsc --noEmit`, e `npm test` se existir suíte).
6. Commit separado por repositório — são dois repositórios git distintos.

**Agent DoD:** teste novo falha antes e passa depois (falha colada no relatório); `tsc` limpo nos
dois repos; zero falhas; dois commits.

---

## Task 2 — `X15`: fluxo inverso não deixa contagem inflada

**Modelo:** Sonnet. Um arquivo, mas a correção é de simetria de cache e exige ler o irmão que já
está certo.

**Defeito:** `AddToCollection.tsx` (o fluxo inverso, ~1.328 LOC) faz patch otimista
(`upsertPontoInCollectionPontosList` + `incrementCollectionPontosCountInTerreiroLists`) e reverte
em `onError`. Mas quando a adição volta `alreadyExists: true` **não é erro** — o `onSuccess`
mostra o toast certo e ninguém desfaz o patch. Resultado: item fantasma na lista e `pontosCount`
+1. Além disso o `onSettled` invalida `collections.pontos` e `collections.byId` mas **não** a chave
que `incrementCollectionPontosCountInTerreiroLists` patcheou.

O irmão correto é `AddToCollectionFlow.tsx` (~linhas 502-517): leia-o primeiro e siga a mesma
forma. Não invente uma terceira.

### Steps

1. Ler os dois arquivos na região da mutation. Anotar exatamente o que o `AddToCollectionFlow`
   faz no ramo `alreadyExists`.
2. Localizar no registro a chave que `incrementCollectionPontosCountInTerreiroLists` patcheia
   (`terreiros.collectionsByTerreiroPrefix` ou equivalente — **confirme em `queryKeys.ts`**,
   não adivinhe).
3. Teste primeiro: uma adição que resolve `alreadyExists: true` deixa o cache de
   `collections.pontos(collectionId)` e a contagem por terreiro **idênticos** ao estado anterior.
4. Rodar contra o código não corrigido, colar a falha.
5. Corrigir: reverter o patch otimista no ramo `alreadyExists` e acrescentar a chave faltante ao
   `onSettled`.
6. **Guarda de escopo:** o `alreadyInCollectionIds` na ~linha 630 é uma pré-checagem que blinda
   parcialmente esse caminho. Não a remova — ela não é a causa e tirá-la muda comportamento.

**Agent DoD:** teste falha antes, passa depois; `tsc` limpo; zero falhas; um commit.

---

## Task 3 — `X11`: mock do Supabase e `flushMacrotask` em um lugar só

**Modelo:** Haiku. Extração mecânica, `tsc` e a suíte pegam qualquer erro.

**Defeito:** o mock do query-builder do Supabase está duplicado quase-verbatim em
`terreiroMembership.test.tsx` e `useTerreiroRole.test.tsx`, e o helper `flushMacrotask` está
verbatim nos dois.

### Steps

1. Ler os dois arquivos. Diferenciar as duas cópias do mock — se divergirem, a versão extraída é a
   **união** do comportamento, e a divergência vai no relatório.
2. Criar `src/test-utils/supabaseQueryBuilderMock.ts` (ou o diretório de test-utils que já exista —
   **procure antes de criar**) com o mock e o `flushMacrotask`.
3. Importar nos dois testes. Deletar as cópias.
4. Zero falhas. Nenhum teste alterado em asserção — só a origem do helper muda.

**Agent DoD:** `tsc` limpo; zero falhas; um commit; `grep` por `flushMacrotask` mostra uma
definição e duas importações.

---

## Task 4 — `X9`: saída de teste limpa

**Modelo:** Sonnet. É diagnóstico: a causa do `act()` precisa ser encontrada, não silenciada.

**Defeito:** `AddToCollectionFlow.test.tsx` emite 3 × `An update to Icon inside a test was not
wrapped in act(...)`. Vem de `@expo/vector-icons` (`createIconSet.tsx:181`) fazendo `setState`
assíncrono ao carregar a fonte, fora de qualquer `act`.

### Steps

1. Reproduzir isolado: `npx jest AddToCollectionFlow` e colar a saída com os três avisos.
2. Corrigir na causa. Ordem de preferência, da melhor para a pior:
   a. Envolver a interação que dispara o carregamento em `await act(...)` / usar `findBy*` no lugar
      de `getBy*`, deixando o React drenar o efeito.
   b. Mockar `@expo/vector-icons` no setup de teste, se o repo já tiver um `jest.setup` com mocks
      de módulo nativo — nesse caso é consistência, não supressão.
3. **Proibido:** filtrar `console.error`, `jest.spyOn(console, "error")` vazio, ou qualquer coisa
   que esconda o aviso sem eliminá-lo. Se nenhuma das duas rotas funcionar, **pare e reporte** —
   parquear é melhor que mascarar.
4. Verificar que a suíte **inteira** (`npm test`) não emite mais nenhum `not wrapped in act`.

**Agent DoD:** `npm test` sem nenhuma ocorrência de `act(`; zero falhas; um commit.

---

## Task 5 — `X12`: testes de render dos guards

**Modelo:** Opus. É o caso (a) do [`EXECUTION.md`](../EXECUTION.md): o teste tem que falhar **pelo
motivo certo**. Um teste que renderiza deslogado e afirma `null` passa sem o guard e não prova nada.

**Defeito:** não existe teste de render para `ProfileSection`, `LogoutSection`, nem para o
cabeçalho de Preferências. Os guards que a Spec 3 instalou são sensíveis à **ordem dos hooks** —
a classe de quebra que passa no `tsc` e em todos os testes atuais e explode em runtime.

### Steps

1. Localizar os três componentes. `TabsHeaderWithPreferences.tsx` tem 3.164 linhas e contém um
   componente aninhado de 630 — identifique **qual** unidade renderizável carrega o guard antes de
   escrever teste.
2. Para cada um, dois testes:
   - **Deslogado com cache quente:** popular o `QueryClient` com dados de um usuário anterior,
     renderizar com `user = null`, afirmar que nenhuma identidade e nenhuma ação de conta aparece.
     *Este é o teste que importa* — o ingênuo (cache vazio) passa sem o guard.
   - **Logado:** o componente renderiza normalmente. Impede que o guard vire um `return null` cego.
3. **Provar que cada teste falha pelo motivo certo:** remova o guard localmente, rode, cole a
   falha, restaure. Um teste que continua verde com o guard removido é defeito da task.
4. Nenhuma mudança em código de produção nesta task. Só teste.

**Agent DoD:** três componentes cobertos; a falha de cada teste com o guard removido colada no
relatório; zero falhas com os guards no lugar; um commit.

---

## Task 6 — `S-3b`: derivação de papel pelo hook

**Modelo:** Sonnet. Bounded pelo inventário abaixo, mas toca permissão em quatro telas.

**Escopo real, já refinado em 2026-08-10 — não re-varra o `grep`.** Um `grep '=== "admin"'`
devolve 58 ocorrências e a maioria **não é o defeito**: são checagens do papel de *outra* entidade
(papel de um convite em `InviteGate`, de um item de lista ou alvo de menu em
`TabsHeaderWithPreferences`, mapeamentos de exibição em `accessRoleCopy.ts`, o normalizador em
`domain/terreiroRoles.ts`). `useTerreiroRole` responde "qual o papel **do usuário atual** neste
terreiro" e não substitui nenhuma delas.

**Os quatro alvos, nomeados:**

| Arquivo | Nota |
|---|---|
| `AccessManager.tsx:115` | deriva chamando `useTerreiroMembershipStatus` direto |
| `TerreiroBiblioteca.tsx` | idem |
| `JoinTerreiroButton.tsx:23` | idem |
| `Collection.tsx:222` | **faz as duas coisas ao mesmo tempo** — linha 222 à mão, linha 227 pelo hook. Duas derivações da mesma coisa no mesmo componente |

Três telas já usam o hook corretamente e **não devem ser tocadas**: `Collection` (a parte da linha
227), `AddToCollection`, `PlayerScreen`.

### Steps

1. Confirmar os números de linha por leitura — o inventário é de 2026-08-10 e o código andou.
   Se um alvo sumiu ou mudou de forma, registre e siga.
2. Para cada alvo, **antes** de mudar: escrever a asserção que fixa o comportamento atual
   (qual papel o componente deriva para qual entrada). Esta é uma refatoração preservadora de
   comportamento; o teste é a prova de que ela preservou.
3. Trocar a derivação manual por `useTerreiroRole`. Um commit por arquivo.
4. `Collection.tsx` é o mais delicado: as duas derivações precisam **colapsar em uma**, e é
   preciso verificar que a sobrevivente é a que o restante do componente já consumia.
5. **Se em qualquer alvo o hook produzir um papel diferente da derivação manual, pare.** Isso não
   é refatoração, é mudança de regra de permissão, e é decisão do usuário. Registre em
   `QUESTIONS-FOR-USER.md` e siga para o próximo alvo.

**Agent DoD:** quatro alvos migrados ou parqueados com motivo; asserções de preservação verdes;
`tsc` limpo; zero falhas; commits por arquivo. **Human DoD:** as quatro telas mostram os mesmos
controles para os mesmos papéis — vai para a fila.

---

## Task 7 — `S-3a`: uma extração de mensagem de erro só

**Modelo:** Sonnet. Mecânico e repetitivo, mas cada sítio precisa de conferência.

**Estado:** desbloqueado. A Spec 4 fez o utilitário lidar com conectividade e o `X13` unificou a
extração, que era a razão de o `S-3a` ter que esperar. Inventário de 2026-08-09: **12 definições =
1 canônica + 11 cópias**, das quais a Spec 4 removeu uma. Restam ~10.

**Duas coisas a saber antes de começar:**
1. `src/screens/CollectionAddToCollection/addToCollectionModel.ts:107` é **exportado** — cheque
   os importadores em vez de assumir que toda cópia é local ao arquivo.
2. O `X13` já foi decidido, então nenhum sítio deve continuar passando `String(e)`. Se algum
   passar, trocar por passar o erro cru é parte da varredura.

### Steps

1. Inventariar as definições vivas. Colar a lista no relatório com arquivo e linha.
2. Por cópia: apagar a definição local, importar `getErrorMessage` de `src/lib/errors.ts`,
   conferir que os call sites daquela cópia recebiam o mesmo contrato (fallback, trim).
3. **Onde o contrato divergir** — uma cópia com fallback diferente, ou que não trima — a
   canônica ganha, porque foi ela que a Spec 1 §3.2 e o `X1` fixaram. Mas **registre a
   divergência**: é mudança de texto visível ao usuário e vira linha na fila humana.
4. Commits agrupados por área (telas de terreiro, telas de coleção, etc.), não um por arquivo.

**Agent DoD:** `grep` por definição de extração de mensagem fora de `src/lib/errors.ts` volta
vazio; `tsc` limpo; zero falhas. **Human DoD:** as mensagens varridas continuam legíveis — fila.

---

## Task 8 — `X4`: `"issue"` vs `"problem"`

**Modelo:** Haiku. Duas leituras e uma decisão pequena, ou um relatório.

**Defeito relatado:** `PontoSubmissionKind` em `src/domain/ponto.ts:48` tem `"issue"`; o mapeamento
da UI de revisão usa `"problem"`.

### Steps

1. Ler `src/domain/ponto.ts` na região do tipo e localizar o mapeamento na UI de revisão.
   **Uma busca de 2026-08-28 por `"problem"` nesses arquivos voltou vazia** — confirme se o item
   ainda procede.
2. Se **não** procede: marque `X4` como falso positivo no `BACKLOG.md`, citando o que você leu
   ([`CONVENTIONS.md`](../CONVENTIONS.md) §6 — marcar, não apagar). Commit de doc. Fim da task.
3. Se procede: descobrir qual dos dois valores o **banco** grava. É leitura de dado, permitida.
   Sem acesso, decidir pelo que o código de escrita envia. O domínio se alinha ao dado, nunca o
   contrário.
4. Corrigir o lado errado, com teste que fixa o valor.

**Agent DoD:** item resolvido ou marcado falso positivo com evidência; `tsc` limpo; zero falhas.

---

## Task 9 — Spec 9 executada: player e New Architecture

**Modelo:** Opus. Investigação com quatro saídas a custear e uma recomendação a defender. É o
caso (d) do [`EXECUTION.md`](../EXECUTION.md): verificar uma suposição contra a realidade.

**Plano completo:** [`plans/2026-08-10-spec-9-player-new-architecture.md`](2026-08-10-spec-9-player-new-architecture.md).
Execute as Tasks 1 a 4 dele. A Task 5 (reconciliar) é do main thread.

**Premissa a testar, não a assumir:** `react-native-track-player` não suportaria New Architecture,
e `app.config.ts:76` liga a New Architecture.

### Steps

1. Seguir o plano da Spec 9 tal como escrito.
2. **Nenhuma mudança em código de produção.** Esta task produz conhecimento e um documento.
3. O produto é o próprio arquivo da Spec 9 preenchido: risco quantificado, quatro saídas custeadas,
   recomendação com o raciocínio exposto.
4. Se a investigação **refutar** a premissa (a lib passou a suportar, ou a flag não está ligada),
   isso é o resultado mais valioso possível — registre com a evidência e corrija a spec
   ([`CONVENTIONS.md`](../CONVENTIONS.md) §6).

**Agent DoD:** Spec 9 preenchida com evidência colada; recomendação escrita; um commit de doc.

---

## Task 10 — Spec 8 Task 1: inventário de Preferências

**Modelo:** Sonnet. Leitura de dois arquivos grandes e uma tabela de diferenças.

**Plano:** [`plans/2026-08-10-spec-8-preferences-unification.md`](2026-08-10-spec-8-preferences-unification.md),
**apenas a Task 1.** As Tasks 3-5 (fundir, deletar a perdedora) dependem da escolha rota-vs-overlay,
que é do usuário.

O `X12` foi absorvido pela Task 2 da Spec 8 — mas nesta spec ele vive na Task 5, que já cobre o
cabeçalho de Preferências. Não duplique.

### Steps

1. Executar a Task 1 do plano da Spec 8: inventariar as duas implementações
   (`TabsHeaderWithPreferences` overlay vs `Preferences.tsx` rota), campo a campo.
2. Produzir a tabela que a Task 1 pede: o que cada uma tem, o que só uma tem, onde já divergiram.
3. **Parar antes da fusão.** Registrar em `QUESTIONS-FOR-USER.md` a pergunta rota-vs-overlay com
   os dados do inventário do lado, para o usuário decidir com evidência em vez de preferência.

**Agent DoD:** inventário escrito no plano da Spec 8; pergunta registrada; um commit de doc.

---

## Task 11 — SQL das policies, escrito e não aplicado

**Modelo:** Haiku. Transcrição a partir de policies já lidas e documentadas.

**`X17`** (escalação de privilégio): `collections_pontos_update_owner_or_terreiro_admin_editor` tem
`USING` corretamente escopado e `WITH CHECK` literalmente `true`. Correção: repetir o predicado do
`USING` no `WITH CHECK`.

**`X14`** (assimetria de leitura): INSERT não olha `visibility`, as três policies de SELECT olham.
A correção **depende de decisão de produto** — o que `private` significa para uma coleção de
terreiro. Escreva as **duas** variantes de SQL, rotuladas, e deixe a escolha para o usuário.

### Steps

1. Ler as policies vivas por `SELECT` em `pg_policies` — **somente leitura**. As ferramentas
   `mcp__supabase__*` estão disponíveis nesta sessão; use `execute_sql` com `SELECT`.
   Não use `apply_migration`.
2. Escrever `docs/superpowers/sql/2026-08-28-rls-collections-pontos.sql` com: o estado atual como
   comentário, o `ALTER POLICY` do `X17`, e as duas variantes do `X14` claramente rotuladas e
   comentadas como mutuamente exclusivas.
3. Cabeçalho do arquivo em letras grandes: **NÃO APLICADO. Requer decisão e execução do usuário.**
4. Atualizar `QUESTIONS-FOR-USER.md` apontando para o arquivo.

**Agent DoD:** arquivo SQL existe, nenhuma escrita no banco foi feita; um commit de doc.

---

## Task 12 — Reconciliar

**Modelo:** main thread (Opus). **Não delegar** — [`EXECUTION.md`](../EXECUTION.md), regra que
sobrepõe a tabela.

1. Ticar as caixas realmente concluídas neste plano.
2. Registrar cada desvio inline, marcado `> **DEVIATION:**`.
3. Atualizar `BACKLOG.md`: marcar resolvidos, corrigir o que a execução refutou
   ([`CONVENTIONS.md`](../CONVENTIONS.md) §6).
4. Atualizar `WORK-ORDER.md` com o estado final da faixa segura.
5. Anexar as checagens humanas (Tasks 6 e 7) à `HUMAN-VALIDATION-QUEUE.md`.
6. Consolidar `QUESTIONS-FOR-USER.md` com tudo que ficou para o usuário.
