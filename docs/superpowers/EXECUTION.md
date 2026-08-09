# Execution guide — model assignment per task

**Date:** 2026-08-09
**Applies to:** the subagent-driven run of Specs 3, 4, 5, 6.
**Companion to:** [`CONVENTIONS.md`](CONVENTIONS.md) (the rules) and the plans (the work).

---

## Main thread: Opus

The main thread emits few tokens but every decision it makes governs a whole task. Run cost is
dominated by subagents, so paying for judgment here is cheap. Its four jobs, in order of how badly
things break if it does them poorly:

1. **Refuse to accept "done" without evidence.** Every plan's verification (`tsc` zero output,
   0 failures, blast-radius greps) is theatre if the main thread rubber-stamps a subagent's report.
   This is the primary failure mode of the whole run.
2. **Adjudicate the stop-and-report gates.** Four of them (see below). Each needs the distinction
   between *"this is the documented fallback"* and *"this invalidates the spec's premise"*.
3. **Hold coherence across specs.** Example: the Spec 6 pilot must not become the `BottomSheet`
   default however well it works — a subagent, seeing only its own slice, will reasonably suggest it.
4. **Do the reconciliation tasks itself** — see the rule below.

---

## The rule that overrides the table: main reconciles

**Every plan's final "Reconcile" task stays on the main thread. Do not delegate it.**

A subagent only knows its own slice; reconciliation is precisely the act of recording what
*actually* happened across all of them, including what went sideways. Delegated, it degrades into
ticking boxes and writing "all done ✅" — which is exactly the drift that made the pre-existing docs
lie ([`CONVENTIONS.md`](CONVENTIONS.md) §5, and the `<QueryBoundary>`-landed-in-Terreiros deviation
that went unrecorded for two months).

---

## Assignment criteria

| Model | Use when | Why |
|---|---|---|
| **Haiku** | Single-file mechanical edit, no design decision, and being wrong is caught by `tsc`/tests | Cheap, fast, and the blast radius is bounded by a compiler |
| **Sonnet** | Multi-file edits, tests following an explicit pattern, judgment fully bounded by the plan | Default. Most tasks live here |
| **Opus** | (a) TDD where the test must fail *for the right reason* first; (b) stop-and-report gates with multiple outcomes; (c) anything where "looks done" ≠ "is done"; (d) verifying an assumption against reality | These are where a weaker model produces a confident, wrong, plausible-looking result |

**The (a) case deserves emphasis.** In a red-green task, a subagent that writes a test which passes
immediately, then reports "implemented and tests green", has silently destroyed the task's value —
and everything downstream looks fine. Several tasks below hinge on this.

---

## Spec 3 — Auth state leaks

| Task | Model | Reasoning |
|---|---|---|
| 1. Baseline + consumer inventory | **Sonnet** | Mostly mechanical, but Step 2 asks a real question: does any `useTerreiroMembershipStatus` consumer read `role` for something *other* than current-user permissions? A "no" that wasn't actually checked would make the `userId` gate wrong for that consumer |
| 2. Gate derivation on `userId` (TDD) | **Opus** | The load-bearing test must reproduce a leak that only appears with **cached data present and `userId` null**. A naive "render logged out, assert null" passes without the fix and proves nothing. This is the (a) case exactly |
| 3. `useTerreiroRole` consumer assertion | **Sonnet** | One test case following the pattern Task 2 established |
| 4. `ProfileSection` signed-out branch | **Sonnet** | Real UI composition, plus the hook-order constraint (early return must sit below all hooks) |
| 5. `LogoutSection` → `null` when `!user` | **Haiku** | Genuinely trivial; `tsc` catches any mistake |
| 6. Guard "Sair" in `TabsHeaderWithPreferences` | **Sonnet** | The edit is trivial but Step 2 asks it to scan a 3,164-line file for *other* unguarded account affordances and log anything found. Haiku would do the edit and skip the scan |
| 7. Reconcile | **Main (Opus)** | See rule above |

---

## Spec 4 — Failure presentation

| Task | Model | Reasoning |
|---|---|---|
| 1. Baseline + duplication inventory | **Haiku** | Two greps and a count |
| 2. Network branch in `getErrorMessage` (TDD) | **Opus** | Matcher design is a precision problem: broad enough for re-wrapped messages, narrow enough that the decoy test (an app error mentioning "network") still passes through. Plus the constraint that all 7 pre-existing tests pass **unmodified** — a weaker model "fixes" a failing old test instead of recognising its change wasn't additive |
| 3. `usePontosSearch` swap | **Haiku** | One-line change plus an import |
| 4. `AddMediumTagSheet` local copy | **Haiku** | Delete a function, add an import |
| 5. `Terreiros` guard + extract helper + tests | **Sonnet** | Bounded by the plan, which supplies the helper's shape. Needs care that the "error with rows → null" test actually fails first |
| 6. Reconcile | **Main (Opus)** | See rule above |

---

## Spec 5 — Add-to-collection write path

| Task | Model | Reasoning |
|---|---|---|
| 1. Baseline + read the flow end to end | **Sonnet** | Must confirm the spec's premise (that `alreadyExists` handling in `AddToCollectionFlow` is already correct and merely unreachable) and **contradict it if false** — a subagent that skims and agrees is worse than useless here |
| 2. `D6` fix + **DB verification gate** | **Opus** | The hardest task in the run. Must write a mock modelling `ON CONFLICT DO NOTHING` (no error, no rows — easy to get subtly wrong), then **stop before implementing** to verify real database behavior, then pick among three documented outcomes including "no DB reachable → implement but leave the DoD box unticked and say so". Reporting an unverified assumption as verified is the exact failure this task is built to prevent |
| 3. Flow-level duplicate test | **Sonnet** | Bounded; includes an honest escape hatch (assert the user-visible half, say so) that needs judgment not to abuse |
| 4. `D9` ungate + rename | **Sonnet** | Edits are mechanical and `tsc` catches the rename, but it spans a 1,220-line file and must preserve `requireAuth` — dropping it would reintroduce the Spec 3 bug class |
| 5. Reconcile | **Main (Opus)** | See rule above — and this one must record *which* of the three DB outcomes happened |

---

## Spec 6 — Keyboard avoidance (pilot)

> ⚠️ **This plan has a defect — fix it before running.** See the note below the table.

| Task | Model | Reasoning |
|---|---|---|
| 1. Baseline + filler inventory | **Haiku** | Two greps; the counts feed Task 6's blast-radius check |
| 2. Install + **native build gate** | **Opus** | `npx expo install` (not bare `npm install` — same class as the `jest-expo` drift), then a real Android build under New Architecture, then a stop-and-report decision. Three named anti-patterns to refuse: disabling New Arch, unilateral downgrade, falling back to `KeyboardAvoidingView` |
| 3. Provider + inertness check | **Opus** | Provider placement must come from docs, not guesswork — **and see the defect note** |
| 4. `BottomSheet` opt-in prop (TDD) | **Opus** | The default-off render test is what guarantees 7 untouched sheets. A subagent that writes only the opt-in test leaves the pilot's core safety property unverified. Also the highest-consequence file in the run: 8 consumers |
| 5. Adopt on pilot screen + delete filler | **Sonnet** | Mechanical, but must delete from **exactly one** file while eight identical patterns sit next to it — precisely the situation where a helpful agent tidies up the rest |
| 6. Reconcile | **Main (Opus)** | See rule above — and must capture any gesture conflict, the most valuable thing the pilot can produce for Spec 7 |

### ⚠️ Defect in Plan 6 — fix before running

**Task 3 Step 4 and Task 5 Step 4 tell the agent to launch the app and look at it.** That violates
[`CONVENTIONS.md`](CONVENTIONS.md) §4 (no dev-client steps in plans) — the same unreachable-gate
mistake that stalled Spec 2a for two months, reintroduced by me while writing the plan meant to
avoid it.

An agent can legitimately verify:
- the build completes (exit code);
- the app launches without crashing (`adb logcat` for a fatal on startup).

An agent **cannot** verify that layout didn't shift or that a field sits above the keyboard.

**Fix:** split those steps into an agent half (build + no-crash) and a human half appended to the
queue. Until that edit lands, either instruct the agent to skip the visual sub-step explicitly, or
expect a fabricated checkmark — which is worse than a missing one.

---

## Sequencing

Dependency-ordered; **only Spec 6 is truly independent** and can run in parallel with 3/4/5 if
desired (different files, different concerns — though it needs a device for its build gate).

```
Spec 3  →  Spec 4  →  Spec 5        Spec 6 (independent)
                                         ↓
                                    human validation
                                         ↓
                                    Spec 7 (blocked)
```

Within a plan, tasks are strictly sequential — several encode ordering as a correctness property
(Spec 4's `D10`-before-adoption; Spec 5's `D6`-before-`D9`).

## Subagent types

Prefer `general-purpose` for anything with a verification step, since it has full tool access.
`caveman:cavecrew-builder` suits the Haiku-tier single-file edits but hard-refuses 3+ file scope —
do not hand it Task 4 of Spec 6.

Give every subagent: the plan path, its task number, the working directory, and an explicit
instruction to **paste real command output** rather than assert success
([`CONVENTIONS.md`](CONVENTIONS.md) §3).
