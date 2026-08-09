# Fila de validação humana

**Atualizado:** 2026-08-09 (após Specs 3, 4 e 5)

Tudo que precisa de olho humano num app rodando. Agente não valida nada daqui.

**Como usar:** rodar o app uma vez, percorrer as seções na ordem, marcar `[x]` no que passou e
anotar o que quebrou na coluna "Observado". Depois é só me passar o arquivo — os desvios viram
correção de doc e/ou de código.

**Regra:** item pendente aqui **nunca** bloqueia commit de agente. Ver
[`CONVENTIONS.md`](CONVENTIONS.md) §4.

---

## Antes de começar

- [x] `npx tsc --noEmit` → zero saída (verificado 2026-08-09, após fechar Spec 5)
- [x] `npm test` → 0 falhas (verificado 2026-08-09). O portão é **0 falhas**, nunca um total fixo
- [ ] Hard refresh / rebuild do dev client antes de testar (HMR mente — ver `CLAUDE.md`)

Build está limpo — **Specs 1, 2a, 2b, 3, 4 e 5** estão Agent-DoD-completas. Pode rodar o app.

**Spec 6 (teclado) está em andamento por outro caminho.** O build nativo local não passa nesta
máquina — `ninja.exe` não é long-path-aware, então o limite de 260 caracteres do Windows corta os
caminhos do codegen **independente** de `LongPathsEnabled`. Não é incompatibilidade da lib.
**Decisão (2026-08-09): verificar via build EAS**, que roda em Linux e não tem esse limite.
Detalhes: `plans/2026-08-09-spec-6-keyboard-avoidance.md`, Task 2 Step 3.

⚠️ **Consequência para esta rodada de validação:** a Spec 6 muda módulo nativo, então o dev client
atual **não** serve para testá-la — vai precisar instalar o APK novo do EAS. Os itens das Specs 3-5
abaixo não dependem disso e podem ser testados no dev client que você já tem.

Quando o APK novo chegar, comece pela [seção 0](#0-spec-6-teclado--checar-antes-de-qualquer-outra-seção):
o provider já está montado e tem que ser invisível — se ele mexer em layout sozinho, nenhum
resultado de teclado depois disso é atribuível.

---

## Estado do repo no momento deste teste

O trabalho de sync offline que antes estava **não commitado** foi commitado em 2026-08-09
(`87d09c3` banner offline dispensável + auto-sync, `6cc9e9d` créditos de composição/intérprete no
player). Continua **sem spec escrita** — segue rastreado como `S-5` em [`BACKLOG.md`](BACKLOG.md).

Isso muda comportamento de banner offline, re-sync e a linha de crédito do player. Se aparecer algo
estranho relacionado a conexão/offline ou ao rodapé do player, provavelmente vem daí e não das
specs. Anotar em [Fora de escopo](#fora-de-escopo).

**Decidido (2026-08-08): fica como está, não reverter.** Vai ser specado *depois* desta validação,
usando o que você observar como entrada. Ou seja: o que você anotar sobre offline aqui **não é bug
pra corrigir agora**, é matéria-prima pra spec. Vale anotar mesmo o que parecer funcionar bem.

---

## O que mudou desde a última rodada (Specs 3, 4, 5)

Onze correções de código. As linhas novas/reabertas estão marcadas nas seções abaixo:

| Defeito | O que mudou | Onde testar |
|---|---|---|
| `D8` | Cargo de admin não vaza mais após logout | 5.9, 5.10, 5.11 (e 2.6, 3.3) |
| `D12` | Sem identidade falsa "? Você" nem "Sair" deslogado — **em 4 lugares**, não 2 | 5.7, 5.8 |
| `D7` `D10` | Erro de rede vira texto legível em vez de `TypeError` | 1.4, 3.5 |
| `D11` | Refetch que falha não esconde mais a lista já carregada | 4.x (Terreiros) |
| `D6` | Ponto duplicado agora avisa de verdade | 1.7 |
| `D9` | "+" de adicionar à coleção aparece no player de coleção | 2.7, 2.8 |

---

## 0. Spec 6 (teclado) — checar **antes** de qualquer outra seção

Origem: Spec 6 (`react-native-keyboard-controller`), §4.1.

**Esta seção vem primeiro de propósito.** O `KeyboardProvider` já está montado na raiz
(`app/_layout.tsx`, `d1efb58`), mas **nenhuma tela optou por ele ainda** — nada de teclado mudou.
Ou seja: neste build o provider tem que ser *invisível*. Se ele mexer em layout sozinho, toda
observação de teclado feita depois fica sem dono — não dá pra saber se o que você viu veio da tela
que optou ou do provider. Por isso é o item 0, e por isso ele **bloqueia** o resto da rodada de
Spec 6.

> ⚠️ **Precisa de APK novo do EAS — o dev client atual não serve.** A Spec 6 adiciona módulo
> nativo, então a mudança não chega por reload de JS. O build local (`npm run android:dev`) **não
> funciona nesta máquina**: `ninja.exe` não declara `longPathAware`, então o limite de 260 caracteres
> do Windows corta os caminhos do codegen mesmo com `LongPathsEnabled=1`. Por isso a verificação
> nativa foi feita no EAS, que roda em Linux. Instale o APK do build mais recente antes de começar.

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 0.1 | Abrir o app no APK novo e percorrer Home, o sheet de tag de médium e qualquer sheet com campo de texto — **sem digitar nada, só olhar** | Tudo exatamente igual a antes: mesmos insets, mesma altura de sheet, mesma barra de status. Nenhum deslocamento, nenhuma faixa nova em cima ou embaixo | |
| 0.2 | O app **abre sem crashar** | O build prova que o módulo nativo linka, **não** que ele registra em runtime sob New Architecture. Se crashar no boot, é aqui que aparece | |
| 0.3 | Coleção → adicionar tag de médium → focar o campo de texto | O campo sobe **acima** do teclado sozinho, sem você rolar na mão | |
| 0.4 | Mesmo sheet, com **teclado de terceiro** (Gboard/SwiftKey) e/ou abrindo a linha de emoji | Continua funcionando. **Variação de altura é o ponto inteiro do piloto** — o filler de 290px falhava exatamente aqui | |
| 0.5 | Fechar o teclado no sheet de tag de médium | **Nenhum espaço vazio sobrando** onde o filler ficava. Era esse buraco que sobrava quando o teclado era mais baixo que 290px | |
| 0.6 | No mesmo sheet: arrastar pra fechar, tocar no backdrop, e enviar o formulário | Os três continuam funcionando. Se o arrastar-pra-fechar parou, o gesto de pan do `BottomSheet` está brigando com o scroll view novo — **isso é o achado mais valioso que este piloto pode gerar** | |
| 0.7 | Abrir **outro** sheet que ainda usa o filler (ex.: o de convite) e focar um campo | Comportamento **antigo**, pra você sentir a diferença lado a lado. Se este também mudou, o piloto vazou pros outros 12 e isso é bug | |

> **0.1 — se algo se mexeu, pare e reporte antes de testar qualquer coisa de teclado.** Um provider
> que altera layout por conta própria torna toda observação visual seguinte não-atribuível. Não
> tente compensar o deslocamento na tela — pela §4.1 da spec isso é achado, não ajuste.
>
> **Onde olhar com mais atenção: barra de status e barra de navegação.** O provider foi montado
> **sem prop nenhuma**, mas isso *não* significa que os flags de translucência estejam desligados —
> essa era a leitura errada, corrigida em revisão. A lib faz
> `statusBarTranslucent={IS_EDGE_TO_EDGE || statusBarTranslucent}`, e o mesmo OR para
> `navigationBarTranslucent` e `preserveEdgeToEdge`. Ou seja: **com edge-to-edge ligado, esses três
> chegam `true` na view nativa independente do que a gente passe.** No iOS, `isEdgeToEdge()` é
> `() => true` fixo. No Android, ele lê a constante `isEdgeToEdge` do `DeviceInfo` do **core do RN**
> (não do pacote `react-native-edge-to-edge`, que realmente não está instalado) — e este app liga
> `edgeToEdgeEnabled: true` (`app.config.ts:106`) em RN 0.81.5, então quase certamente é `true`
> também no Android.
>
> **O que isso muda no que você procura.** Não é "`true` seria bandeira vermelha" — `true` é o
> estado esperado, e é coerente com o edge-to-edge que o app já tem hoje sem a lib. A pergunta é se
> a view nativa do keyboard-controller faz **algo além** disso: conteúdo passando por baixo da barra
> de status ou da de navegação onde antes não passava, padding que sumiu no topo ou no rodapé, altura
> de sheet diferente. Se as barras se comportarem exatamente como no build anterior, o item passa.
> Qualquer diferença aí vale print — é o ponto mais provável de regressão desta montagem.
>
> Como nenhuma prop é passada, a lib também **não** emite o warning de dev
> "…ignored when using react-native-edge-to-edge" (ele só dispara para props definidas). Ausência
> desse warning é esperada e não prova nada sobre os flags.
>
> **0.3 — se o campo não subir, suspeite disto primeiro.** A tela piloto passa
> `scrollEnabled={false}` para o `BottomSheet` **junto** com o `keyboardAware` novo. No React Native
> `scrollEnabled={false}` desliga só o arrasto do usuário — rolagem programática (que é o que o
> `KeyboardAwareScrollView` usa) continua funcionando. Mas isso **não foi verificado em aparelho**,
> e é a explicação mais provável caso o piloto pareça não fazer nada. Se for esse o caso, não é a
> lib que está errada: é a combinação dessas duas props, e vira decisão para a spec de rollout.
>
> **0.6 é o item mais valioso da seção, mesmo se passar.** A spec de rollout precisa saber se o
> `KeyboardAwareScrollView` conflita com o `PanResponder` do `BottomSheet`. Se conflitar, a lib
> oferece um `ScrollViewComponent` customizado para integrar com gesture-handler — mas só dá pra
> saber com a mão. Anote o que sentiu mesmo que funcione.
>
> **0.7 protege as outras 12 telas.** O `keyboardAware` tem default `false` e existe teste de
> render provando que o caminho default não mudou, mas teste de render não é aparelho.
>
> **Não dá pra verificar por agente.** `tsc` e a suíte de testes passaram (Task 3), e nenhum dos
> dois diz nada sobre pixel na tela. É check humano por natureza — ver
> [`CONVENTIONS.md`](CONVENTIONS.md) §4.
>
> **Precisa do APK novo do EAS.** Módulo nativo mudou; o dev client antigo não serve (ver aviso em
> "Antes de começar").

---

## 1. Home

Origem: Spec 1 (`getErrorMessage`), Spec 2a (add-to-collection).

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 1.1 | Abrir Home | Pontos carregam | ✅ OK |
| 1.2 | Buscar um ponto | Filtra sem travar ao digitar | ✅ OK |
| 1.3 | Busca sem resultado | Estado vazio, não spinner infinito | ✅ OK |
| 1.4 | ~~Modo avião → puxar pra atualizar~~ Modo avião → buscar | ~~Erro com mensagem legível~~ ver nota | 🔧 corrigido (`D7`+`D10`, `2958f6d`/`5722160`) — reteste: deve mostrar "Sem conexão. Verifique sua internet e tente novamente." |
| 1.5 | Ponto → "Adicionar à coleção" | Wizard abre em 2 fases: escolher versão → escolher coleção | ✅ OK |
| 1.6 | Concluir adição | Ponto entra na coleção; toast de sucesso | ✅ OK |
| 1.7 | Adicionar ponto que já está na coleção | Mensagem de duplicado clara, sem crash | 🔧 corrigido (`D6`, `925b8da`) — reteste: "Este ponto já estava na coleção", e o ponto **não** duplica nem muda de posição |

> **1.4 — item da fila estava errado, corrigido 2026-08-08.** Home **não tem** "puxar pra
> atualizar" — nunca teve (`fetchAllPontos()` único + refetch ao focar tela, não
> `RefreshControl`). Não é bug, é ausência de recurso; o item presumia algo que não existe nesta
> tela. Testado no lugar: busca em modo avião. **Isso sim é bug confirmado** — mensagem crua
> vazando em vez de texto legível. Causa raiz e correção: `D7` em [`BACKLOG.md`](BACKLOG.md).
>
> **1.7 — bug confirmado, determinístico (sempre reproduz, não é flaky).** Causa raiz: o insert usa
> `ignoreDuplicates: true`, então o banco nunca acusa duplicado — a mensagem de "já estava na
> coleção" está morta no código. Pior: a UI mostra "adicionado com sucesso" e mexe no cache local
> mesmo o banco não tendo feito nada, ou seja cache e banco ficam dessincronizados até o próximo
> refetch. Detalhe e correção: `D6` em [`BACKLOG.md`](BACKLOG.md).

**Atenção 1.5:** o wizard do Home foi substituído pelo componente unificado `AddToCollectionFlow`.
O comportamento de 2 fases tem que ser idêntico ao de antes. Qualquer passo faltando é regressão.

---

## 2. Player

Origem: Spec 1 (`useTerreiroRole`), Spec 2a (add-to-collection).

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 2.1 | Abrir player a partir de uma coleção de terreiro | Letra e áudio carregam | ✅ OK |
| 2.2 | Tocar áudio | Playback funciona, footer responde | ✅ OK |
| 2.3 | Navegar entre versões (‹ Versão N de N ›) | Título, letra e áudio trocam juntos | ✅ OK |
| 2.4 | Como **admin/curimba** do terreiro | Botões de editar tag aparecem | ✅ OK |
| 2.5 | Como **membro comum** | Botões de editar tag **não** aparecem | ✅ OK |
| 2.6 | Como **não-membro** | Nenhuma afordância de edição | 🔧 corrigido (`D8`, `8fd05c3`) — reteste junto com 5.9 |
| 2.7 | Menu → "Adicionar à coleção" | Abre direto na escolha de coleção (fase única, versão já selecionada) | 🔧 corrigido em código (`D9`) — pendente de teste manual, ver nota |
| 2.8 | Concluir adição pelo player | Ponto entra na coleção; toast de sucesso | 🔧 desbloqueado por 2.7 (`D9`) — pendente de teste manual, ver nota |

**Atenção 2.4–2.6:** gating agora vem de `useTerreiroRole().canEditCustomTags` em vez de checagem
inline. Tem que dar exatamente o mesmo resultado de antes. Membro inativo/pendente **nunca** pode
ver edição.

> **2.6 — bug real, mecanismo confirmado no código, diferente do `D1` já catalogado.**
> `useTerreiroMembershipStatus` usa `placeholderData: (prev) => prev` — ao deslogar, a consulta
> nova (sem usuário) não busca nada, mas continua mostrando o resultado da consulta *anterior*
> como placeholder. Todo botão gated por `canEditCustomTags` (e qualquer outro que use esse hook)
> fica preso no cargo de antes do logout até a tela desmontar. Reproduz exatamente como você
> testou: logar como admin/curimba → deslogar sem fechar o app → cargo antigo vaza pra visão de
> visitante. Causa raiz e severidade: `D8` em [`BACKLOG.md`](BACKLOG.md), P0.
>
> **2.7 — confirmado bug pré-existente, não é regressão da Spec 2a.** O botão "+" só existe no
> player em modo biblioteca pública (`isLibraryPlayer`); nunca existiu no player aberto a partir de
> coleção de terreiro. **Decidido (2026-08-08): tratar como bug a corrigir**, não feature nova —
> registrado como `D9` em [`BACKLOG.md`](BACKLOG.md), P0. 2.8 fica bloqueado até isso ser
> corrigido.

**Atenção 2.7:** o modal do player foi substituído pelo mesmo `AddToCollectionFlow` do Home, mas
em modo fase-única. Se ele abrir pedindo pra escolher versão, está errado.

> **2.7/2.8 — corrigido em código (`D9`), pendente de teste manual.** O botão e o mount de
> `AddToCollectionFlow` estavam gated em `isLibraryPlayer` nos dois lugares; ambos foram
> ungated (mantendo `requireAuth`), então o "+" agora deveria aparecer também no player aberto a
> partir de uma coleção de terreiro. Retestar assim:
>
> 1. Abrir um ponto a partir de uma coleção de terreiro (não da biblioteca pública) → confirmar que
>    o "+" aparece no header (2.7).
> 2. Tocar o "+" → confirmar que abre direto na escolha de coleção, fase única, sem tela de versão.
> 3. Concluir uma adição a partir desse contexto → ponto entra na coleção, toast de sucesso (2.8).
> 4. Confirmar que o fluxo do player em modo biblioteca pública continua idêntico (sem regressão).
> 5. Reteste `1.7` (duplicado): adicionar de novo o mesmo ponto/coleção → mensagem "Este ponto já
>    estava na coleção", sem deixar o ponto duplicado na lista.

---

## 3. Coleção

Origem: Spec 1 (`useTerreiroRole`, `getErrorMessage`).

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 3.1 | Abrir uma coleção | Pontos listam | ✅ OK |
| 3.2 | Como admin/curimba | Sheets de adicionar/remover tag aparecem | ✅ OK |
| 3.3 | Como membro comum ou não-membro | Sem afordância de edição | ❌ mesmo vazamento do 2.6 — ver nota |
| 3.4 | Coleção "somente membros" sem ser membro | Gate de acesso aparece, com opção de pedir entrada | 🔮 feature não existe — ver nota |
| 3.5 | Adicionar tag → desligar rede → adicionar outra | **Ver observação abaixo** | 🔧 parcialmente corrigido (`D10`, `cdfc461`) — o toast agora é legível. **`D4` continua aberto**: a tag some da tela só quando o cache expira |

**Atenção 3.5 — defeito conhecido, não é regressão desta spec.** As mutations de tag fazem update
otimista sem snapshot nem rollback (`aggregation.md` §6.6). Erro de rede deixa a tag aparecendo na
UI mesmo sem ter salvo, até o cache expirar (~60s). Confirmar se acontece e anotar — está na fila
de correção do §6.

> **3.3 — mesmo bug do 2.6, screen diferente, não é achado novo.** `canEditCustomTags` em
> `Collection.tsx` usa o mesmo `useTerreiroRole`/`useTerreiroMembershipStatus` do Player — o
> vazamento de permissão pós-logout (`D8`) se manifesta aqui igual. Um fix resolve os dois.
>
> **3.4 — não é bug, é feature que nunca foi construída.** Confirmado no código: o lado de
> *leitura* do gate existe (`Collection.tsx:207`, `isMembersOnly`), mas **nenhuma tela de
> criar/editar coleção grava `visibility`** — não há como uma coleção real chegar a esse estado
> hoje. Registrado como ideia futura `F1` em [`BACKLOG.md`](BACKLOG.md), fora do escopo "só
> conserta bug" deste esforço. Sua sugestão de coleção privada também anotada lá.
>
> **3.5 — mesma família do `D7` (Home/1.4), mas revela algo mais fundo.** O toast passa por outra
> cópia local de tratamento de erro (`AddMediumTagSheet.tsx`), só que mesmo o utilitário
> *centralizado* do Spec 1 (`getErrorMessage`) não trata erro de rede — ele repassa o texto cru do
> runtime sempre. Ou seja: **nem centralizar tudo resolveria isso sozinho.** Registrado como `D10`
> em [`BACKLOG.md`](BACKLOG.md), com nota de que precisa ser corrigido antes/junto do `S-3a`, não
> depois.

---

## 4. Terreiros

Origem: Spec 1 (`<QueryBoundary>` — adotado aqui, **não** no Home como o plano dizia).

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 4.1 | Abrir aba Terreiros (primeira vez, cache frio) | Spinner centralizado, depois lista | ✅ parece instantâneo — ver nota |
| 4.2 | ~~Puxar pra atualizar com dados já na tela~~ | ~~Lista continua visível, sem piscar~~ | 🔧 gesto não existe — mas código já verificado, ver nota |
| 4.3 | Modo avião → refetch em segundo plano com lista já carregada (sem gesto de pull-to-refresh — ver recipe na nota) | Lista continua visível; sem tela de erro por cima do conteúdo | 🔧 corrigido em código (`D11`) — pendente de teste manual, ver recipe na nota |
| 4.4 | Modo avião + cache frio | Card de erro "Não foi possível carregar" + mensagem legível | 🔧 não testável via dev client — ver nota |
| 4.5 | Usuário sem nenhum terreiro | Estado vazio | 🔮 não é esse o design — ver nota |

**Atenção 4.2 e 4.3:** esse é exatamente o comportamento anti-*flicker* que o `<QueryBoundary>`
deveria garantir (stale-while-revalidate). Se piscar, o componente não está sendo usado ali ou está
recebendo `data: undefined` durante o refetch. É o item mais relevante da fila pro seu objetivo.

> **4.1 — não é prefetch no boot, é cache de sessão (e revelou que o §6.1 do aggregation.md está
> certo).** Verificado no código: a query que a aba Terreiros realmente lê
> (`terreiros.withRole`) **não** é aquecida no boot — só `terreiros.exploreInitial` é (via
> `prefetchExploreTerreiros`), e `Terreiros.tsx` nunca lê essa chave. Ou seja, o achado do
> `aggregation.md` §6.1 ("prefetch morto, sem consumidor") **é verdadeiro**, diferente das 2 waves
> do audit de code-quality que eram falso-positivo. A sensação de "já carregado" que você notou
> vem de `staleTime`/cache de sessão normal (30s/30min), não de otimização proposital — existe até
> um helper pronto (`prefetchTerreirosWithRole`) que nunca foi ligado ao boot (`X8` no
> [`BACKLOG.md`](BACKLOG.md), baixa prioridade já que na prática já parece rápido).
>
> **4.2 — sem gesto de pull-to-refresh (confirmado app inteiro, não só Home), mas dava pra
> verificar direto no código.** `Terreiros.tsx` guarda `isLoading` certo (só esconde dado se
> `terreiros.length === 0`) — esse guard já era correto antes desta spec e continua sem mudança.
>
> **4.3 — corrigido (Spec 4, Task 5, `D11`).** O guard de `error` não existia: ficava `true` mesmo
> com lista carregada, e qualquer refetch em segundo plano que falhasse (rede instável, não
> precisava nem ser avião) cobria a lista já carregada com o card de erro — exatamente a garantia
> anti-flicker que o `<QueryBoundary>` existe pra dar. Extraído para `deriveListErrorMessage`
> (`src/screens/Terreiros/deriveListErrorMessage.ts`), agora com o mesmo guard de linhas que
> `isLoading` já tinha, coberto por teste (`deriveListErrorMessage.test.ts`). Falta só a confirmação
> visual — sem gesto de pull-to-refresh, use esta recipe:
>
> 1. Abrir a aba Terreiros com a lista carregando normalmente.
> 2. Esperar mais de 30s (passar do `staleTime`) sem sair da aba.
> 3. Ativar modo avião.
> 4. Disparar um refetch — sair e voltar pra aba, ou apertar "Tentar novamente" no card de erro
>    (se ele aparecer).
> 5. **Esperado: a lista continua na tela, sem card de erro por cima.** Se aparecer o card de erro
>    cobrindo a lista, a regressão voltou.
>
> Caso frio, ainda coberto por 4.4: sem cache e sem conexão (app recém-aberto já em modo avião,
> sem terreiros carregados antes) → o card de erro deve aparecer normalmente. A correção do `D11`
> não muda esse caso — ele nunca teve dado pra proteger (`rowCount === 0`), só o caso de dado já
> carregado que o guard novo passou a proteger.
>
> **4.4 — limitação de ferramenta, não do app.** Dev client depende do Metro pra buscar o bundle
> JS; não abre com o avião já ligado. Pra testar cold-cache+offline de verdade precisa de build
> standalone/release (EAS), não dev client. Anotado, não é bug.
>
> **4.5 — não é bug, é o design atual (confirmado no código).** `fetchTerreirosWithRole` busca
> **todos** os terreiros sem filtro de participação — é diretório público por definição, o vínculo
> do usuário só decora com badge de cargo. Sua ideia de busca já tem filtro client-side pronto
> (`Terreiros.tsx:435-438`, `matchesTerreiroQuery`) — só falta UI de busca visível. Registrado como
> `F2` em [`BACKLOG.md`](BACKLOG.md).

---

## 5. Preferências / Meus terreiros

Origem: Spec 2b (`PreferencesContext` → React Query).

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 5.1 | Login → abrir Preferências | ~~lista onde sou admin~~ ver nota | ✅ OK (lista admin + membro/curimba) |
| 5.2 | Editar um terreiro → salvar → voltar | Lista reflete a mudança **sem refresh manual** | ✅ OK |
| 5.3 | Aceitar convite de admin → voltar | Terreiro novo aparece na lista sozinho | ⏸️ adiado, ver nota |
| 5.4 | Sair de um terreiro | Some da lista sozinho | ✅ OK |
| ~~5.5~~ | ~~Conta/perfil: deslogar de dentro da tela de Preferências~~ | — | 🔧 corrigido (`D12`) — **não reteste esta linha**, use 5.7 e 5.8 |
| 5.6 | **(novo)** Remover/trocar a foto de perfil | Deveria existir alguma forma de controlar a foto exibida | ❌ não existe — ver nota |
| 5.7 | **(novo, reteste pós-fix D12)** Deslogar de dentro da tela de Preferências (rota `/preferences`, componente `ProfileSection`) | Área "Conta" mostra uma afordância "Entrar" (convite pra login); nenhum "? Você" nem identidade falsa aparece | |
| 5.8 | **(novo, pós-fix D12)** Mesmo teste na **outra** implementação: abrir o overlay de preferências pelo header (`TabsHeaderWithPreferences`) deslogado | Nem a linha "Sair" nem a linha de identidade/avatar aparecem. O lápis de editar perfil não fica clicável | |
| 5.9 | **(novo, pós-fix D8)** Logar como admin de terreiro → sair **sem reiniciar o app** → abrir Player e Coleção | Nenhuma afordância de edição admin/curimba. É o defeito original do `D8` | |
| 5.10 | **(novo, pós-fix D8)** Sair e logar com um usuário **diferente** | Nenhum vestígio dos papéis do primeiro usuário | |
| 5.11 | **(novo, guarda de regressão do D8)** Trocar de terreiro **logado**, sem sair | Badges e permissões continuam resolvendo **sem flash de loading**. Testa algo que *não* deve mudar — fácil de esquecer, e é o que protege o `placeholderData` que foi deliberadamente mantido | |

**Atenção 5.2–5.4:** antes era fetch imperativo, agora é `invalidateQueries`. Se ficar dado velho,
o `userId` passado no invalidate não bate com o que o hook lê.

> **5.1 — item da fila era mais estreito que o comportamento real (correto).** A lista mistura
> terreiros onde você é admin **e** onde é membro/curimba, não só admin — confirmado por você como
> o esperado. Ajustado aqui só pra registro, não é bug.
>
> **5.3 — adiado por decisão sua.** Todos os fluxos de convite (aceitar, rejeitar, reenviar) ficam
> pra testar só depois do refactor completo. Não retestar isso nesta rodada.
>
> **5.5 — ✅ corrigido 2026-08-09 pela Spec 3. Substituído pelos itens 5.7–5.8; não reteste esta
> linha.** O diagnóstico original está preservado abaixo porque explica *por que* eram quatro sites e
> não dois — mas ele descreve o estado **anterior** ao fix.
>
> <details><summary>Diagnóstico original (2026-08-08) — histórico</summary>
>
> **Bug confirmado, dois lugares independentes.** `ProfileSection.tsx` e `LogoutSection.tsx`
> (as duas telas de "Conta" dentro de `Preferences.tsx`) não têm **nenhuma** checagem de `user` —
> renderizam a UI de logado mesmo deslogado. `getDisplayName("")` retorna literalmente `"Você"`
> (por isso o "? Você" exato que você viu), e o botão "Sair" não tem guard nenhum no JSX. **O mesmo
> buraco existe de forma independente na outra implementação de Preferências**
> (`TabsHeaderWithPreferences.tsx:1948`) — confirma na prática o `aggregation.md §6.12` (2 telas
> paralelas que divergem). Registrado como `D12` em [`BACKLOG.md`](BACKLOG.md), P0.
>
> **5.6 — bug por decisão sua, mas é capacidade que nunca existiu, não botão quebrado.** Confirmado
> por grep exaustivo: a foto vem só do OAuth (Google), sem nenhum controle no app pra trocar ou
> remover. Não dá pra "deletar" a foto do lado do Saravafy — a correção seria uma preferência tipo
> "usar iniciais em vez da foto". Registrado como `D13` em [`BACKLOG.md`](BACKLOG.md), com essa
> nota de escopo pra não virar "restaurar botão que sumiu".

---

## 6. Regressão geral

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 6.1 | Login com Google | Entra sem loop | ✅ OK |
| 6.2 | Percurso: login → Home → buscar → player → coleção de terreiro → voltar | Sem crash, sem warning de hook order no console | ✅ OK |
| 6.3 | Trocar de aba (Pontos ↔ Terreiros) por swipe | Sem frame estranho na transição | ✅ OK |
| 6.4 | Abrir e fechar Preferências pelo header | Sem flash de conteúdo errado | ✅ OK hoje — ver nota importante |

**Atenção 6.3 e 6.4:** são os *flickers* que você relatou. Nenhuma spec atacou isso ainda —
suspeitos mapeados: 4 contexts de gesture/pager fragmentados (`code-quality-audit.md` §3.1) e as
duas implementações paralelas da tela de Preferências (`aggregation.md` §6.12). Descrever com o
máximo de detalhe possível o que aparece no frame errado; é o que vai direcionar a spec.

> **6.4 — não pisca hoje, mas por causa de uma camada de mascaramento, não porque foi corrigido na
> raiz.** Confirmado no código: `src/utils/navCover.ts` é um overlay global que cobre a tela antes
> de navegar e só libera quando o destino avisa que está pronto — construído especificamente pra
> esconder esse handoff, com até ferramenta de debug dedicada (`__saravafyDebugGhostAmplifyUntil`
> etc). Ou seja, o flicker é real e documentado no próprio código-fonte, só que hoje está tapado.
> **Decisão sua: esse refactor deve resolver a causa raiz**, não só confirmar que a máscara
> continua funcionando. Critério de pronto: dar pra deletar `navCover.ts` inteiro e a transição
> continuar sem piscar. Detalhes em `S-4a` no [`BACKLOG.md`](BACKLOG.md).

---

## Fora de escopo

Coisas que você notar e que **não** vêm das specs acima. Anotar aqui em vez de tentar consertar:

| O quê | Onde | Observado |
|---|---|---|
| | | |

### Offline / conexão — entrada pra spec `S-5`

**Deprioritizado (2026-08-09): testar só depois do refactor completo.** Confirmado que dev client
não abre com o avião já ligado (limitação de ferramenta, item 4.4) — testar cold-cache+offline de
verdade exige build de produção/standalone. Em vez de testar aos poucos e mal com o dev client, fica
pra uma rodada dedicada com build de prod, depois do refactor. Seção mantida pra quando chegar lá —
não preencher agora.

Seção separada de propósito: isso **não** é caça a bug, é levantamento. O trabalho de auto-sync
offline está no working tree sem spec, e vai virar spec a partir do que você observar aqui.
Anotar tudo — inclusive o que funcionar bem, que também define o comportamento esperado.

| # | Verificar | Observado |
|---|---|---|
| O.1 | Ligar modo avião com o app aberto — banner offline aparece? Quanto tempo depois? | |
| O.2 | Voltar a ficar online — banner some sozinho? Sincroniza sozinho? | |
| O.3 | Mandar o app pra background offline → voltar online → reabrir | |
| O.4 | Abrir uma coleção de terreiro baixado, offline | |
| O.5 | Tocar áudio de ponto baixado, offline | |
| O.6 | Banner offline aparece em cima de algo? Empurra layout? Pisca? | |
| O.7 | Qualquer coisa que pareça "sincronizando" sem você ter pedido | |

---

## Defeitos já conhecidos — não reportar como novos

Confirmados no código, ainda sem correção. Se aparecerem, é esperado:

| # | Sintoma | Origem |
|---|---|---|
| §6.11 | Enviar ponto novo **com áudio** → ponto salva, áudio some, toast "ID do ponto indisponível" | `PontoUpsertModal.tsx:591` lê `approved_ponto_id` antes do curador aprovar |
| §6.7 | "Reenviar convite" toasta sucesso e não reenvia nada | `terreiroMembership.ts:1224` é stub |
| §6.6 | Tag de médium fica na tela mesmo com erro de rede (~60s) | Update otimista sem rollback |
| §6.8 | Editar ponto e não ver a mudança em outra tela | UPDATE direto sem invalidar cache |
| §6.10 | Trocar de usuário no mesmo device pode mostrar dado de membership do anterior | Eviction de logout não pega chave sem `userId` |

Todos entram na próxima leva de specs — ver [`BACKLOG.md`](BACKLOG.md).
