# Specs, plans, and working agreements

**Start here** before writing or executing any spec.

| Document | Purpose |
|---|---|
| [`CONVENTIONS.md`](CONVENTIONS.md) | **Binding rules** for how specs and plans are written here. Every rule cites the failure that produced it. |
| [`BACKLOG.md`](BACKLOG.md) | Prioritized deferred scope. P0 confirmed defects → P1 contract holes → P2 duplication → P3 cleanup. Nothing is "deferred to Spec N" unless Spec N exists. |
| [`HUMAN-VALIDATION-QUEUE.md`](HUMAN-VALIDATION-QUEUE.md) | Everything needing eyes on a running app, batched into one pass. Agents never validate from here, and a pending item never blocks a commit. |
| [`EXECUTION.md`](EXECUTION.md) | Which model runs which task in the subagent-driven run, and why. Includes the rule that reconciliation is never delegated. |
| `specs/` | What and why, per unit of work. |
| `plans/` | How, task by task, one commit per task. |

## The loop

```
audit / defect catalogue  →  spec (what + why)  →  plan (how, per task)
                                                        │
                                                        ▼
                                          agent executes, commits per task
                                                        │
                                                        ▼
                                   reconcile: tick boxes, record deviations,
                                   correct the spec, queue human checks
                                                        │
                                                        ▼
                              batched human validation  →  findings feed back
```

Two rules carry most of the weight:

1. **Every spec has a plan.** The one spec written without one (2a) stalled half-implemented for
   two months with a broken build. The two with plans landed complete.
2. **Agent DoD and human DoD are separate gates.** An agent cannot drive a simulator; a plan that
   makes a dev-client walkthrough a blocking step is a plan with an unreachable gate.

## Current status

| Spec | Plan | Agent DoD | Human DoD |
|---|---|---|---|
| [Spec 1 — Foundations](specs/2026-06-13-spec-1-foundations.md) | ✅ | ✅ 2026-06-13 | ✅ validated 2026-08-08/09 |
| [Spec 2a — AddToCollection unify](specs/2026-06-14-spec-2a-add-to-collection-unify.md) | ❌ none | ✅ 2026-08-08 | ✅ validated 2026-08-08/09 |
| [Spec 2b — PreferencesContext → RQ](specs/2026-06-14-spec-2b-preferences-context-rq.md) | ✅ | ✅ 2026-06-14 | ⏳ partial (invites deferred) |
| [Spec 3 — Auth state leaks](specs/2026-08-09-spec-3-auth-state-leaks.md) | [✅](plans/2026-08-09-spec-3-auth-state-leaks.md) | ✅ 2026-08-09 | ⏳ queued 5.7–5.11 |
| [Spec 4 — Failure presentation](specs/2026-08-09-spec-4-failure-presentation.md) | [✅](plans/2026-08-09-spec-4-failure-presentation.md) | ✅ 2026-08-09 | ⏳ queued |
| [Spec 5 — Add-to-collection write path](specs/2026-08-09-spec-5-add-to-collection-write-path.md) | [✅](plans/2026-08-09-spec-5-add-to-collection-write-path.md) | ✅ 2026-08-09 | ⏳ queued |
| [Spec 6 — Keyboard avoidance (pilot)](specs/2026-08-09-spec-6-keyboard-avoidance.md) | [✅](plans/2026-08-09-spec-6-keyboard-avoidance.md) | ✅ 2026-08-09 (via EAS) | ⏳ **gates Spec 7** — needs the EAS APK |
| ~~*Spec 7 — Keyboard avoidance (rollout)*~~ | — | ✅ **feito 2026-08-09**, fora de spec | ⏳ fila seção 9 |
| [Spec 7 — Navigation unification](specs/2026-08-10-spec-7-navigation-unification.md) | [✅](plans/2026-08-10-spec-7-navigation-unification.md) | 🔒 não implementada | faixa proibida |
| [Spec 8 — Preferences unification](specs/2026-08-10-spec-8-preferences-unification.md) | [✅](plans/2026-08-10-spec-8-preferences-unification.md) | ⏳ Task 1 (inventário) feita 2026-08-28 | decisão do usuário |
| [Spec 9 — Player × New Architecture](specs/2026-08-10-spec-9-player-new-architecture.md) | [✅](plans/2026-08-10-spec-9-player-new-architecture.md) | ✅ investigada 2026-08-28 | teste opcional §6 |
| [Spec 10 — Fechar a faixa segura](specs/2026-08-28-spec-10-safe-band-remainder.md) | [✅](plans/2026-08-28-spec-10-safe-band-remainder.md) | ✅ 2026-08-28 | ⏳ fila seções 13-14 + bloco "COMECE AQUI" |

> ⚠️ **Colisão de nome corrigida aqui:** este README chamava de "Spec 7" o *rollout do teclado*,
> que na verdade foi executado em 2026-08-09 **sem spec** (as 11 telas, ver fila seção 9). A Spec 7
> que existe em `specs/` é **outra coisa**: unificação de navegação (`S-4a`). Duas linhas acima, para
> quem vier atrás não procurar a spec errada.

The 2026-08-08/09 validation pass confirmed **8 defects** (`D6`–`D13`). Specs 3-5 cover seven of
them; `D13` (profile photo) needs a product decision and a likely schema change, so it stays in the
backlog rather than being forced into scope.

**Execution order is by blast radius, not by size:** Spec 3 first (it is the only
permission-adjacent group — a signed-out viewer seeing admin affordances), then Spec 4 (`D10`
blocks the `S-3a` sweep, so fixing it unblocks later work), then Spec 5.

**Spec 6 is the one deliberately partial spec.** It replaces a keyboard workaround on a single
screen and stops, because the fix routes through a component rendered in **19 files** — changing
it in place would not be a pilot. The rollout is *blocked*, not merely unstarted: it does not get written
until the pilot is validated by hand, and it inherits **11** remaining filler screens.

Spec 2a had **no plan** — it predates [`CONVENTIONS.md`](CONVENTIONS.md) §1, and is the reason
that rule exists (it stalled half-implemented for ~2 months without one). It was the last spec
permitted to run without a plan; finished as-is rather than retro-planned. While closing it, a
repo-wide grep for its own §11 rule caught a second pre-existing offender in `AddToCollection.tsx`
sharing the same ad-hoc key pattern — both are now registered in `queryKeys.ts`.

## Estado atual — 2026-08-28

**A faixa segura acabou.** A [Spec 10](specs/2026-08-28-spec-10-safe-band-remainder.md) fechou tudo
o que restava dela (`X18`, `X15`, `X11`, `X9`, `X12`, `S-3b`, `S-3a`, `X4`). O que sobra no
[`BACKLOG.md`](BACKLOG.md) precisa de decisão do usuário, de aparelho, ou dos dois.

Gate em `master`: `tsc` sem saída, **23 suítes / 160 testes / 0 falhas / 0 avisos de `act()`**.
Era 12 suítes / 115 testes antes desta rodada.

**Se você é a próxima sessão, leia nesta ordem:**

1. [`WORK-ORDER.md`](WORK-ORDER.md) — o estado, e os **dois achados que mudam premissa**
   (o `emit()` morto no player; o overlay de Preferências inalcançável). Não re-derive nada disso.
2. [`QUESTIONS-FOR-USER.md`](QUESTIONS-FOR-USER.md) — 9 decisões acumuladas. Nada ali foi executado.
3. [`BACKLOG.md`](BACKLOG.md) — inclui o porquê de `X16`, `C4`, `X3` e `X6` **não** terem sido
   feitos, para não parecerem esquecimento.

**Se você é o usuário voltando para testar:** vá direto ao bloco **"⭐ COMECE AQUI"** no topo da
[`HUMAN-VALIDATION-QUEUE.md`](HUMAN-VALIDATION-QUEUE.md). Não precisa de build novo — a rodada de
2026-08-28 é 100% JS/TS.

---

**Todas as specs escritas estão Agent-DoD-completas**, exceto as que estão deliberadamente
não implementadas (7, e as Tasks 3-5 da 8). Nada bloqueia uma passada de validação humana — veja a
[`HUMAN-VALIDATION-QUEUE.md`](HUMAN-VALIDATION-QUEUE.md).

> Este parágrafo dizia "**all six specs**" e mandava começar pela **seção 0**. Desatualizado desde
> 2026-08-28: hoje são dez specs, e o ponto de entrada certo é o bloco **"⭐ COMECE AQUI"** no topo
> da fila. A seção 0 continua válida, mas é da Spec 6 (teclado), não da rodada mais recente.

⚠️ **Spec 6 needs the EAS APK, not the current dev client.** It adds a native module, so a JS reload
cannot pick it up — and `npm run android:dev` does not work on this machine at all. `ninja.exe` and
`cmake.exe` declare no `longPathAware` manifest element, so Windows truncates codegen paths at 260
characters even with `LongPathsEnabled=1`, and `android/` is gitignored (Continuous Native
Generation) so an in-repo CMake tweak would not survive the next `expo prebuild`. **For any future
spec adding a native module here, the agent-side gate is a green EAS build, not `./gradlew`.**
Details in the plan's Task 2 Step 3.

⚠️ **Run the whole queue from that APK, not only section 0.** `KeyboardProvider` wraps the entire app
tree in a codegen native view that a dev client built before this dependency does not contain — so an
older client may fail to boot rather than merely miss the change. `app/_layout.tsx:72-89` already
try/catches `react-native-gesture-handler` for exactly this reason; `KeyboardProvider` has no
equivalent guard, and it is not a leaf.

## Where the priorities come from

`docs/architecture/code-quality-audit.md` ranks by size and duplication. That is **not** the
current priority order — see the banner at its top.

The active goal is resistance to unexpected bugs. The defects that actually cause those live in
`docs/architecture/aggregation.md` §6, and the five re-verified against source on 2026-08-08 sit at
P0 in [`BACKLOG.md`](BACKLOG.md). Monolith splits are scheduled **last**, deliberately: a
3,000-line file matters because it hides multiple sources of truth, not because of its length.
