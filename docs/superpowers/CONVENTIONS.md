# Spec & Plan Conventions — saravafy-mobile-app

**Date:** 2026-08-08
**Status:** binding for all specs and plans written after this date.

Derived from a review of Spec 1, Spec 2a, and Spec 2b and their execution outcomes.
Each rule below exists because its absence caused a concrete failure — the failure is cited.

---

## 1. Every spec has a plan

A spec states *what* and *why*. A plan states *how*, task by task, with a commit per task.

**Never execute a spec without its plan.**

> **Why:** Spec 1 and Spec 2b had plans and landed complete. Spec 2a had no plan and stalled
> half-implemented for ~2 months with a broken `tsc` baseline (`AddToCollectionFlow.tsx` created,
> `PlayerScreen.tsx` import swapped but JSX not updated, `Home.tsx` never touched, old files
> never deleted). Without per-task commit gates there is no partial-progress ratchet.

---

## 2. Commands are written for this environment

- Working directory is **Windows**: `C:\saravafy\saravafy-mobile-app`.
- Shell is PowerShell (primary) or Git Bash. Write commands that run as-is.
- **Never write WSL paths** (`/mnt/c/...`).

> **Why:** Spec 1 and Spec 2b plans used `/mnt/c/saravafy/...` in essentially every `Run:` step.
> Not one was executable as written; every step required silent translation by the executor.

---

## 3. Verification is exact, never a proxy

| Don't | Do |
|---|---|
| `npx tsc --noEmit 2>&1 \| wc -l` then compare the number | `npx tsc --noEmit` must produce **zero** output |
| "Expected: PASS — 23 tests passed" | "Expected: **0 failures**" (never assert a total count) |
| "no new errors in <file>" via grep | full-project `tsc` clean |

> **Why (line counting):** a new error replacing an old one leaves the count identical. The check
> passes while the codebase regresses.
>
> **Why (hardcoded totals):** Spec 1's plan asserts 23 tests and Spec 2b's asserts 28. Both break
> the moment any test is added, producing a false failure that trains the executor to ignore the gate.

---

## 4. Agent DoD and human DoD are separate gates

Every plan splits its Definition of Done in two:

**Agent DoD** — must be fully satisfiable by an agent with no device and no running app:
- `npx tsc --noEmit` clean
- test suite green (0 failures)
- required greps return the expected result
- all commits landed

**Human DoD** — anything requiring eyes on a running app.
These do **not** appear as inline steps in the plan. They are appended to
[`HUMAN-VALIDATION-QUEUE.md`](HUMAN-VALIDATION-QUEUE.md) and validated in one batched pass.

**An agent closes a task on Agent DoD alone.** A pending human check never blocks a commit.

> **Why:** Spec 1's plan embeds `npm run start:dev` + manual dev-client walkthroughs as blocking
> steps in Tasks 8, 9, 10, and 11; Spec 2b's plan does the same in Task 9. The plans are explicitly
> addressed to agentic workers ("REQUIRED SUB-SKILL: superpowers:subagent-driven-development"),
> and an agent cannot drive a simulator. Every such step is an unreachable gate — the executor
> either stalls there or silently skips it and the checklist stops meaning anything.

---

## 5. The last task of every plan is reconciliation

Before the final commit, the executor must:

1. Tick every `- [x]` checkbox actually completed.
2. Record any deviation from the plan **in the plan**, inline, marked `> **DEVIATION:**`.
3. Correct the spec if reality diverged from what it described.
4. Append pending human checks to `HUMAN-VALIDATION-QUEUE.md`.
5. Move anything deliberately deferred into [`BACKLOG.md`](BACKLOG.md).

> **Why:** Spec 1's plan directs `<QueryBoundary>` adoption at `Home.tsx` (Task 10). It actually
> landed in `Terreiros` (commit `36a04c6`). Neither the plan nor the spec's §3.4 adoption table
> records this. Both plans still show 100% unticked `- [ ]` boxes despite being fully executed and
> merged — they are unusable as history. Separately, `aggregation.md` §6.13 asserted
> `fetchTerreirosQueAdministro` was dead code with no consumer; Spec 2b found and migrated three.
> That correction was never written back, so the doc still misleads the next reader.

---

## 6. A doc that describes code must be corrected when it is wrong

Findings are diagnostic, not gospel. When implementation disproves a documented finding,
**edit the source doc in the same commit**. Mark it, don't delete it — a corrected finding
teaches more than a vanished one:

```markdown
| ~~7. Memoize `pontoIds`~~ | ❌ **FALSE POSITIVE** — already memoized. See Spec 1 §2.3. |
```

> **Why:** `code-quality-audit.md` §4 listed waves 7 and 8 as pending work. Spec 1 §2.3 had already
> proven both were false positives (`pontoIds` memoized at `Collection.tsx:295` /
> `PlayerScreen.tsx:222`; `goToPontosTab` and `showToast` already `useCallback`'d). The audit table
> was never updated, so anyone working the waves in order would have burned two no-op waves.

---

## 7. Tests encode the spec, not the implementation

- Write the test from the spec's stated contract, before the implementation exists.
- If the test fails, **fix the implementation** — never loosen the assertion.
- If the spec's contract is wrong, change the spec first, then the test, then the code.
- A test's name must match its assertion.

> **Why:** Spec 1 §3.2 specifies `getErrorMessage` returns the **trimmed** message. The shipped
> implementation returns it untrimmed, and the test at Plan 1 Task 2 is titled
> `"trims and returns object.message"` while asserting `.toBe("  hello  ")` — untrimmed. The test
> was written to ratify the implementation the author already had in mind, which is the exact
> failure mode TDD exists to prevent. Tracked for repair in `BACKLOG.md`.

---

## 8. Deferred scope goes to the backlog, never to a named future spec

Do not write "deferred to Spec 3" unless Spec 3 exists. Write it into
[`BACKLOG.md`](BACKLOG.md) with enough context to become a spec later.

> **Why:** Specs 2c, 3, and 4 are referenced across three documents and none of them exist. Every
> such reference is scope that looks tracked and is not.

---

## 9. Escape hatches need a destination

`DONE_WITH_CONCERNS` and equivalents are allowed, but the plan must state where the concern lands.
Default destination: a new row in `BACKLOG.md`, added before the task's commit.

> **Why:** Spec 2b's plan (Task 8 Step 3) permits marking a step `DONE_WITH_CONCERNS` and never
> says where the concern is recorded. A concern with no destination is a dropped concern.

---

## 10. Verbatim ports stay verbatim

When porting survival logic (RLS fallbacks, schema-tolerance retries, error recovery):
read it in full first, port it without "improvement", and note explicitly that it was ported
unchanged. Optimize in a separate, later spec if at all.

> **Why:** this one was done right. Spec 2b's plan Task 1 is a read-only snapshot task before the
> port, and its non-goals forbid optimizing the query. Keep doing this.

---

## 11. Cache keys are a closed contract

Every React Query key comes from `src/queries/queryKeys.ts`. No inline literal key arrays.

> **Why:** `aggregation.md` §6.2 catalogued four ad-hoc keys outside the registry. During the
> in-flight Spec 2a refactor a **fifth** was introduced —
> `["pontos", "versoesBatch", "addToCollectionFlow", ponto.id]` in `AddToCollectionFlow.tsx:232` —
> reproducing the exact defect the refactor was meant to consolidate away. Deduplication without a
> key contract relocates the bug rather than removing it.
