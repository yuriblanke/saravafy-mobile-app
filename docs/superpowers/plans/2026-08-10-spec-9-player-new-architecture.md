# Spec 9 — Player e New Architecture: Investigation Plan

**Spec:** [`2026-08-10-spec-9-player-new-architecture.md`](../specs/2026-08-10-spec-9-player-new-architecture.md)
**Status:** **Tasks 1-4 executadas 2026-08-28.** Task 5 (reconciliar) pendente, é do main thread.

**Este plano não produz código.** O entregável é um levantamento com fonte por afirmação e uma
recomendação. Nenhuma task abaixo edita `src/`. *(Respeitado: nenhum arquivo de `src/` foi tocado.)*

Ambiente: `C:\saravafy\saravafy-mobile-app`, Windows.

> **Ordem:** por decisão do usuário (2026-08-08), o player é o **último** item. Este levantamento
> pode ser feito antes — é barato e não mexe em nada — mas a execução do que ele recomendar espera
> o P0/P1/P2 acabar.

> **Resultado em uma linha:** a premissa se sustenta para a versão fixada (4.1.2 nunca vai suportar
> New Architecture, agora por congelamento oficial), mas **cai** na parte que importa: o suporte
> existe desde 2026-05-06 e o app já qualifica para ele. E o achado maior não estava previsto: um
> **segundo braço da incompatibilidade continua vivo e não patcheado** no app hoje.

---

## Task 1: Começar pela pista concreta

A pergunta 2 da spec é o melhor fio: **as duas correções anteriores de controle de notificação são
sintoma desta incompatibilidade ou de outra coisa?**

1. `git show c60729d` e `git show 148f726` — ler o diff inteiro, não a mensagem.
2. Para cada uma: qual era o sintoma, o que a correção fez, e ela tratou causa ou contornou?
3. Anotar se alguma toca registro de módulo nativo, sessão de mídia ou ciclo de vida em background —
   as três áreas onde "não suportado na New Architecture" costuma se manifestar.

- [x] Task 1 concluída. Commit: `docs: analisar as correcoes anteriores de controle de notificacao`

**Resultado (spec §2.3):** a pergunta estava mal-posta em dois pontos, e ambos importam.

- **Não foram duas correções, foram 12 commits em 5h18min**, e o desfecho não foi um remendo: foi
  `2a19137 remove notification player and remote controls from track player`, que apagou 583 linhas
  (`playbackService.ts`, `notificationTheme.ts`, `debugLog.ts`, 283 linhas de `trackPlayer.ts`).
- **As duas correções nomeadas não são New Architecture.** `c60729d` corrigiu um bug próprio do
  RNTP 4.1.2 (`this["CAPABILITY_SKIP"] = OnErrorAction.SKIP.ordinal` → `Capability.SKIP.ordinal`),
  presente também na arquitetura antiga: causa raiz, de outra causa. `148f726` foi nullability de
  Kotlin (`originalItem: Bundle?`), necessária para o patch **compilar**.
- **Mas a maratona inteira é New Architecture**, e nenhum dos 12 commits chegou lá. `f04373e` e
  `5af9a98` atacaram ordem de registro do headless service; `cca6f08`, `301ef74` e `d2fc333`
  instrumentaram eventos `Remote*` do lado JS que **nunca poderiam chegar**.
- **As três áreas do item 3 foram tocadas por essa história:** registro de módulo nativo (o patch
  existente), sessão de mídia (removida), background (nunca registrado). Detalhe na §3.3 da spec.

---

## Task 2: Determinar se existe instrumentação

1. Procurar crash analytics: `grep -rn "Sentry\|Crashlytics\|bugsnag" package.json src/ app/`.
2. Se **não houver**, registrar isso como resultado: o levantamento fica **explicitamente
   inconclusivo quanto a crash**, e dizer isso vale mais que fabricar confiança.
3. Levantar o que existir de log do dev client e os relatos datados do usuário.

- [x] Task 2 concluída. Commit: `docs: registrar o estado da instrumentacao de crash`

**Resultado (spec §2.6):** **não existe instrumentação de crash.** O grep (estendido a
`app.config.ts` e `eas.json`) devolve zero. O levantamento fica **explicitamente inconclusivo quanto
a crash**, conforme a proposta da spec.

Existe **um** log de dev client: `src/screens/CuratorReviewQueue/diagnostics`, 45 KB, `adb logcat`
de 2026-01-20 cobrindo 2min17s. Prova três coisas: New Architecture ativa em runtime
(`"fabric":true`), a correção de enum de `c60729d` funcionando (`capabilities validation: ok`), e
**zero** erros/exceções/crashes. Não cobre um toque nos botões da notificação, então **não** serve
para confirmar nem desmentir o mecanismo da §2.5.

---

## Task 3: Delimitar a incompatibilidade

Não tratar "não suportado" como bloco monolítico.

1. Ler a documentação e as issues do `react-native-track-player` sobre New Architecture — **anotar
   versão e data de cada afirmação**, porque este é o tipo de fato que muda sozinho.
2. Separar: registro do módulo nativo, sessão de mídia, controles da notificação, background.
3. Para cada área, dizer se o app usa e se há sintoma relatado.

- [x] Task 3 concluída. Commit: `docs: delimitar quais areas do RNTP a incompatibilidade atinge`

**Resultado (spec §2.2, §2.4, §3.3).** O item 1 se provou o aviso mais útil do plano: o fato **mudou
sozinho** entre a escrita da spec (2026-08-10) e a execução.

Delimitação por área, das quatro áreas o app depende de duas:

| Área | Status v4.1.2 sob New Arch | App usa? |
|---|---|---|
| Registro do módulo nativo | Quebrado (`ParsingException`, retorno `Job` ≠ `void`). **Corrigido pelo patch do repo**, 36 métodos | **Sim, tudo** |
| Emissão de evento nativo → JS | Quebrado e **silencioso**. `MusicService.emit()` usa cadeia legada. **NÃO patcheado.** Upstream #2593 | **Sim** |
| Sessão de mídia / notificação | Renderiza, mas o toque não chega ao JS (mesma causa) | Não — removido em `2a19137` |
| Background / foreground service | `ReactHost` nulo (#2619, crash); iOS morre em ~50-60s (#2615, mesma RN deste app) | Não |

**Achado que muda o custo de tudo (§2.4):** a superfície de RNTP usada é de **11 chamadas e 1
listener**, em 2 arquivos. Grep com **zero** ocorrências para `updateOptions`, `Capability`,
`compactCapabilities`, `notificationCapabilities`, `registerPlaybackService` e
`AppKilledPlaybackBehavior`. Sem notificação, sem background, sem fila.

---

## Task 4: Custear as quatro saídas e recomendar

1. Preencher A–D da §4 da spec com custo e risco.
2. Para B (troca de motor), verificar se o substituto cobre background, controles de notificação e
   fila — as três coisas que o app usa hoje.
3. Para C, **confirmar** que Reanimated 4 exige New Architecture. Não presumir: é o que sustenta
   descartar a saída.
4. Aplicar o critério que a §4 fixou **antes** de olhar o resultado, e escrever a recomendação.

- [x] Task 4 concluída. Commit: `docs: custear as saidas do N1 e recomendar`

**Resultado (spec §4).**

- **Item 2, correção ao próprio plano:** "background, controles de notificação e fila — as três
  coisas que o app usa hoje" está **errado**. O app não usa **nenhuma** das três (§2.4); foram
  removidas em `2a19137`, 7 meses antes desta spec ser escrita. `expo-audio` cobre as três de
  qualquer forma (config plugin `enableBackgroundPlayback`, `setActiveForLockScreen`,
  `AudioPlaylist`), então B fica barata por dois motivos independentes.
- **Item 3, confirmado e não presumido:** `node_modules/react-native-reanimated/README.md:27,29`
  (4.1.6 instalada) diz que "4.x supports only the New React Native architecture". E há uma segunda
  trava que a spec não previa: **RN 0.82 removeu a própria chave `newArchEnabled=false`.** SDK 54 →
  RN 0.81 é a **última** em que C é possível. **C descartada, com data de morte.**
- **Uma quinta saída apareceu, e é a recomendada agora:** `A'` = estender o patch existente para
  consertar `emit()`/`emitList()`. ~6 linhas, sem dependência nova, sem tocar `src/`.
  `HeadlessJsTaskService` já expõe `reactHost.currentReactContext` e `ReactContext` já tem
  `emitDeviceEvent`.
- **Item 4, o critério aplicado honestamente:** **as duas pernas da condição "recomendar A"
  falham.** Há dano atribuível (não crash: perda silenciosa de evento), e o custo de B é **baixo**,
  não alto. Registrado na spec §4.4 que o critério binarizou em "crash" e que o dano real tem outra
  forma — limitação do critério, anotada em vez de contornada.

**Recomendação: `A'` agora; `B` (`expo-audio`) como motor quando o player chegar a sua vez; `C`
descartada; `D` inalterada como destino.**

**Premissa testada:** sustenta-se para 4.1.2 (sem `codegenConfig`; v4 **congelada** em 2026-05-06,
"no further updates") e **cai** quanto à existência de saída: `@rntp/player@5.9.2` (2026-08-26) é
TurboModule real e exige exatamente o que o app já tem. Custo escondido: renomeado e **comercial**
(€99/mês ou €999/ano por app), o que é por que a recomendação de motor é `expo-audio` e não a v5.

---

## Task 5: Reconciliar

1. Atualizar `N1` no [`BACKLOG.md`](../BACKLOG.md) com o descoberto, marcando cada afirmação como
   **verificada** ou **inferida**.
2. Corrigir a spec onde o levantamento divergiu do que ela supunha.
3. Se a recomendação exigir reprodução dirigida no aparelho, criar a seção na fila — **nunca** como
   passo bloqueante deste plano ([`CONVENTIONS.md`](../CONVENTIONS.md) §4).

- [ ] Task 5 concluída. Commit: `docs: reconciliar o Spec 9`

> **Insumos prontos para a Task 5 (o agente das Tasks 1-4 não a executou, por instrução):**
>
> - **Item 1 — `BACKLOG.md` `N1` (linha 88) precisa de quatro correções.** (a) "não suportado" é
>   verdade e agora **permanente** para 4.1.2, mas existe suporte em `@rntp/player` v5 — a linha,
>   como está, sugere um beco sem saída que não existe. (b) "(required by Reanimated 4)" está certo
>   quanto ao efeito e **errado quanto à procedência**: a flag entrou em `e556faa` (2025-12-27, prep
>   de EAS), quase um mês **antes** de o RNTP existir no projeto (`8fcb295`, 2026-01-20). (c) "RNTP
>   is the app's sole audio playback engine" continua verdade, mas a superfície usada é de 11
>   chamadas — o que muda o custo de trocar. (d) O bloco de DECISÃO (linhas 97-110) diz "patched
>   around at least twice (`c60729d`, `148f726`)": foram **12 commits terminando em remoção**
>   (`2a19137`), e as duas correções nomeadas **não** são New Architecture.
> - **Item 2 — já feito.** A spec foi corrigida in loco, com as correções **marcadas e não
>   apagadas** ([`CONVENTIONS.md`](../CONVENTIONS.md) §6).
> - **Item 3 — sim, a recomendação pede reprodução dirigida, e ela é barata.** Texto pronto na §6 da
>   spec: (1) a barra de progresso anda mas o botão play/pause fica travado? (2) URL expirada não
>   mostra erro e não renova? Qualquer um dos dois converte a §2.5 de INFERIDA para VERIFICADA.
>   **Vai para a fila, não bloqueia nada.**
> - **Sugestão extra, fora do escopo, não executada:** `src/screens/CuratorReviewQueue/diagnostics`
>   é um dump de `adb logcat` de 45 KB commitado dentro de `src/`, sem extensão. Não é código.
