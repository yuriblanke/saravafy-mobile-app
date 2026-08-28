# Spec 9 — Player e New Architecture: levantar o risco real e as saídas (`N1`)

**Data:** 2026-08-10
**Status:** **LEVANTAMENTO EXECUTADO 2026-08-28.** Continua sem implementação. Aguarda decisão do
usuário entre as saídas da §4.
**Cobre:** `N1` do [`BACKLOG.md`](../BACKLOG.md).

> **Esta spec é deliberadamente de levantamento, não de implementação.** A decisão do usuário
> (2026-08-08) é explícita: o player é **o último** item, e é escopado como **reconstrução**, não
> como patch. Escrever a spec de execução agora seria escrever contra um desenho que ainda não
> existe. O que falta hoje não é plano — é o dado que diz **se dá para esperar**.

> **Nota de execução (2026-08-28):** o levantamento foi feito sem tocar em `src/`, sem build EAS e
> sem escrita no Supabase. Toda afirmação abaixo carrega a fonte, e está marcada como
> **VERIFICADA** (saída de comando ou fonte lida) ou **INFERIDA** (mecanismo derivado, não
> observado no aparelho). As correções à versão original desta spec estão marcadas, não apagadas
> ([`CONVENTIONS.md`](../CONVENTIONS.md) §6).

---

## 1. Goal

Responder a uma pergunta, com evidência: **o app está quebrando hoje por causa disto, ou é uma
incompatibilidade documentada que ainda não se manifestou?**

Enquanto isso não estiver respondido, qualquer plano de player é chute — e o custo de errar é alto,
porque a reconstrução é grande e o usuário já descreveu o player atual como fonte de dor real antes
mesmo deste esforço começar.

### 1.1 Resposta (2026-08-28)

**As duas coisas, e a spec original não previa a segunda.**

1. A incompatibilidade **já se manifestou e já foi contornada**, antes desta spec existir. O
   `patches/react-native-track-player+4.1.2.patch` que o repo carrega desde 2026-01-20 é
   exatamente a correção de New Architecture: sem ele o módulo nativo **não registra**, e o app
   não toca áudio nenhum. Isso é dano real, passado, resolvido.
2. **Um segundo braço da mesma incompatibilidade continua aberto e não está no patch.**
   `MusicService.emit()` (25 pontos de chamada) usa uma cadeia que só existe na arquitetura legada
   e que, em bridgeless, **falha em silêncio**. Nenhum evento nativo do RNTP chega ao JS. Isso
   explica, mecanicamente, a maratona de 12 commits de 2026-01-20/21 que terminou com o usuário
   **removendo os controles de notificação inteiros** em `2a19137`.

O dano não tem a forma que a spec original procurava. **Não é crash.** É perda silenciosa de
evento, que é o modo de falha mais caro de diagnosticar e o mais fácil de confundir com "o player
é ruim".

---

## 2. O que já se sabe

### 2.1 Tabela original, com as correções de 2026-08-28

| Fato | Fonte | Verificado? |
|---|---|---|
| `react-native-track-player` **não é suportado** na New Architecture | `npx expo-doctor`, 2026-08-08 | Sim, saída da ferramenta. **CONFIRMADO 2026-08-28 na fonte, não só no metadado** — ver §2.2 |
| A New Architecture está **ligada** | `app.config.ts:76` (`newArchEnabled: true`) e `android/gradle.properties:38` | Sim, lido. **Reconfirmado 2026-08-28**, e o log do dev client prova que está ativa em runtime (`Running "main" with {"rootTag":1,"initialProps":{},"fabric":true}`) |
| Ela é ligada porque **Reanimated 4 exige** | Backlog `N1` | Sim. **Corrigido quanto à procedência:** a exigência é real (`node_modules/react-native-reanimated/README.md:27` diz literalmente que "React Native Reanimated 4.x supports only the New React Native architecture"), mas a flag **não foi ligada por causa dela**. Foi ligada em `e556faa` (2025-12-27, `chore(eas): prepare project for EAS builds`), scaffolding de EAS. O RNTP só entrou no projeto em `8fcb295` (2026-01-20), **quase um mês depois**. Ou seja: o RNTP foi adicionado a um app que **já era** New Architecture. Não há um momento em que "ligaram a New Arch e quebraram o player" |
| RNTP é o **único** motor de áudio do app | `aggregation.md` — "RNTP as single source of truth" | Sim. **Mas a superfície usada é muito menor do que "motor de áudio" sugere** — ver §2.4. Isso muda o custo da saída B por uma ordem de grandeza |
| Controles de mídia da notificação já foram remendados **duas vezes** | git: `c60729d`, `148f726` | ~~Sim~~ **SUBCONTADO. Foram 12 commits em 5h18min, e o desfecho não foi um remendo: foi remoção.** Ver §2.3 |
| O usuário descreve o player como traumático, anterior a este esforço | Decisão registrada 2026-08-08 | Sim. **E agora há um mecanismo que explica a experiência** — ver §2.5 |

**O que não se sabia, e era o buraco:** ~~se existe crash ou comportamento errado **atribuível** a
essa incompatibilidade~~ → **respondido**. Existe comportamento errado atribuível, verificado na
fonte instalada. **Não** existe evidência de crash, e não pode existir: o app **não tem nenhuma
instrumentação de crash** (§2.6).

### 2.2 A incompatibilidade, confirmada na fonte (VERIFICADA)

O `expo-doctor` continua acusando, hoje:

```
✖ Validate packages against React Native Directory package metadata
The following issues were found when validating your dependencies against React Native Directory:
  Unsupported on New Architecture: react-native-track-player
```
> `npx expo-doctor`, executado 2026-08-28. 16/18 checks passaram.

**Isso sozinho não prova nada** — é leitura de metadado do `reactnative.directory`
(`GET https://reactnative.directory/api/libraries?search=react-native-track-player` devolve
`newArchitecture: false`), não é um teste. A §5 desta spec já dizia para não tratar isso como
prova. Então foi verificado na fonte:

**(a) Registro do módulo nativo. O React Native rejeita a assinatura dos métodos do RNTP.**

`node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/internal/turbomodule/core/TurboModuleInteropUtils.kt:58-64`:

```kotlin
} else if ((annotation != null) &&
    ((annotation.isBlockingSynchronousMethod && returnType == Void.TYPE) ||
        (!annotation.isBlockingSynchronousMethod && returnType != Void.TYPE))) {
  throw ParsingException(
      moduleName,
      "TurboModule system assumes returnType == void iff the method is synchronous.")
}
```

O `MusicModule.kt` original do RNTP 4.1.2 declara **todo** `@ReactMethod` como corpo de expressão:
`fun play(callback: Promise) = scope.launch { ... }`. Isso compila para retorno
`kotlinx.coroutines.Job`, **não** `void`. Sob a camada de interop de TurboModule isso lança
`ParsingException` no registro, e o módulo inteiro morre — não um método, o módulo.

**Este braço já está corrigido no repo.** O patch converte 36 métodos de corpo de expressão para
corpo de bloco:

```diff
-    fun play(callback: Promise) = scope.launch {
+    fun play(callback: Promise) {
+        scope.launch {
         if (verifyServiceBoundOrReject(callback)) return@launch
         musicService.play()
         callback.resolve(null)
+        }
     }
```
> `patches/react-native-track-player+4.1.2.patch`

Verificação de cobertura no arquivo instalado: 39 `@ReactMethod`, **zero** ocorrências restantes de
`= scope.launch`. O patch é completo. `app.config.ts:72-75` documenta o motivo em comentário.

**(b) Emissão de eventos nativo → JS. NÃO está corrigido, e é o braço que importa hoje.**

`node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/service/MusicService.kt:743-747`:

```kotlin
@MainThread
private fun emit(event: String, data: Bundle? = null) {
    reactNativeHost.reactInstanceManager.currentReactContext
        ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        ?.emit(event, data?.let { Arguments.fromBundle(it) })
}
```

`emitList()` (linhas 750-757) tem a mesma cadeia. Repare nos `?.`: se qualquer elo for nulo, a
chamada **não lança nada, não loga nada, apenas não acontece**.

E o React Native 0.81.5 classifica essa cadeia como legado, na própria fonte
(`node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/ReactNativeHost.java:34-40`):

```java
/**
 * Simple class that holds an instance of {@link ReactInstanceManager}. ...
 *
 * @deprecated This class will be replaced by com.facebook.react.ReactHost in the New Architecture.
 */
@Deprecated
@LegacyArchitecture(logLevel = LegacyArchitectureLogLevel.ERROR)
```

**O patch do repo não toca `MusicService.kt`** (zero ocorrências do nome no arquivo de patch). Logo
esse braço está vivo no app hoje.

Confirmação independente upstream: issue **#2593 "MusicService.emit() broken in bridgeless mode
(New Architecture)"** (aberta 2026-03-02, fechada 2026-05-06) e PR **#2370 "Fix broken events in
Bridgeless mode"** (nunca liberado em release v4). A mesma busca lista ainda **#2619 "[Android]
Crash on new architecture when ReactHost is null"** e **#2615 "iOS background audio killed at
~50-60s — New Architecture + RN 0.81.5"** (exatamente a versão de RN deste app). **Todas fechadas
em 2026-05-06, que é a data do release v5** — ou seja, fechadas por "resolvido na v5", não
corrigidas na v4.

> **Marcação honesta:** que a cadeia é legada e que o patch não a cobre é **VERIFICADO** (fonte
> lida). Que ela resulta em nulo *neste app* é **INFERIDO (forte)**: o log prova `fabric: true`, e
> RN 0.81 com `newArchEnabled=true` roda bridgeless por padrão, mas nenhuma sessão de aparelho foi
> feita para observar o silêncio diretamente. O teste que fecharia isso está na §6.

### 2.3 A "correção duas vezes" era, na verdade, uma desistência (VERIFICADA)

`git log` de 2026-01-20/21, na ordem em que aconteceu:

```
8fcb295 2026-01-20 19:46 feat(audio): RNTP as single source of truth
be75ebb 2026-01-20 20:44 Fix notification controls and theming for TrackPlayer
f04373e 2026-01-20 21:19 Fix Android notification play/pause by registering TrackPlayer service in app entry
5af9a98 2026-01-20 21:25 Ensure TrackPlayer service registers before expo-router entry
c64423d 2026-01-20 21:31 Add RNTP notification debug instrumentation
c60729d 2026-01-20 22:25 fix: enable play/pause actions in notification (track player)
cca6f08 2026-01-20 22:50 fix: handle RemotePlay/RemotePause in playback service (notification controls)
301ef74 2026-01-20 23:10 fix(android): handle play/pause toggle + log remote events
5f0cb01 2026-01-20 23:19 fix: make TrackPlayer setup idempotent (single init)
d2fc333 2026-01-20 23:43 debug: add notif next/prev buttons and log remote events
2a19137 2026-01-21 01:04 remove notification player and remote controls from track player
148f726 2026-01-21 01:19 fix(android): patch RNTP 4.1.2 for Kotlin nullability (Bundle?)
```

`2a19137` apagou 583 linhas: `src/audio/playbackService.ts` (180), `src/audio/notificationTheme.ts`
(47), `src/audio/debugLog.ts` (44), 283 linhas de `trackPlayer.ts` e 34 de `index.js`.

**Isso responde a pergunta 2 da §7, e a resposta tem duas metades:**

- **`c60729d` não foi New Architecture.** Foi um bug de código do RNTP 4.1.2, presente também na
  arquitetura antiga: a constante era exportada com o ordinal do enum **errado**.
  ```diff
  -            this["CAPABILITY_SKIP"] = OnErrorAction.SKIP.ordinal
  +            this["CAPABILITY_SKIP"] = Capability.SKIP.ordinal
  ```
  Isso colidia valores numéricos de capability — daí toda a instrumentação `capabilityValueToNames`
  / `(dup:${cap})` que o mesmo commit adicionou ao `trackPlayer.ts`. Correção legítima de causa
  raiz, de outra causa.

- **`148f726` também não foi New Architecture.** Foi nullability de Kotlin
  (`originalItem: Bundle?` passado a `Arguments.fromBundle`, que exige não-nulo). Era necessário
  para o patch **compilar**, não para o comportamento.

- **A maratona inteira, porém, foi New Architecture** — e nenhum dos 12 commits chegou lá.
  `f04373e` e `5af9a98` (registrar o service antes do expo-router) são a tentativa clássica de
  resolver ordem de registro de headless task, que é o sintoma que aparece quando o problema real é
  outro. `cca6f08`, `301ef74` e `d2fc333` adicionam listeners e logs para eventos
  `RemotePlay`/`RemotePause`/`RemoteNext` que **nunca poderiam chegar**, porque `emit()` estava
  morto. Instrumentar o lado JS de um evento que evapora no lado nativo produz exatamente o que
  produziu: nada, por cinco horas, seguido de remoção.

`MusicService.kt:652-653` mostra que os botões da notificação passam pela mesma função morta:

```kotlin
MediaSessionCallback.PLAY -> emit(MusicEvents.BUTTON_PLAY)
MediaSessionCallback.PAUSE -> emit(MusicEvents.BUTTON_PAUSE)
```

### 2.4 A superfície de RNTP que o app realmente usa é minúscula (VERIFICADA)

Este é o achado que mais muda o custo das saídas. Depois de `2a19137`, sobraram **dois** arquivos
importando RNTP (`src/audio/trackPlayer.ts`, `src/audio/rntpService.ts`) e a API usada é:

| Chamada | Ocorrências |
|---|---|
| `TrackPlayer.reset` | 5 |
| `TrackPlayer.play` | 4 |
| `TrackPlayer.seekTo` | 3 |
| `TrackPlayer.pause` | 3 |
| `TrackPlayer.add` | 3 |
| `TrackPlayer.stop` | 2 |
| `TrackPlayer.getState` | 2 |
| `TrackPlayer.setupPlayer` / `setRepeatMode` / `getPosition` / `addEventListener` | 1 cada |

Mais os hooks `usePlaybackState` e `useProgress`, e **um** listener: `Event.PlaybackError`.

E o que o app **não** usa, verificado por grep no repo inteiro (`src/`, `app/`, `index.js`), com
**zero** ocorrências de cada:

- `updateOptions` — nenhuma configuração de notificação
- `Capability`, `compactCapabilities`, `notificationCapabilities` — nenhum controle de mídia
- `registerPlaybackService` — **nenhum playback service registrado.** `index.js` tem 3 linhas e só
  carrega `expo-router/entry`
- `AppKilledPlaybackBehavior` — nenhuma política de background

`resetAndLoadTrack` faz `TrackPlayer.reset()` seguido de `TrackPlayer.add([payload])` com **uma**
faixa. Não é fila; é carregamento de faixa única.

**Conclusão:** o app usa o RNTP como um tocador de URL em primeiro plano. Sem notificação, sem
background, sem fila, sem Android Auto, sem cache, sem lock screen. A spec original ponderou a
saída B contra "background, controles de notificação e fila" (§4). **Nenhuma das três está em uso.**

### 2.5 O mecanismo que explica a dor relatada (INFERIDO, forte)

`usePlaybackState` do RNTP 4.1.2
(`node_modules/react-native-track-player/src/hooks/usePlaybackState.ts`) busca o estado **uma vez**
na montagem e depois depende inteiramente do evento:

```ts
getPlaybackState().then((fetchedState) => { ... });
const sub = addEventListener(Event.PlaybackState, (state) => {
  setPlaybackState(state);
});
```

`useProgress`, em contraste, **faz polling** de `getProgress()` num `setTimeout` — chamada de
método, não evento.

Com `emit()` morto, a previsão é específica e testável: **a barra de progresso anda normalmente,
mas o botão play/pause fica travado no estado em que estava quando o componente montou.**
`rntpService.ts:292` deriva `isPlaying` de `usePlaybackState()`, e `:294-301` deriva o `status`
inteiro dele.

E a segunda consequência é pior porque é invisível: o **único** listener do app,
`Event.PlaybackError` (`rntpService.ts:246`), nunca dispara. Todo o caminho de tratamento de erro
pendurado nele — `attemptRenewalOnceOnError` (renovação de URL assinada expirada), `setError`,
`resetAndStop` — é **código morto em produção hoje**. Quando uma URL do Supabase expira, o app não
mostra erro e não tenta renovar: ele simplesmente para.

> Isto é INFERIDO. É derivado de fonte lida em três camadas (RN, RNTP nativo, RNTP JS) mais a
> issue upstream #2593, e é consistente com 12 commits de fracasso. Não foi observado no aparelho.

### 2.6 Instrumentação: não existe (VERIFICADA)

```
grep -rn "Sentry\|Crashlytics\|bugsnag" package.json src/ app/ app.config.ts eas.json
→ (nenhum resultado)
```

**O levantamento é, portanto, explicitamente inconclusivo quanto a crash**, exatamente como a §7
propôs. Não há como afirmar nem negar que o app crasha por isto. A issue upstream #2619 mostra que
existe um crash real de New Architecture nesta biblioteca (`ReactHost` nulo), mas nada permite
dizer que este app o encontrou.

O que existe de log é **um** artefato: `src/screens/CuratorReviewQueue/diagnostics` (45 KB, commitado
em `c60729d`), um `adb logcat -s ReactNativeJS:V` de 2026-01-20, cobrindo 2min17s. Ele prova três
coisas e não mais que três:

1. `Running "main" with {"rootTag":1,"initialProps":{},"fabric":true}` — New Architecture ativa.
2. `'capabilities validation: ok', { capabilities: [ 'Play', 'Pause', 'SeekTo' ] }` — a correção do
   enum de `c60729d` funcionou do lado JS.
3. **Zero** erros, exceções, crashes ou `ParsingException`. Os únicos casamentos de "error" são
   campos `error: null` dentro de payloads.

E o que ele **não** prova: nenhum evento `Remote*` aparece no arquivo inteiro. A captura não inclui
um toque nos botões da notificação, então ela não confirma nem desmente a §2.5.

> Observação fora de escopo: esse arquivo de log está commitado dentro de
> `src/screens/CuratorReviewQueue/`, sem extensão, como se fosse código. Não é. Não mexi nele.

---

## 3. Escopo desta spec

### 3.1 Dentro — levantamento

1. ✅ **Medir.** Feito. Resultado: sem instrumentação de crash (§2.6); um log de dev client de 2min
   que não cobre o caso; comportamento errado atribuível identificado na fonte (§2.2b, §2.5).
2. ✅ **Delimitar a incompatibilidade.** Feito, §2.2 e §3.3. Não é bloco monolítico: são quatro
   áreas com status diferentes.
3. ✅ **Levantar as saídas**, com custo e risco — §4.
4. ✅ **Recomendar uma**, com o critério explícito — §4.3.

### 3.2 Fora

- **Implementar qualquer coisa.** Inclusive troca de biblioteca. *(Respeitado: nada em `src/`.)*
- **Desligar a New Architecture.** É saída possível (§4), mas quem decide é o usuário — e ela
  arrasta o Reanimated 4 junto. *(Ver §4.1-C: agora está confirmada como inviável.)*
- **Redesenhar a experiência do player.** É o escopo da reconstrução, e a reconstrução vem depois
  desta resposta.

### 3.3 A incompatibilidade, delimitada por área

| Área | Status na v4.1.2 sob New Arch | O app usa? | Sintoma relatado? |
|---|---|---|---|
| **Registro do módulo nativo** | Quebrado por assinatura (`ParsingException`). **Corrigido pelo patch do repo**, 36 métodos, cobertura verificada | **Sim, tudo depende disso** | Não — porque foi corrigido antes de o app rodar |
| **Emissão de evento nativo → JS** | Quebrado, silencioso (`MusicService.emit()`, cadeia legada). **NÃO corrigido.** Upstream #2593 | **Sim** — `Event.PlaybackError`, `usePlaybackState` | Sim, indiretamente: os 12 commits de 2026-01-20 e a dor relatada com o player |
| **Sessão de mídia / controles da notificação** | Renderiza no nativo, mas o toque não chega ao JS (mesma causa acima) | **Não hoje** — removido em `2a19137` | Sim, historicamente. Foi por isso que foi removido |
| **Background / foreground service** | `HeadlessJsTaskService` + `ReactHost` nulo (upstream #2619 = crash). iOS morre em ~50-60s (#2615, mesma versão de RN deste app) | **Não** — nenhum `registerPlaybackService` | Não — porque não é usado |

**Leitura:** das quatro áreas, o app depende de duas. Uma está corrigida. A outra não está, e é a
que dói.

---

## 4. As saídas a instruir

### 4.1 Custeadas (2026-08-28)

| # | Saída | Custo | Risco | Veredito |
|---|---|---|---|---|
| **A** | **Ficar como está** | Zero agora | **Maior do que a spec supunha.** O erro nunca aparece e a URL expirada nunca renova (§2.5). E a saída tem prazo: RN 0.83 (Expo SDK 55) "starts the process of removing pieces of interop code" — a camada de interop de que o patch depende está ela própria em rota de remoção | Insuficiente sozinha |
| **A'** | **Ficar, e estender o patch para consertar `emit()`** — *saída que a spec original não listou* | **Baixo: ~6 linhas no arquivo de patch que já existe.** Sem dependência nova, sem mudança de API, sem mexer em `src/` | Médio: é código nativo de terceiro, e o `patch-package` já é parte do fluxo. Precisa de build EAS para validar | **Melhor relação custo/benefício imediata** |
| **B** | **Trocar de motor** | **Baixo, e muito mais baixo do que a spec supôs.** A superfície é de 11 chamadas e 1 listener (§2.4) | Baixo. `expo-audio` é first-party Expo e acompanha o SDK | **Destino certo do motor** |
| **C** | **Desligar a New Architecture** | Alto | **CONFIRMADO INVIÁVEL** | **Descartar** |
| **D** | **Reconstrução completa** | Grande, por desenho | Fora do escopo deste levantamento | Continua sendo o destino; **B é a decisão de motor dentro dele** |

### 4.2 O detalhe de cada uma

**A' — o patch de `emit()`, custeado de verdade.** O `MusicService` estende
`HeadlessJsTaskService`, que **já expõe os dois caminhos**
(`node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/HeadlessJsTaskService.kt`):

```kotlin
:116  protected open val reactNativeHost: ReactNativeHost
:117    get() = (application as ReactApplication).reactNativeHost
:124  protected open val reactHost: ReactHost?
:125    get() = (application as ReactApplication).reactHost
```

e a própria classe já usa o padrão de ramificação correto (`:130-134`):

```kotlin
val reactHost = checkNotNull(reactHost) { "ReactHost is not initialized in New Architecture" }
return reactHost.currentReactContext
...
val reactInstanceManager = reactNativeHost.reactInstanceManager
```

`ReactContext` tem o emissor seguro nas duas arquiteturas
(`.../bridge/ReactContext.java:163-168`, `emitDeviceEvent`). Então o conserto é trocar a cadeia
legada por `reactHost?.currentReactContext ?: reactNativeHost.reactInstanceManager.currentReactContext`
e emitir por `emitDeviceEvent`, em `emit()` e `emitList()`. Duas funções.

Isto **não é trabalho de player** e não fere a ordem decidida (player por último): não toca UI, não
toca desenho, restaura tratamento de erro que o app já acredita ter.

**B — `expo-audio`, checado contra o que o app usa.** A documentação do Expo confirma as três
coisas que a §4 original mandava verificar, e o app não usa nenhuma delas hoje:

- Background: suportado, via config plugin `"enableBackgroundPlayback": true`. "On Android, you have
  to enable the lock screen controls with `setActiveForLockScreen` for sustained background
  playback. Otherwise, the audio will stop after approximately 3 minutes."
- Controles de notificação: suportados. "A media notification appears in the notification drawer
  with playback controls"; `setActiveForLockScreen(active, metadata, options)`.
- Fila: suportada, classe `AudioPlaylist` com `next()`, `previous()`, `skipTo(index)`, `add()`,
  `insert()`, `remove()`, com gapless.

Versão pareada com o SDK 54: `expo-audio ~1.1.1` (`node_modules/expo/bundledNativeModules.json`).
Não está instalado hoje. **Aviso importante:** as três capacidades acima foram lidas na doc do
`latest` (SDK 57). Se a reconstrução for querer notificação e background de fato, **confirmar contra
a doc do `1.1.1`** antes de prometer, ou fazer junto com o upgrade de SDK.

**C — por que é inviável, confirmado e não presumido.** A §4 original pedia confirmação. Duas
travas independentes:

1. Reanimated exige, pela própria README instalada
   (`node_modules/react-native-reanimated/README.md:27,29`, versão instalada 4.1.6):
   > "React Native Reanimated 4.x supports only the New React Native architecture and three latest
   > React Native versions. If your app still runs on the old architecture, please consider adopting
   > the New Architecture or stay with latest 3.x release."

   Desligar arrastaria Reanimated 4.1.6 **e** `react-native-worklets@0.5.1` de volta para a linha
   3.x, com toda a animação do app junto.

2. **O React Native removeu a chave.** A 0.82 "removes the toggle that allowed developers to disable
   it (`newArchEnabled=false`)". Mapa de SDK: 54 → RN 0.81 (**onde o app está, a última em que C é
   sequer possível**), 55 → RN 0.83, 56 → RN 0.85, 57 → RN 0.86. **C morre no instante em que o app
   sair do SDK 54**, e ele já está três SDKs atrás.

**D — e a novidade que muda o desenho de D.** A premissa "não existe suporte" **é falsa a partir de
2026-05-06**, mas o caminho tem etiqueta de preço.

### 4.3 A premissa, testada: onde ela se sustenta e onde cai

**Se sustenta**, mais forte do que estava escrita, para a versão fixada:

- `react-native-track-player@4.1.2` (`^4.1.2` no `package.json`; 4.1.2 é ainda o `latest` da npm
  desse nome, publicado 2025-08-12) **não tem `codegenConfig`**. Não é TurboModule; é módulo de
  bridge legado rodando por interop.
- E agora é **permanente**: o release v5.0.0 (2026-05-06) declara "V4 frozen on the `v4` branch under
  Apache-2.0, **no further updates**". As issues #2593, #2619, #2615 e os PRs #2370, #2620 foram
  todos fechados nessa data, sem release de v4. **A v4 nunca vai suportar New Architecture.**

**Cai** na parte que importa para a decisão: **o suporte existe, e o app já satisfaz os
pré-requisitos dele.**

- `@rntp/player@5.9.2` (publicado **2026-08-26, dois dias atrás**; 22 versões desde 2026-03-09).
- Tem `codegenConfig: { name: "RNTrackPlayerSpec", type: "modules" }` — TurboModule de verdade.
- "Built on the New Architecture with synchronous native calls"; exige RN 0.74+ e New Architecture
  ligada. **O app está em RN 0.81.5 com New Architecture ligada: já qualifica.**
- Repo ativo: `archived: false`, `pushed_at: 2026-07-31`, 15 issues abertas.

**O custo escondido: mudou de nome e de licença.**

- Pacote novo: `@rntp/player`, não `react-native-track-player`. "not backwards-compatible with V4",
  "a complete rewrite".
- Licença: `"SEE LICENSE IN <license.txt>"` no `package.json` da npm, **não Apache-2.0**. Uso
  pessoal e educacional livre; **app comercial exige licença paga**: RNTP Pro **€99/mês ou €999/ano**
  (1 app comercial), Studio €249/mês ou €2.499/ano (até 5). "White-label & resale not permitted".
- Existe um **Launch Credit Program**: licença comercial complementar de 6 meses antes do lançamento
  do app, para "indie developers and small teams". Saravafy é pré-lançamento, então **plausivelmente
  se qualifica** — mas isso é uma ponte de 6 meses, não uma isenção.

**Por isso a recomendação de motor é `expo-audio`, não `@rntp/player` v5.** A v5 é um motor
excelente e resolveria tudo, mas o app usa 11 chamadas e nenhuma fila, nenhum Android Auto, nenhum
cache, nenhum preload. Pagar €999/ano por uma superfície que `expo-audio` cobre de graça, e que já
vem versionada junto com o SDK que o app tem de acompanhar de qualquer forma, é comprar potência que
o desenho não pede. **Se a reconstrução (D) decidir que o player precisa de Android Auto, cache,
preload ou HLS, essa conta muda e a v5 volta à mesa** — aí o preço compra algo.

### 4.4 O critério da §4, aplicado

> **Critério, escrito antes de olhar o resultado:** se (1) não houver evidência de dano atribuível
> **e** (2) o custo de B for alto, a recomendação é A até o restante do P0/P1/P2 acabar. Qualquer
> evidência de crash atribuível inverte isso.

Aplicado honestamente, **as duas pernas da condição "recomendar A" falham**:

1. **Há dano atribuível.** Não da forma que o critério antecipou: não é crash, é perda silenciosa de
   evento (§2.2b, §2.5), verificada na fonte em três camadas e confirmada por issue upstream. O
   critério binarizou em "crash", e o dano real desta incompatibilidade tem outra forma. **Registro
   isso como limitação do critério, não como licença para racionalizar**: a cláusula de inversão
   ("qualquer evidência de crash") não foi acionada, porque evidência de crash não existe e não pode
   existir sem instrumentação.
2. **O custo de B é baixo, não alto.** O critério assumiu B caro. A §2.4 mostra por que não é: a
   superfície colapsou para 11 chamadas quando `2a19137` removeu notificação e background.

**Recomendação:**

> **A' agora; B como decisão de motor quando o player chegar a sua vez; C descartada; D inalterada
> como destino.**

Desdobrado:

1. **Agora (barato, fora do trabalho de player):** estender o patch existente para consertar
   `emit()` e `emitList()`. Isso devolve `Event.PlaybackError` e `usePlaybackState`, que o app já
   supõe funcionando. **Não reordena nada** e não antecipa a reconstrução.
2. **Não trocar de motor agora.** A ordem do usuário (player por último) continua correta, e agora
   por um motivo a mais: a troca é barata **porque** o app não usa quase nada do RNTP, então esperar
   não a encarece.
3. **Quando D acontecer, o motor é `expo-audio`**, salvo se o desenho pedir Android Auto, cache,
   preload ou HLS — nesse caso reavaliar `@rntp/player` v5 com o Launch Credit Program.
4. **`C` deve ser riscada do backlog**, não deixada como opção aberta. Ela tem data de morte
   conhecida (saída do SDK 54).
5. **Instrumentação de crash continua ausente e continua sendo o buraco.** Enquanto não houver, o
   próximo levantamento vai bater no mesmo limite.

---

## 5. Não-objetivos

- Não é para transformar levantamento em refactor por impulso.
- Não é para tratar a saída do `expo-doctor` como prova de dano. Incompatibilidade documentada é
  hipótese forte, **não** é observação.

> **Nota 2026-08-28:** a §5 se provou certa e importante. O `expo-doctor` acusa porque lê um
> metadado do `reactnative.directory` (`newArchitecture: false`), o que é verdade sobre o pacote e
> nada diz sobre este app. O dano teve de ser encontrado na fonte, não na ferramenta. E a §2.6
> registra o outro lado: **quanto a crash, o levantamento é inconclusivo e permanece inconclusivo.**

---

## 6. Definition of done

**Agent DoD:** o levantamento escrito, com cada afirmação carregando sua fonte e marcada como
*verificada* ou *inferida*; as quatro saídas com custo e risco; uma recomendação com o critério de
§4 aplicado; `N1` atualizado no backlog com o que foi descoberto.

> **Status 2026-08-28:** cumprido, com uma exceção deliberada — `N1` no `BACKLOG.md` **não** foi
> tocado, porque atualizá-lo é a Task 5 do plano e a Task 5 é do main thread, não do agente.

**Human DoD:** o usuário lê e decide entre A–D. **Não há teste de aparelho nesta spec** — se o
levantamento pedir reprodução dirigida, ela vira uma seção da fila, e não um passo bloqueante do
plano ([`CONVENTIONS.md`](../CONVENTIONS.md) §4).

> **O levantamento pede uma reprodução dirigida, e ela é barata.** Vai para a fila, **não** bloqueia
> nada. É o teste que converte a §2.5 de INFERIDA para VERIFICADA:
>
> 1. Tocar um ponto e observar o **botão play/pause** enquanto a **barra de progresso** anda. Se a
>    barra anda e o botão não muda ao pausar pela UI, `Event.PlaybackState` não está chegando, e a
>    §2.5 está confirmada.
> 2. Forçar uma URL de áudio inválida ou expirada. Se **nenhuma** mensagem de erro aparece e o áudio
>    só para em silêncio, `Event.PlaybackError` não está chegando, e a renovação automática está
>    morta.
>
> Qualquer um dos dois basta. Os dois juntos fecham o caso.

---

## 7. Perguntas em aberto

1. ~~Existe crash analytics neste app?~~ **RESPONDIDA: não existe.** `grep` por
   `Sentry|Crashlytics|bugsnag` em `package.json`, `src/`, `app/`, `app.config.ts`, `eas.json`
   devolve zero. A proposta da spec vale e foi seguida: **o levantamento fica explicitamente
   inconclusivo quanto a crash.** Instalar instrumentação não era pré-requisito — o dano foi
   encontrado por outra via (leitura de fonte) — mas continua sendo o que falta para qualquer
   afirmação sobre estabilidade.
2. ~~As duas correções anteriores são sintoma desta incompatibilidade ou de outra coisa?~~
   **RESPONDIDA, e a pergunta estava mal-posta em dois pontos.** Primeiro, não foram duas correções:
   foram 12 commits em 5h18min terminando em remoção (`2a19137`). Segundo, a resposta é "as duas
   coisas": as duas correções **nomeadas** (`c60729d` enum errado, `148f726` nullability) **não** são
   New Architecture, são bugs próprios do RNTP 4.1.2; mas a **maratona** de que elas fazem parte é
   New Architecture inteira, e falhou porque a causa (`MusicService.emit()` morto em bridgeless)
   estava numa camada que ninguém olhou. Detalhe em §2.3. **Era mesmo a melhor pista que existia.**
3. `N2` (`@react-native-community/netinfo` um major à frente) entra junto? **Proposta mantida: não**
   — o backlog já o amarra ao `S-5`, e misturar duas correções nativas na mesma passada torna a
   atribuição impossível. *(Confirmado 2026-08-28: o `expo-doctor` continua listando `netinfo`
   `12.0.1` vs `11.4.1` esperado. Nada no levantamento sugere ligação com o player.)*

---

## 8. Apêndice: comandos e fontes deste levantamento

Tudo abaixo é reproduzível, read-only, sem Metro e sem EAS.

| Afirmação | Como foi verificada |
|---|---|
| Flag da New Arch ligada | `grep -n newArchEnabled app.config.ts` → `76`; `android/gradle.properties:38` |
| New Arch ativa em runtime | `src/screens/CuratorReviewQueue/diagnostics`, `"fabric":true` |
| RNTP 4.1.2 sem TurboModule | `node -e` em `node_modules/react-native-track-player/package.json` → sem `codegenConfig` |
| v5 com TurboModule | `npm view @rntp/player` → `codegenConfig.name: "RNTrackPlayerSpec"` |
| Restrição do interop | `TurboModuleInteropUtils.kt:58-64` |
| `emit()` legado | `MusicService.kt:743-757`; patch não cobre o arquivo |
| `ReactNativeHost` é legado | `ReactNativeHost.java:34-40`, `@LegacyArchitecture(ERROR)` |
| Caminho seguro existe | `HeadlessJsTaskService.kt:116-134`; `ReactContext.java:163-168` |
| Cobertura do patch | 39 `@ReactMethod`, 0 `= scope.launch` restantes |
| Superfície usada | `grep -rhno "TrackPlayer\.[A-Za-z]*" src/`; grep zero para `updateOptions`/`Capability`/`registerPlaybackService` |
| Sem crash analytics | `grep -rn "Sentry\|Crashlytics\|bugsnag" package.json src/ app/` |
| Reanimated exige New Arch | `node_modules/react-native-reanimated/README.md:27,29` (4.1.6 instalada) |
| RN 0.82 removeu o toggle | Blog oficial RN 0.82 (2025-10-08) e discussão `reactwg/react-native-new-architecture#309` |
| Mapa SDK → RN | `docs.expo.dev/versions/latest` |
| v4 congelada, v5 comercial | Release v5.0.0 (2026-05-06); `npm view @rntp/player` → licença não-Apache; `rntp.dev/pricing` |
| Issues upstream | GitHub search API em `doublesymmetry/react-native-track-player` (#2593, #2619, #2615, #2370, #2620) |
| `expo-audio` cobre o necessário | `docs.expo.dev/versions/latest/sdk/audio/`; versão SDK 54 em `node_modules/expo/bundledNativeModules.json` |
