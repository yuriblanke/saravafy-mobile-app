# Spec 4 — Failure presentation: Implementation Plan

> **For agentic workers:** use `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`. Steps use `- [ ]` checkboxes.
> **Read [`CONVENTIONS.md`](../CONVENTIONS.md) first** — §3 (exact verification), §4 (human checks
> are queued, never blocking), §5 (reconciliation is the final task), §7 (tests encode the spec,
> not the implementation).

**Goal:** failures speak plain Portuguese, and never discard content already on screen.

**Spec source:** [`../specs/2026-08-09-spec-4-failure-presentation.md`](../specs/2026-08-09-spec-4-failure-presentation.md)

**Working directory:** `C:\saravafy\saravafy-mobile-app` (Windows; PowerShell or Git Bash).

**Order is load-bearing:** `D10` (the shared utility) lands first. Tasks 3-5 route call sites onto
it. Doing it the other way round would spread `TypeError: Network request failed` to more screens
while looking like consolidation.

**Test command:** `npm test`, or `node node_modules/jest/bin/jest.js` if `jest` doesn't resolve on
PATH. The gate is **0 failures** — never a specific total.

---

## File Structure

| File | Type | Responsibility |
|---|---|---|
| `src/lib/errors.ts` | edit | Network branch + exported `isNetworkError` |
| `src/lib/errors.test.ts` | edit | New cases; **existing 7 stay untouched** |
| `src/hooks/usePontosSearch.ts` | edit | Use shared util (`D7`) |
| `src/components/AddMediumTagSheet.tsx` | edit | Delete local copy, import shared |
| `src/screens/Terreiros/Terreiros.tsx` | edit | `error` guard + message source (`D11`) |

---

## Task 1: Baseline

- [x] **Step 1: Confirm a clean starting point**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
```

Expected: **zero `tsc` output**, **0 failures**. If either fails first, stop and report.

- [x] **Step 2: Inventory the duplication you are NOT fixing**

```
grep -rn "function getErrorMessage" src/
```

Record the count. Spec §2.2 scopes out the bulk sweep (`S-3a`) — only `AddMediumTagSheet` is in
scope here, because it produced an observed bug. Anything else you find stays listed for `S-3a`;
do not opportunistically sweep it.

> **Result:** 12 definitions in `src/` — 1 canonical (`src/lib/errors.ts:1`) plus **11 local
> copies**. Task 4 removed one, so **10 remain for `S-3a`**.
>
> **Finding worth carrying into `S-3a`:** the copy in
> `src/screens/CollectionAddToCollection/addToCollectionModel.ts:107` is **exported**, not
> file-local. The sweep must check its importers before deleting it, rather than assuming every copy
> is private to its file.

(No commit — read-only.)

---

## Task 2: Network branch in `getErrorMessage` (D10) — TDD

**Files:** `src/lib/errors.ts`, `src/lib/errors.test.ts`

- [x] **Step 1: Write the failing tests first**

Add to `src/lib/errors.test.ts`. **Do not modify the 7 existing tests** — this change is additive,
and if an existing test needs edits, the implementation is wrong (see Step 4).

```ts
describe("getErrorMessage — network failures", () => {
  const FRIENDLY = "Sem conexão. Verifique sua internet e tente novamente.";

  it("normalizes React Native's fetch failure", () => {
    expect(getErrorMessage(new TypeError("Network request failed"))).toBe(FRIENDLY);
  });

  it("matches case-insensitively", () => {
    expect(getErrorMessage(new Error("network request failed"))).toBe(FRIENDLY);
  });

  it("matches when a layer re-wraps the message", () => {
    expect(getErrorMessage(new Error("FetchError: Network request failed"))).toBe(FRIENDLY);
  });

  it("matches the Failed to fetch phrasing", () => {
    expect(getErrorMessage(new Error("Failed to fetch"))).toBe(FRIENDLY);
  });

  // Decoy — this is the test that keeps the matcher honest.
  it("does NOT swallow an application error that merely mentions networks", () => {
    const e = new Error("Erro ao carregar network settings do terreiro");
    expect(getErrorMessage(e)).toBe("Erro ao carregar network settings do terreiro");
  });
});

describe("isNetworkError", () => {
  it("is true for fetch failures", () => {
    expect(isNetworkError(new TypeError("Network request failed"))).toBe(true);
  });
  it("is false for application errors", () => {
    expect(isNetworkError(new Error("Coleção não encontrada"))).toBe(false);
  });
  it("is false for null/undefined/strings", () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
    expect(isNetworkError("boom")).toBe(false);
  });
});
```

- [x] **Step 2: Run and watch them fail**

```
node node_modules/jest/bin/jest.js --testPathPattern=lib/errors
```

Expected: the new network cases fail; the **decoy passes already** (it describes current
behavior we must preserve); `isNetworkError` fails to import.

- [x] **Step 3: Implement**

In `src/lib/errors.ts`, add the predicate and consult it **before** any raw-message return:

```ts
const NETWORK_MESSAGE =
  "Sem conexão. Verifique sua internet e tente novamente.";

export function isNetworkError(e: unknown): boolean {
  const raw =
    e instanceof Error
      ? e.message
      : e && typeof e === "object" && typeof (e as { message?: unknown }).message === "string"
        ? ((e as { message: string }).message)
        : "";

  const hay = raw.toLowerCase();
  return hay.includes("network request failed") || hay.includes("failed to fetch");
}
```

Then, as the first branch of `getErrorMessage`:

```ts
if (isNetworkError(e)) return NETWORK_MESSAGE;
```

Match on the **specific phrasings only** — never the bare word "network", which is what the decoy
test exists to enforce.

> **KNOWN GAP, deliberately not fixed here — decision needed before `S-3a`.** The extraction above
> reads `.message` off `Error`s and message-bearing objects only. A **bare string**
> `"Network request failed"` therefore does *not* match: `isNetworkError` returns `false`, and the
> string falls through to `getErrorMessage`'s own untouched `typeof e === "string"` branch and is
> returned verbatim — the exact raw-string leak this task exists to prevent.
>
> This is the code the plan prescribes, and the plan's own test asserts `isNetworkError("boom")`
> is `false`, so it was implemented as written rather than widened unilaterally. A review grep found
> **no call site in `src/` that stringifies before calling**, so there is no live bug today.
>
> It matters because `S-3a` is about to route 10 remaining local copies onto this utility, and some
> may pass `String(e)`. Widening the extraction with a `typeof e === "string" ? e : …` arm would not
> break the existing assertion (`"boom"` still returns `false`). Logged as `X13` in
> [`../BACKLOG.md`](../BACKLOG.md), blocking `S-3a`, for a human to decide.

Leave every other branch byte-identical. `X1`/`X2` (the trim contract and the dead branch) are
adjacent but out of scope — do not "clean them up in passing".

- [x] **Step 4: Verify**

```
node node_modules/jest/bin/jest.js --testPathPattern=lib/errors
npx tsc --noEmit
```

Expected: **0 failures**, **zero output**.

**If any of the 7 pre-existing tests now fails, do not edit that test.** It means the change was not
additive — a non-network input changed its result. Fix the implementation.

- [x] **Step 5: Commit**

```
git add src/lib/errors.ts src/lib/errors.test.ts
git commit -m "feat: getErrorMessage speaks plainly when the network is down

The shared utility had no branch for connectivity failures, so it passed
React Native's raw \"TypeError: Network request failed\" straight to the
UI. Observed twice under airplane mode in one validation pass: Home
search and the médium-tag toast.

This had to land before adopting the utility more widely - routing more
call sites onto it first would have spread the raw string while looking
like consolidation.

Matching is deliberately narrow (the two known phrasings, not the word
\"network\"), with a decoy test asserting an application error that
mentions networks still passes through untouched. Exports isNetworkError
so call sites can branch on connectivity without re-implementing the
match. All 7 pre-existing branch tests pass unmodified.

Backlog D10. Unblocks S-3a."
```

---

## Task 3: Home search uses the shared utility (D7)

**File:** `src/hooks/usePontosSearch.ts` (~line 73)

- [x] **Step 1: Replace the inline extraction**

```ts
// before
const message = e instanceof Error ? e.message : String(e);
// after
const message = getErrorMessage(e);
```

Add the import from `@/src/lib/errors`. Change nothing else in the hook — the debounce, the
stale-response guards (`if (currentQuery !== query) return;`) and the state shape all stay.

- [x] **Step 2: Verify**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
```

Expected: **zero output**, **0 failures**.

- [x] **Step 3: Commit**

```
git add src/hooks/usePontosSearch.ts
git commit -m "fix: Home search shows a readable message when offline

usePontosSearch extracted e.message inline and never used the shared
getErrorMessage, so a search under airplane mode rendered
\"TypeError: Network request failed\" verbatim in the results area.

Backlog D7."
```

---

## Task 4: Remove the `AddMediumTagSheet` local copy

**File:** `src/components/AddMediumTagSheet.tsx` (~line 62)

- [x] **Step 1: Swap the local implementation for the shared one**

Delete the local `getErrorMessage` (~lines 62-75) and import from `@/src/lib/errors`. The call site
(~line 260, `showToast(getErrorMessage(e))`) needs no change.

- [x] **Step 2: Confirm nothing else in the file relied on the local copy's exact behavior**

```
grep -n "getErrorMessage" src/components/AddMediumTagSheet.tsx
```

The local copy and the shared one had identical logic before Task 2, so the only behavioral
difference is the new network branch — which is the point.

- [x] **Step 3: Verify**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
```

Expected: **zero output**, **0 failures**.

- [x] **Step 4: Commit**

```
git add src/components/AddMediumTagSheet.tsx
git commit -m "fix: médium-tag toast uses the shared error utility

This is the call site that produced the reported offline toast, and it
carried its own near-identical copy of getErrorMessage - so fixing the
shared utility alone would not have reached it.

Included here rather than in the S-3a sweep because it maps to an
observed bug; the remaining copies stay with S-3a.

Backlog D10 (call site 2 of 2)."
```

---

## Task 5: A failed refetch must not hide loaded content (D11)

**File:** `src/screens/Terreiros/Terreiros.tsx` (~lines 430-433)

This is the defect closest to the original motivation for this whole effort: `<QueryBoundary>` was
built to prevent exactly this, and one of its two adoption sites defeats it from outside.

- [x] **Step 1: Extract the derivation so it can be tested**

The guard is two lines inside a large component. Extract a pure helper — in the same file or a
small sibling module — so the defect gets real coverage rather than being verified by eye:

> **DEVIATION:** the helper landed in a **sibling module**,
> `src/screens/Terreiros/deriveListErrorMessage.ts`, and in-file placement is not merely a style
> preference here — it does not work. Importing anything from `Terreiros.tsx` in a test pulls
> `AuthContext → lib/supabase → AsyncStorage`, which throws `NativeModule: AsyncStorage is null`
> under Jest before a single assertion runs (there is no global AsyncStorage mock in
> `jest.setup.ts`). Independently verified during review by walking that import chain. Worth
> remembering: **any future attempt to unit-test a helper living inside a screen component hits the
> same wall.**

```ts
export function deriveListErrorMessage(params: {
  isError: boolean;
  error: unknown;
  rowCount: number;
}): string | null {
  if (!params.isError) return null;
  if (params.rowCount > 0) return null; // never hide content we already have
  return getErrorMessage(params.error, "Ops, seu app parece estar desatualizado.");
}
```

Two fixes in one place, both from spec §3.3: the `rowCount` guard (mirroring `isLoading`'s existing
one), and sourcing the text from `getErrorMessage` so Task 2's network branch applies — keeping the
current copy only as the `fallback`.

- [x] **Step 2: Use it in the component**

```ts
const isLoading = terreirosQuery.isFetching && terreiros.length === 0; // unchanged
const error = deriveListErrorMessage({
  isError: terreirosQuery.isError,
  error: terreirosQuery.error,
  rowCount: terreiros.length,
});
```

Leave the `<QueryBoundary>` JSX (~line 523) and its retry button alone — with `error` correct, the
existing `data: error || isLoading ? undefined : filteredTerreiros` expression now behaves as Spec 1
intended.

- [x] **Step 3: Test the helper**

Create the test file next to wherever the helper landed:

- not error → `null`
- error, 0 rows → the friendly/fallback message (cold failure still surfaces)
- **error, rows present → `null`** ← the actual `D11` regression
- error, 0 rows, network error → the `D10` network string, not the "desatualizado" fallback

- [x] **Step 4: Verify**

```
node node_modules/jest/bin/jest.js
npx tsc --noEmit
```

Expected: **0 failures**, **zero output**.

- [x] **Step 5: Queue the human check — do not run it here**

Append to [`../HUMAN-VALIDATION-QUEUE.md`](../HUMAN-VALIDATION-QUEUE.md) §4, replacing the
"não existe puxar pra atualizar" note with a reproducible recipe that doesn't need the gesture:
load the Terreiros tab, wait past the 30s `staleTime`, enable airplane mode, then trigger a refetch
(revisit the tab or tap the boundary's retry) → **the list must stay on screen**. Plus the cold
case: no cache + no connection → the error card still appears.

**Commit regardless** — [`CONVENTIONS.md`](../CONVENTIONS.md) §4.

- [x] **Step 6: Commit**

```
git add src/screens/Terreiros/
git commit -m "fix: a failed background refetch no longer hides the terreiros list

isLoading already guarded against hiding cached rows during a refetch;
error had no equivalent guard, so any background failure zeroed the data
passed to QueryBoundary and covered an already-rendered list with a
full error card. That is precisely the flicker QueryBoundary exists to
prevent (Spec 1 §3.3), defeated by how this call site builds its input
rather than by the component.

Extracted the derivation into a pure helper so the regression is covered
by a test instead of by eye, and sourced the message from
getErrorMessage so a connectivity failure reads as one - the previous
copy (\"seu app parece estar desatualizado\") is now only the fallback.

Backlog D11."
```

---

## Task 6: Reconcile ([`CONVENTIONS.md`](../CONVENTIONS.md) §5)

- [x] **Step 1: Final verification**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
```

Expected: **zero output**, **0 failures**.

- [x] **Step 2: Confirm no hand-rolled network handling survives**

```
grep -rn "Network request failed" src/
```

Expected: matches only in `src/lib/errors.ts` and its test file.

> **Result — the expectation was slightly wrong, the outcome is right.** Five matches, none of them
> hand-rolled handling:
> - `src/lib/errors.test.ts` ×3 — the matcher's own tests.
> - `src/screens/Terreiros/deriveListErrorMessage.test.ts:30` — Task 5's network case, which
>   deliberately constructs a real `TypeError` (a bare string would not match — see the known gap
>   noted at Task 2 Step 3).
> - `src/screens/TerreiroEditor/TerreiroEditor.tsx:295` — a **comment**, not handling: it documents
>   why cover upload reads bytes via `FileSystem` instead of `fetch(file://…).blob()`, which fails
>   with that string on Android/Expo. Correct as it stands; left alone.
>
> The string no longer appears in any code path that could render it to a user.

- [x] **Step 3: Tick this plan and record deviations**

Mark completed steps `- [x]`. Add inline `> **DEVIATION:**` notes for anything that differed —
especially if the helper in Task 5 landed somewhere other than planned, or if the matcher needed a
third phrasing.

- [x] **Step 4: Update the backlog**

Mark `D7`, `D10`, `D11` resolved with commit refs. **Annotate `S-3a` as unblocked** — note that the
shared utility now handles connectivity, so sweeping the remaining copies is safe and no longer
spreads a defect. Record the remaining copy count from Task 1 Step 2.

- [x] **Step 5: Update the spec's Agent DoD**

Tick §8 in
[`../specs/2026-08-09-spec-4-failure-presentation.md`](../specs/2026-08-09-spec-4-failure-presentation.md)
and add the completion date.

- [x] **Step 6: Commit**

```
git add docs/
git commit -m "docs: reconcile Spec 4 — failure presentation resolved

D7, D10, D11 fixed. S-3a annotated as unblocked: the shared utility now
handles connectivity, so sweeping the remaining local copies no longer
spreads the raw-message defect. Human validation queued, not run
(CONVENTIONS.md §4)."
```

---

## Implementation notes

**Tasks:** 6 (Task 1 read-only). **Commits:** 5.

**If a step fails:**
- A pre-existing `errors.test.ts` case fails after Task 2 → the change wasn't additive. Fix the
  implementation, never the test ([`CONVENTIONS.md`](../CONVENTIONS.md) §7).
- The decoy test fails → the matcher is too broad. Narrow it to the exact phrasings; do not delete
  the decoy.
- Task 5's "error with rows → null" test passes before the fix → it isn't reproducing `D11`.
  Confirm it exercises `isError: true` **with** `rowCount > 0`.

**Out of scope reminders:** the `S-3a` bulk sweep, `X1`/`X2` in `errors.ts`, `<QueryBoundary>`'s own
logic, and anything connectivity-UI-shaped (offline work is deferred as `S-5`).
