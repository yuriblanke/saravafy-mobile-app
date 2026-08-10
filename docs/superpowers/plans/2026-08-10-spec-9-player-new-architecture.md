# Spec 9 — Player e New Architecture: Investigation Plan

**Spec:** [`2026-08-10-spec-9-player-new-architecture.md`](../specs/2026-08-10-spec-9-player-new-architecture.md)
**Status:** escrito, não executado.

**Este plano não produz código.** O entregável é um levantamento com fonte por afirmação e uma
recomendação. Nenhuma task abaixo edita `src/`.

Ambiente: `C:\saravafy\saravafy-mobile-app`, Windows.

> **Ordem:** por decisão do usuário (2026-08-08), o player é o **último** item. Este levantamento
> pode ser feito antes — é barato e não mexe em nada — mas a execução do que ele recomendar espera
> o P0/P1/P2 acabar.

---

## Task 1: Começar pela pista concreta

A pergunta 2 da spec é o melhor fio: **as duas correções anteriores de controle de notificação são
sintoma desta incompatibilidade ou de outra coisa?**

1. `git show c60729d` e `git show 148f726` — ler o diff inteiro, não a mensagem.
2. Para cada uma: qual era o sintoma, o que a correção fez, e ela tratou causa ou contornou?
3. Anotar se alguma toca registro de módulo nativo, sessão de mídia ou ciclo de vida em background —
   as três áreas onde "não suportado na New Architecture" costuma se manifestar.

- [ ] Task 1 concluída. Commit: `docs: analisar as correcoes anteriores de controle de notificacao`

---

## Task 2: Determinar se existe instrumentação

1. Procurar crash analytics: `grep -rn "Sentry\|Crashlytics\|bugsnag" package.json src/ app/`.
2. Se **não houver**, registrar isso como resultado: o levantamento fica **explicitamente
   inconclusivo quanto a crash**, e dizer isso vale mais que fabricar confiança.
3. Levantar o que existir de log do dev client e os relatos datados do usuário.

- [ ] Task 2 concluída. Commit: `docs: registrar o estado da instrumentacao de crash`

---

## Task 3: Delimitar a incompatibilidade

Não tratar "não suportado" como bloco monolítico.

1. Ler a documentação e as issues do `react-native-track-player` sobre New Architecture — **anotar
   versão e data de cada afirmação**, porque este é o tipo de fato que muda sozinho.
2. Separar: registro do módulo nativo, sessão de mídia, controles da notificação, background.
3. Para cada área, dizer se o app usa e se há sintoma relatado.

- [ ] Task 3 concluída. Commit: `docs: delimitar quais areas do RNTP a incompatibilidade atinge`

---

## Task 4: Custear as quatro saídas e recomendar

1. Preencher A–D da §4 da spec com custo e risco.
2. Para B (troca de motor), verificar se o substituto cobre background, controles de notificação e
   fila — as três coisas que o app usa hoje.
3. Para C, **confirmar** que Reanimated 4 exige New Architecture. Não presumir: é o que sustenta
   descartar a saída.
4. Aplicar o critério que a §4 fixou **antes** de olhar o resultado, e escrever a recomendação.

- [ ] Task 4 concluída. Commit: `docs: custear as saidas do N1 e recomendar`

---

## Task 5: Reconciliar

1. Atualizar `N1` no [`BACKLOG.md`](../BACKLOG.md) com o descoberto, marcando cada afirmação como
   **verificada** ou **inferida**.
2. Corrigir a spec onde o levantamento divergiu do que ela supunha.
3. Se a recomendação exigir reprodução dirigida no aparelho, criar a seção na fila — **nunca** como
   passo bloqueante deste plano ([`CONVENTIONS.md`](../CONVENTIONS.md) §4).

- [ ] Task 5 concluída. Commit: `docs: reconciliar o Spec 9`
