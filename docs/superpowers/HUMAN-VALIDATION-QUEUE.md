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

### Os dois APKs — instale um por vez, eles não se substituem

| Perfil | Build | Para que serve |
|---|---|---|
| **development** | [`b85d0a95`](https://expo.dev/accounts/yuriblanke/projects/saravafy/builds/b85d0a95-7536-47d1-8667-cf26e63bebc1) (commit `6604988`) — [APK direto](https://expo.dev/artifacts/eas/n0-IJmtHnfdcOJY2Yted68EMZoamBDnVOzgl1CPzqaA.apk) | Seções **0 a 8**. É dev client: instale e rode `npm run start:dev` para conectar no Metro |
| **production** | [`d796d95e`](https://expo.dev/accounts/yuriblanke/projects/saravafy/builds/d796d95e-86f3-4ca1-9619-d3af31f312e6) (commit `6604988`, version code 28) — [APK direto](https://expo.dev/artifacts/eas/5ERUXjgtlEs5tJOjl2uAdQR1xe6XE-xPYKLNSqiz0aE.apk) | Item **4.4** e a seção **Offline** (`O.1`–`O.6`). Standalone, sem Metro — é o único que abre com o avião já ligado |

> Ambos os builds são do commit `6604988` (HEAD), ou seja, **já contêm** as correções desta rodada:
> pull-to-refresh nas 6 telas, mensagem de erro do Home em produção (4.4), tap-through do
> `BottomSheet` com teclado aberto, e o gate de permissão da Coleção. Os builds anteriores
> (`4c675867` dev / `25cd2eae` prod) estão obsoletos — **não use.**

Build está limpo — **Specs 1, 2a, 2b, 3, 4 e 5** estão Agent-DoD-completas. Pode rodar o app.

**Spec 6 (teclado) está em andamento por outro caminho.** O build nativo local não passa nesta
máquina — `ninja.exe` não é long-path-aware, então o limite de 260 caracteres do Windows corta os
caminhos do codegen **independente** de `LongPathsEnabled`. Não é incompatibilidade da lib.
**Decisão (2026-08-09): verificar via build EAS**, que roda em Linux e não tem esse limite.
Detalhes: `plans/2026-08-09-spec-6-keyboard-avoidance.md`, Task 2 Step 3.

🚨 **Rode a fila inteira pelo APK novo do EAS — inclusive as Specs 3-5. Isto foi CONFIRMADO na
prática em 2026-08-09, não é precaução.** Rodar `npm run start:dev` contra o dev client antigo
derruba o app inteiro:

```
ERROR [Error: The package 'react-native-keyboard-controller' doesn't seem to be linked.]
  <global> (src/components/BottomSheet.tsx)
  <global> (src/screens/Home/Home.tsx)
  <global> (app/(app)/(tabs)/(pontos)/index.tsx)
WARN  Route "./(app)/(tabs)/(pontos)/index.tsx" is missing the required default export.
WARN  Route "./_layout.tsx" is missing the required default export.
ERROR [Error: usePreferences must be used within PreferencesProvider]
```

**Por que derruba tudo, e não só a tela do teclado:** o import é **estático, no topo do
`BottomSheet.tsx`**. Ele lança no carregamento do módulo, antes de qualquer render — então `Home.tsx`
não carrega, a rota fica sem `default export`, e o `_layout` cai junto, o que produz aquele
`usePreferences must be used within PreferencesProvider` no fim (efeito, não causa).

**Consequência prática:** um try/catch em volta do `KeyboardProvider` — como o que
`app/_layout.tsx:72-89` já faz com o `react-native-gesture-handler`, precisamente porque dev client
antigo quebrava no bootstrap — **não resolveria**. Teria que envolver o import do `BottomSheet`, o
que esconderia falha real de link. O estado correto é ter o binário certo instalado.

**Isso não é bug do código e não é item de validação.** É o dev client desatualizado. Desinstale o
antigo, instale o APK abaixo, e só então rode `npm run start:dev` — o APK do EAS é dev client, ele
conecta no Metro normalmente.

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

**Esta seção vem primeiro de propósito.** O `KeyboardProvider` está montado na raiz
(`app/_layout.tsx`, `d1efb58`) **e uma tela optou por ele**: o sheet de tag de médium
(`a406520`). Todas as outras seguem no comportamento antigo.

O item 0.1 separa as duas coisas de propósito. Nas telas que **não** optaram, o provider tem que ser
*invisível* — se ele mexer em layout sozinho, toda observação de teclado feita depois fica sem dono,
e não dá pra saber se o que você viu veio da tela piloto ou do provider. Por isso é o item 0, e por
isso ele **bloqueia** o resto da rodada de Spec 6.

> ⚠️ **Precisa de APK novo do EAS — o dev client atual não serve.** A Spec 6 adiciona módulo
> nativo, então a mudança não chega por reload de JS. O build local (`npm run android:dev`) **não
> funciona nesta máquina**: `ninja.exe` não declara `longPathAware`, então o limite de 260 caracteres
> do Windows corta os caminhos do codegen mesmo com `LongPathsEnabled=1`. Por isso a verificação
> nativa foi feita no EAS, que roda em Linux.
>
> **APK a instalar** — build `b85d0a95`, commit `6604988`, perfil `development`, SDK 54, New
> Architecture, status `finished`:
> https://expo.dev/accounts/yuriblanke/projects/saravafy/builds/b85d0a95-7536-47d1-8667-cf26e63bebc1
>
> Esse build contém o piloto inteiro (provider + prop opt-in + adoção na tela) **mais** o fix de
> tap-through do `BottomSheet` (item 0.8). Builds anteriores (`3f9666b9`, `4c675867`) estão
> obsoletos — **não use.**

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 0.1 | Abrir o app no APK novo e percorrer **telas que NÃO optaram** — Home, sheet de convite, editor de terreiro, qualquer sheet com campo de texto **que não seja o de tag de médium** — sem digitar nada, só olhar | Tudo exatamente igual a antes: mesmos insets, mesma altura de sheet, mesma barra de status. Nenhum deslocamento, nenhuma faixa nova | | ✅ OK |
| 0.2 | O app **abre sem crashar** | O build prova que o módulo nativo linka, **não** que ele registra em runtime sob New Architecture. Se crashar no boot, é aqui que aparece | | ✅ OK |
| 0.3 | Coleção → adicionar tag de médium → focar o campo de texto | O campo sobe **acima** do teclado sozinho, sem você rolar na mão | | ✅ OK |
| 0.4 | Mesmo sheet, com **teclado de terceiro** (Gboard/SwiftKey) e/ou abrindo a linha de emoji | Continua funcionando. **Variação de altura é o ponto inteiro do piloto** — o filler de 290px falhava exatamente aqui | | ✅ OK |
| 0.5 | Fechar o teclado no sheet de tag de médium | **Nenhum espaço vazio sobrando** onde o filler ficava. Era esse buraco que sobrava quando o teclado era mais baixo que 290px | | ✅ OK |
| 0.6 | No mesmo sheet: arrastar pra fechar, tocar no backdrop, e enviar o formulário | Os três continuam funcionando. Se o arrastar-pra-fechar parou, o gesto de pan do `BottomSheet` está brigando com o scroll view novo — **isso é o achado mais valioso que este piloto pode gerar** | | ✅ OK |
| 0.7 | Abrir **outro** sheet que ainda usa o filler (ex.: o de convite) e focar um campo | Comportamento **antigo**, pra você sentir a diferença lado a lado. Se este também mudou, o piloto vazou pras outras **11** telas e isso é bug | | ✅ OK |
| 0.8 | **(novo)** Num sheet com campo de texto, focar o campo (teclado aberto) e tocar direto no botão de ação principal — ex.: "Salvar" no sheet de tag de médium | Um único toque **fecha o teclado e executa a ação** (salva + toast de sucesso) — não precisa mais de dois toques. Tocar em espaço vazio do sheet continua só fechando o teclado, sem acionar nada | | ✅ OK |
> ### 🚨 **0.1 — o sheet de tag de médium está FORA deste item, e de propósito.**
>
> **Ele vai estar ~290px mais curto que você lembra, com o teclado fechado. Isso é a correção
> funcionando, não o provider quebrando.** Era exatamente esse o tamanho da imagem `filler.png` que
> foi deletada dessa tela. Se o item 0.1 incluísse essa tela, ele falharia sozinho no piloto e
> travaria a rodada inteira numa mudança intencional. O encurtamento é o que o item **0.5** mede.
>
> **Nas telas que não optaram: se algo se mexeu, pare e reporte antes de testar qualquer coisa de
> teclado.** Um provider que altera layout por conta própria torna toda observação visual seguinte
> não-atribuível. Não tente compensar o deslocamento na tela — pela §4.1 da spec isso é achado, não
> ajuste.
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
> **E anote separadamente se o arrastar-pra-fechar muda depois de você ter rolado o conteúdo**, não
> só se ele funciona. O gesto é liberado por um `onScroll` que alimenta o offset do `BottomSheet`, e
> esse handler agora é repassado para dentro do scroll view da lib, que também observa o mesmo ref
> via Reanimated — combinação conhecida por ser frágil. Nesta tela piloto isso **não pode aparecer**
> (ela tem scroll desabilitado, o offset nunca sai de 0), mas é o que a spec de rollout precisa saber
> para os sheets que rolam de verdade.
>
> **0.7 protege as outras 11 telas.** Se quiser um controle bem limpo, `ReviewSubmission.tsx` (fila
> de revisão do curador) é a única tela com filler que **não** fica dentro de um `BottomSheet` — ou
> seja, não passa por nada que esta spec tocou.
>
> **0.7 protege as outras 11 telas.** O `keyboardAware` tem default `false` e existe teste de
> render provando que o caminho default não mudou, mas teste de render não é aparelho.
>
> **0.8 — bug relatado por você, causa raiz confirmada e corrigida em `BottomSheet.tsx`.** O
> `ScrollView` do sheet usava o default do React Native (`keyboardShouldPersistTaps="never"`): com o
> teclado aberto, o primeiro toque em qualquer lugar — inclusive num botão — era consumido só pra
> fechar o teclado, e o botão só disparava no segundo toque. Trocado para `"handled"`, o mesmo valor
> que os outros **15** lugares do app já usam nos próprios `ScrollView`; agora um toque num filho que
> trata o evento (o botão) passa e dispara, fechando o teclado na mesma tela. Toque em espaço vazio
> continua só fechando. **Teste de propósito num sheet que NÃO optou por `keyboardAware`** (ex.:
> sheet de convite, não o de tag de médium) — é o caminho que cobre os outros 15 pontos de chamada,
> e é onde o defeito original foi sentido.
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
| 3.3 | Como membro comum ou não-membro | Sem afordância de edição | 🔧 corrigido (`D8`, `8fd05c3`) — mesmo vazamento do 2.6, um fix resolveu os dois. Reteste junto com 5.9 |
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
| 4.4 | Modo avião + cache frio | Card de erro "Não foi possível carregar" + mensagem legível | 🔓 **destravado pelo APK de produção** — o dev client não abre com o avião já ligado. Agora dá pra testar de verdade |
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
| 6.2 | Percurso: login → Home → buscar → player → coleção de terreiro → voltar | Sem crash, sem warning de hook order no console | ⚠️ Sem crash, mas **achou bug novo**: depois de vários "voltar", chegando em terreiro, o **toque** na aba pontos/terreiro para de funcionar — o **swipe** entre as mesmas abas continua funcionando. Registrado como `D15` no [`BACKLOG.md`](BACKLOG.md). Se reproduzir de novo, anote quantos "voltar" e se veio do player ou da coleção |
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

## 7. Pull-to-refresh (novo)

Origem: primeira implementação do gesto no app — nenhuma tela tinha `RefreshControl` antes disso.
Seis telas ganharam o gesto, nesta ordem: Terreiros, Home, TerreiroMembers, ReviewQueue,
TerreiroBiblioteca, Collection. Fora dessas seis, nenhuma outra tela foi tocada — sheets, Player,
telas de reordenação e formulários continuam sem o gesto de propósito (ver notas do código).

`refreshing` vem sempre de estado local (`isRefreshing`), nunca de `isFetching`/`isRefetching` do
React Query — motivo: `TerreirosRealtimeSync` invalida `terreiros.withRole` sozinho em eventos de
Postgres, então qualquer uma dessas duas flags acenderia o spinner sem ninguém ter puxado nada.

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 7.1 | Terreiros: puxar a lista pra baixo com dados já na tela | Spinner aparece, some ao terminar, lista não pisca nem desmonta | |
| 7.2 | Terreiros: puxar e soltar rápido, repetidamente | Sem spinner preso, sem crash | |
| 7.3 | Home: puxar a lista principal de pontos pra baixo | Spinner aparece, lista atualiza (mesma fonte do carregamento inicial), sem pular pra tela de busca | |
| 7.4 | TerreiroMembers: puxar com membros/convites/pedidos pendentes na tela | As três seções atualizam juntas; spinner some mesmo se alguma das três falhar | |
| 7.5 | TerreiroMembers: conferir que o spinner não fica escondido atrás do header fixo | Spinner aparece abaixo do header, não por trás dele | |
| 7.6 | ReviewQueue (como curador): puxar a fila de revisão | Spinner aparece, lista de envios pendentes atualiza | |
| 7.7 | TerreiroBiblioteca: puxar a lista de coleções | Coleções, nome do terreiro e contagem de membros atualizam juntos; spinner some abaixo do header absoluto (`progressViewOffset`), não atrás dele | |
| 7.8 | Collection: puxar a lista de pontos da coleção | Pontos e metadados da coleção (título/descrição) atualizam; spinner some abaixo do header absoluto, não atrás dele | |
| 7.9 | **Puxar com o app em modo avião**, em qualquer uma das seis telas | O spinner aparece e **sempre** some sozinho (nunca fica girando pra sempre) mesmo o refetch falhando; o único aviso de "sem conexão" vem do banner global, não de um travamento na tela | |
| 7.10 | **Eixo do gesto** — Home e Terreiros ficam dentro do swipe horizontal de abas (`material-top-tabs`). Testar nas duas: puxar pra baixo continua atualizando a lista, e arrastar pro lado continua trocando de aba, sem um gesto "roubar" o outro | Desambiguação por eixo funciona nos dois sentidos, sem gesto ambíguo nem troca de aba acidental durante o pull | |

> **7.9 é o item mais importante desta seção.** A regra decidida foi **não bloquear o gesto
> offline** — deixar o `refetch`/reload falhar e confiar no banner global de conectividade
> (`OfflineBanner`) pra avisar o usuário, em vez de checar `useNetwork().isConnected` antes de
> permitir o pull (esse campo faz default `true` antes do primeiro relatório do `NetInfo`, o que o
> tornaria não confiável bem no boot). A segurança inteira desse comportamento depende do `finally
> { setIsRefreshing(false) }` em cada handler — se aparecer um spinner preso em modo avião em
> qualquer uma das seis telas, é bug, e é aqui que ele vai aparecer.
>
> **7.10 não é um risco novo — a investigação de escopo já descartou o suspeito óbvio.**
> `AppTabSwipeOverlay`, o único dos quatro contexts de gesto que criava um `PanResponder` de tela
> cheia (e que competiria de verdade com um `RefreshControl`), **não está montado** em lugar nenhum
> do app (`docs/architecture/foundation.md:243`). O vizinho de gesto real é só o swipe nativo do
> `material-top-tabs`, que desambigua por eixo — mas isso nunca foi confirmado num aparelho, daí o
> item 7.10 aqui.
>
> **Isto desbloqueia os itens 4.2 e 4.3 desta mesma fila** (seção 4, Terreiros). Antes, confirmar o
> comportamento anti-*flicker* do `<QueryBoundary>` exigia esperar >30s de `staleTime`, ligar modo
> avião e sair/voltar da aba pra forçar um refetch em segundo plano. Com 7.1 confirmado, a recipe
> vira simplesmente "puxar a lista de Terreiros pra baixo com dados na tela e observar se pisca" —
> mais direto que a recipe de 5 passos que 4.3 ainda descreve.

---

## 8. Vazamento de permissão na Coleção (novo)

Origem: teste manual — a tela `Collection` calculava `canEditCollection` corretamente e **nunca
aplicava o valor** aos três botões da linha de ações ("Adicionar", "Editar", "Nome e detalhes").
Todo mundo via os três, inclusive deslogado. Além disso, a tela de destino do "Adicionar"
(`AddToCollection`) só checava se o usuário estava logado — nunca papel/vínculo no terreiro —,
então um logado não-membro chegava na mutation de adicionar mesmo sem o botão.

Regra aplicada (a mesma nos dois arquivos): **dono da coleção pessoal**, ou **membro ativo do
terreiro com papel admin/curimba**. Ninguém mais.

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 8.1 | **Deslogado**, abrir uma coleção de terreiro (pública) | Nenhum dos três botões aparece — nem "Adicionar", nem "Editar", nem "Nome e detalhes". A lista de pontos continua visível e tocável normalmente | |
| 8.2 | **Logado como membro comum** (nem admin nem curimba), abrir coleção desse terreiro | Mesma coisa: os três botões somem. Ver a coleção e tocar os pontos continua funcionando | |
| 8.3 | **Logado como admin ou curimba** do terreiro, abrir a mesma coleção | Os três botões voltam a aparecer **e funcionam**: "Adicionar" abre a busca e adiciona de verdade, "Editar" abre a reordenação, "Nome e detalhes" abre o sheet e salva | |
| 8.4 | **Coleção pessoal, logado como dono** | Tudo continua editável — os três botões aparecem e funcionam como sempre. **Este é o caso com mais risco de quebrar com esta mudança**; se algo aqui sumir, é regressão, reportar | |
| 8.5 | Coleção **vazia** de terreiro, aberta por não-membro ou deslogado | O card "Esta coleção ainda não tem pontos" continua aparecendo, mas **sem** o botão "Buscar pontos" e sem a dica "você pode adicionar direto pela busca" | |
| 8.6 | Coleção **vazia**, aberta por quem pode editar (dono / admin / curimba) | O botão "Buscar pontos" e a dica continuam lá e levam pra tela de adicionar | |
| 8.7 | **Fundo do poço do "Adicionar"** — como admin/curimba, abrir a tela de adicionar, e (se der) sair do terreiro / perder o papel com a tela ainda aberta, depois tocar "+" num ponto | Toast "Você não tem permissão para editar esta coleção." e **nada é gravado**. É o caso raro; se for difícil de montar, pular e anotar | |
| 8.8 | Como admin/curimba, adicionar um ponto com **mais de uma versão** e um ponto com `[entidade]` na letra | Os dois fluxos (sheet de versão e sheet de entidade) continuam adicionando normalmente — a checagem nova não pode ter travado eles | |

> **8.3 e 8.4 são o teste de verdade.** Esconder botão é fácil; o risco desta mudança é esconder
> demais. Se admin/curimba ou dono de coleção pessoal perder qualquer afordância, é regressão.
>
> **Sobre 8.1/8.2 — o servidor já barrava a gravação.** As policies de RLS de `collections_pontos`
> exigem dono ou membro ativo com papel admin/curimba/editor, então nunca houve gravação indevida
> de fato. O que vazava era a **afordância**: botão visível pra quem não podia usar, e no caso do
> "Adicionar", o caminho até a mutation. A correção fecha os dois no cliente; o backstop do
> servidor continua sendo o servidor.

---

## 9. Rollout do teclado — as 11 telas restantes (novo)

Origem: `D14`, rollout liberado pela seção 0. **Precisa de build novo** — as 11 telas não estão no
APK `d796d95e`/`b85d0a95`, só o piloto está.

O `filler.png` não existe mais em lugar nenhum do app. Então **toda tela abaixo vai estar ~290px
mais curta com o teclado fechado** — igual ao que aconteceu no piloto e que o item `0.5` mediu. Isso
é a correção, não regressão. O que você procura é o oposto: campo que **não** sobe, ou espaço morto
que **sobrou**.

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 9.1 | Cada tela: focar o campo mais **baixo** do formulário. Sheet de remover tag, convite (`InviteModal`), criar coleção no Home, criar coleção na Biblioteca, sheet de curador, `AccessManager` (**dois** sheets: convite e seleção de papel), `TerreiroMembers` (**dois**: menu de membro e convite) | Campo sobe acima do teclado sozinho, sem rolar na mão | |
| 9.2 | Mesmas telas: fechar o teclado | Sem faixa vazia sobrando no fim do formulário | |
| 9.3 | Mesmas telas: arrastar-pra-fechar, backdrop e enviar continuam funcionando | Igual ao `0.6`. Se algum sheet parou de fechar no arrasto, o pan está brigando com o scroll novo **naquele** sheet | |
| 9.4 | 🚨 **`PontoUpsertModal` (criar/editar ponto) — o de maior risco desta seção.** Focar os campos do fim do formulário | Campo sobe. **Por que é o mais arriscado:** é a única tela onde o `KeyboardAwareScrollView` fica **dentro** de um `<Modal>` do React Native (`PontoUpsertModal.tsx:751` envolve `:946`). No Android o `Modal` é uma janela nativa separada, e o `windowSoftInputMode="adjustResize"` do `AndroidManifest.xml:19` vale pra Activity, **não** pra essa janela. Se alguma tela do rollout não avoidar, a aposta é nesta | |
| 9.5 | `TerreiroEditor`, `PlayerAudioUpload`, `ReviewSubmission` (curadoria) — focar os campos do fim | Campo sobe. Estes três também trocaram o `ScrollView` direto, mas **fora** de `Modal` (no `TerreiroEditor` o scroll e o `Modal` são irmãos, `:1629-2045` vs `:2094-2205`), então não têm o risco do 9.4 | |
| 9.6 | Em qualquer uma delas: rolar o formulário na mão, com e sem teclado aberto | Rolagem normal, sem travar e sem pular. Os 4 swaps diretos eram `ScrollView` com props simples, mas o comportamento de rolagem é do componente novo | |

---

## 10. Toque nas abas depois de vários "voltar" — `D15` (novo)

Origem: `D15`, correção layer 2 (`8c8e962`). **Precisa de build novo.** É um bug de estado
acumulado, então repetição importa mais que capricho.

**Reiniciar o app antes de testar** — uma montagem nova de `(tabs)` re-registra o handler e mascara
o bug. Se você matar e reabrir no meio, começa de novo.

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 10.1 | Aba Terreiros → abrir um terreiro → **voltar 3 vezes** | Depois do 3º voltar, você fica num terreiro. **Tocar** na aba Pontos tem que trocar de aba. Antes do fix, o toque morria aqui e só o swipe funcionava | |
| 10.2 | Sessão longa: 15–20 navegações quicando entre terreiro, coleção e player, sempre voltando, e **tocando na barra de abas a cada 3 voltas** | Toque nunca para de funcionar. É o teste que importa — o bug antigo aparecia no meio do caminho e ficava dead até reiniciar | |
| 10.3 | Comparar toque e swipe na mesma tela, várias vezes | Os dois sempre concordam. **Toque morto + swipe vivo é a assinatura exata do `D15`** — se você vir isso de novo, o layer 2 não pegou o caso e vale anotar o caminho | |
| 10.4 | (Só no APK de **desenvolvimento**, com Metro aberto) Filtrar o console em `[TabController]` durante 10.1 e 10.2 | O aviso `goToTab called without registered handler` **nunca** aparece. Ele é o defeito impresso em texto | |

### 10.5 a 10.9 — semântica de "voltar" (layer 1, `11427e4`)

O layer 1 entrou no mesmo build por decisão sua. Ele troca `router.replace` por `router.dismissTo`
em 11 lugares: "voltar" agora **desempilha até o `(tabs)` que já existe** em vez de criar outro.

**O que você está caçando aqui é diferente do resto da seção.** Não é tela quebrada — é "voltar"
levando pro lugar errado, ou voltando demais, ou voltando de menos. Se o destino mudou em relação ao
que você tem na cabeça, anote qual tela e onde foi parar.

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 10.5 | Biblioteca do terreiro: voltar pelo botão da tela **e** pelo botão físico/gesto do Android | Os dois vão pro mesmo lugar de antes — a aba de onde você veio (Pontos ou Terreiros, conforme o caso). São os dois caminhos do mesmo `returnTo`, e eram sites distintos no código | |
| 10.6 | Coleção → voltar. Player aberto da biblioteca pública → voltar. Player aberto de dentro de uma coleção → voltar | Cada um volta pro mesmo lugar de antes. O do player tem três caminhos diferentes dependendo de onde abriu | |
| 10.7 | Editor de terreiro → **excluir** o terreiro | Vai pra aba Terreiros, como antes. É o único site do editor que mudou | |
| 10.8 | Abrir Preferências (ou membros/gestão de acesso) e tocar em "Pontos"/"Terreiros" no cabeçalho | Volta pra aba certa. Este é o caminho `!isInTabs` do cabeçalho | |
| 10.9 | Login: sair do app e entrar de novo, e passar pelo fluxo de login do zero | Depois de logar, **não** dá pra voltar pra tela de login pelo botão físico. Login e callback continuam usando `replace` de propósito — se isso mudou, é regressão | |

> **Isto agora conserta a causa, não só o sintoma.** O `(tabs)` duplicado não é mais criado, então o
> app deixa de manter duas árvores de tabs montadas ao mesmo tempo (header duplicado, queries
> duplicadas, render duplicado). Isso é suspeito do flicker de transição do `S-4a` — se você notar
> transição mais limpa em algum lugar, vale anotar, é sinal. O `S-4a` em si continua aberto: o alvo
> final dele é o toque e o swipe compartilharem um caminho só, o que tornaria a assimetria do `D15`
> impossível por construção. Ver [`BACKLOG.md`](BACKLOG.md).

---

## 11. Troca de usuário no mesmo aparelho — `D1` (novo)

Origem: `D1`, corrigido em modo *nega por padrão* (`src/queries/logoutCacheEviction.ts`). **Precisa de
build novo.** O predicado de despejo era `queryKey.includes(prevUserId)`, que só alcançava chaves
carregando o id do usuário; agora só sobrevive ao logout o que estiver numa allowlist explícita de
duas entradas públicas (catálogo de entidades e diretório de terreiros).

**Precisa de duas contas** — idealmente com terreiros e papéis diferentes (uma admin de algum
terreiro, outra não).

**O que você está caçando é dado da conta A aparecendo na conta B**, não tela quebrada.

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 11.1 | Logar com A, abrir um terreiro onde A é admin, ver a **lista de membros** e a **contagem**. Sair. Logar com B (que não é membro desse terreiro) e abrir o mesmo terreiro | B **nunca** vê a lista/contagem que A carregou. Era o vazamento nomeado no `D1` — essas chaves não têm `userId` | |
| 11.2 | Com A admin de um terreiro, abrir **convites** e **pedidos de adesão**. Sair, logar com B, abrir o mesmo terreiro | B não vê nada disso, nem por um frame. Dado só de admin, chave sem `userId` — o caso mais grave | |
| 11.3 | Se alguma conta for **curadora**: abrir a fila de curadoria, sair, logar com a outra | A fila não sobrevive à troca | |
| 11.4 | A tem convite pendente por e-mail (curador ou de terreiro). Sair, logar com B | B não vê o convite de A. Essas chaves são indexadas pelo **e-mail** de quem estava logado | |
| 11.5 | Depois de sair, **antes** de logar de novo: navegar pelo app deslogado | Diretório de terreiros e pickers de entidade continuam funcionando sem tela de erro. São as duas únicas coisas que a allowlist mantém de propósito | |
| 11.6 | Logar de novo com a **mesma** conta A logo em seguida | Tudo recarrega normal. Um pouco mais de rede que antes é **esperado**, não é regressão — o cache agora é esvaziado de verdade | |
| 11.7 | Sair estando com uma tela pesada aberta (coleção grande, player tocando) | Sem crash e sem tela presa carregando para sempre. As requisições em voo são canceladas junto | |

> **Se 11.6 parecer lento a ponto de incomodar, anote** — a resposta certa não é reverter, é
> justificar mais entradas na allowlist lendo o `queryFn` de cada uma e confirmando que o dado não
> depende de quem está logado. A lista é pequena de propósito: cada entrada é uma chave que
> atravessa a troca de usuário.

---

## 12. Tags de médium — `D4` (novo, e a premissa mudou)

Origem: `D4`. **Leia isto antes de testar:** o `D4` estava descrito no backlog como *update otimista
sem rollback*. Não é — nos dois sheets a escrita é aguardada e o erro lançado **antes** do patch de
cache. Não existe janela otimista, logo não existe o que reverter.

**Por isso o item mais importante desta seção é o 12.1: preciso que você redescubra o sintoma.**
O `§6.6` da lista de defeitos conhecidos dizia "tag fica na tela mesmo com erro de rede (~60s)".
Pelo código isso não pode acontecer por esse caminho. Ou o sintoma era outro, ou a causa é outra —
o palpite é o cliente do Supabase pendurado num socket morto segurando o sheet aberto, o que é
questão de timeout, não de rollback.

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 12.1 | **Modo avião ligado**, abrir um ponto num terreiro onde você edita, adicionar um médium | A tag **não** aparece na lista, e vem um toast de erro. Se ela aparecer, anote **exatamente** o que aconteceu e quanto tempo levou — é o `§6.6` e ele precisa de causa nova | |
| 12.2 | Mesma coisa, mas **removendo** um médium offline | A tag **continua** na lista e vem toast de erro | |
| 12.3 | Cronometrar o 12.1: quanto tempo até o toast aparecer? | Anote o número. Se for ~60s com o sheet travado no spinner, essa é a causa real do `§6.6` e vira defeito novo | |
| 12.4 | Online: adicionar um médium e conferir que ele aparece na hora | Aparece imediatamente, sem piscar. O patch continua acontecendo — só ganhou uma revalidação depois | |
| 12.5 | Online: adicionar um médium, e conferir a mesma tag na **outra** tela (Coleção e Player mostram o mesmo mapa) | Aparece nas duas. O patch atinge todos os lotes em cache daquele terreiro, de propósito | |
| 12.6 | Online: remover um médium e conferir que some das duas telas | Some das duas | |
| 12.7 | Adicionar um médium **repetido** (mesmo nome, mesma grafia) | Toast dizendo que já está cadastrado, e a lista **não** ganha item duplicado | |
| 12.8 | Sem permissão (conta que não edita aquele terreiro): tentar adicionar | Toast de permissão, nada entra na lista | |

> **O que ganhou revalidação:** depois de gravar, o app agora invalida o mapa de tags além de aplicar
> o patch local. Isso existe porque o `tag_text_normalized` é calculado no cliente e pode não bater
> com o que o banco guardou. Não deve piscar — o hook mantém o dado anterior enquanto revalida. **Se
> piscar, é regressão e vale anotar.**

---

## 13. Papéis derivados pelo hook — `S-3b` (novo, 2026-08-28)

Quatro telas derivavam "qual o meu papel neste terreiro" à mão; agora todas passam pelo
`useTerreiroRole`. **Refatoração para preservar comportamento** — se qualquer coisa aqui mudar, é
regressão, não melhoria.

O que olhar em cada uma: os mesmos controles aparecem para os mesmos papéis que antes. Testar de
preferência com duas contas de papéis diferentes no mesmo terreiro.

| # | Verificar | Observado |
|---|---|---|
| 13.1 | `Gestão de acesso`: admin vê a tela e os controles de gerir membros; curimba/editor e membro comum veem o que viam antes | |
| 13.2 | `Biblioteca do terreiro`: os botões de editar/criar aparecem para os mesmos papéis de antes | |
| 13.3 | Botão de entrar no terreiro: aparece para não-membro, some para membro ativo, e o estado "pedido pendente" continua correto | |
| 13.4 | **Coleção — o mais delicado.** Editar/reordenar/apagar coleção continua liberado para dono, admin e curimba, e continua bloqueado para membro comum e não-membro | |
| 13.5 | Nenhuma tela acima passou a mostrar controle que **não** mostrava antes | |

> ⚠️ **Por que a 13.4 merece atenção extra.** Os outros três alvos foram migrados por um agente que
> registrou a evidência de preservação; o quarto (`Collection.tsx`) foi migrado quando esse agente
> foi interrompido, e foi conferido por leitura em vez de por relatório. A equivalência é
> demonstrável (`isAdminOrCurimba` expande exatamente para o predicado antigo), mas foi conferida,
> não testada num aparelho. E derivação de permissão na Coleção é precisamente onde já houve
> vazamento antes.

---

## 14. Mensagens de erro unificadas — `S-3a` (novo, 2026-08-28)

Cerca de dez cópias locais de extração de mensagem de erro foram apagadas em favor da canônica de
`src/lib/errors.ts`. Onde uma cópia divergia, a canônica venceu — então **o texto de alguns erros
pode ter mudado**. Isso foi decidido de propósito: cada cópia era uma divergência não revisada do
contrato já fixado.

| # | Verificar | Observado |
|---|---|---|
| 14.1 | Forçar erro de rede (modo avião) em telas variadas: a mensagem é legível, em português, e não é `TypeError` nem `[object Object]` | |
| 14.2 | Nenhuma mensagem virou genérica demais a ponto de não dizer o que falhou | |
| 14.3 | Nenhuma mensagem aparece vazia ou só com espaços | |

---

## Fora de escopo

Coisas que você notar e que **não** vêm das specs acima. Anotar aqui em vez de tentar consertar:

| O quê | Onde | Observado |
|---|---|---|
| | | |

### Offline / conexão — entrada pra spec `S-5`

🔓 **DESTRAVADO 2026-08-09 — pode preencher.** O motivo do adiamento era ferramenta, não escopo: o
dev client não abre com o avião já ligado, então cold-cache + offline de verdade exigia um build
standalone. **Esse build agora existe** (perfil `production`, APK — link na seção "Antes de
começar"). Use o APK de produção para esta seção e para o item 4.4; o APK de desenvolvimento serve
para todo o resto.

⚠️ **São dois APKs diferentes e eles não se substituem.** O de desenvolvimento carrega o piloto de
teclado e o Metro; o de produção é o único que testa offline honestamente. Instalar um por vez.

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
| §6.6 ⚠️ | Tag de médium fica na tela mesmo com erro de rede (~60s) | **A causa registrada estava errada** — não há update otimista nesse caminho (ver `D4` no backlog). O sintoma segue sem causa conhecida: **redescobrir na seção 12** |
| §6.8 | Editar ponto e não ver a mudança em outra tela | UPDATE direto sem invalidar cache |

~~`§6.10` — trocar de usuário no mesmo device mostrando dado de membership do anterior~~ —
**corrigido**, virou a seção 11 acima. Se aparecer, é regressão, não defeito conhecido.

Todos entram na próxima leva de specs — ver [`BACKLOG.md`](BACKLOG.md).
