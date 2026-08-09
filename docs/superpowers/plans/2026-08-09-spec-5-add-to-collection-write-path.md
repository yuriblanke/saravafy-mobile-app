# Spec 5 — Add-to-collection write path: Implementation Plan

> **For agentic workers:** use `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`. Steps use `- [ ]` checkboxes.
> **Read [`CONVENTIONS.md`](../CONVENTIONS.md) first** — §3 (exact verification), §4 (human checks
> queued, never blocking), §5 (reconciliation is the final task), §7 (tests encode the spec, not
> the implementation).

**Goal:** adding a ponto to a collection tells the truth, and is reachable from both player modes.

**Spec source:** [`../specs/2026-08-09-spec-5-add-to-collection-write-path.md`](../specs/2026-08-09-spec-5-add-to-collection-write-path.md)

**Working directory:** `C:\saravafy\saravafy-mobile-app` (Windows; PowerShell or Git Bash).

**Order matters:** `D6` (truthful duplicate detection) lands before `D9` (new entry point), so the
new surface doesn't ship the silent-lie behavior to a context that never had it.

**Test command:** `npm test`, or `node node_modules/jest/bin/jest.js` if `jest` doesn't resolve on
PATH. The gate is **0 failures** — never a specific total.

---

## File Structure

| File | Type | Responsibility |
|---|---|---|
| `src/screens/Home/data/collections_pontos.ts` | edit | Detect duplicates from the write result (`D6`) |
| `src/screens/Home/data/collections_pontos.test.ts` | create | Four branch tests |
| `src/screens/Player/PlayerScreen.tsx` | edit | Ungate the add flow (`D9`) |
| `src/features/addToCollection/AddToCollectionFlow.test.tsx` | edit | Duplicate-path assertion |

---

## Task 1: Baseline and read the flow end to end

- [ ] **Step 1: Confirm a clean starting point**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
```

Expected: **zero `tsc` output**, **0 failures**.

- [ ] **Step 2: Read the whole path before changing any of it**

Read, in order:
1. `src/screens/Home/data/collections_pontos.ts` — the retry loop (~137-184).
2. `src/features/addToCollection/AddToCollectionFlow.tsx` — `addMutation`'s `onMutate`,
   `onSuccess`, `onError`, `onSettled` (~376-535) and `runAdd` (~537-568).

Confirm for yourself what spec §2.3 asserts: **the `alreadyExists` handling in `onSuccess` is
already complete and correct** — it removes the optimistic insert and decrements the count. `D6` is
purely a detection failure one layer below. If that turns out to be wrong, stop: the spec's scope is
wrong and needs revising before code changes.

(No commit — read-only.)

---

## Task 2: Detect duplicates from the write result (D6) — TDD

**Files:** `src/screens/Home/data/collections_pontos.ts`, `src/screens/Home/data/collections_pontos.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `src/screens/Home/data/collections_pontos.test.ts` with a mocked Supabase chain. The mock
must support `.from().upsert().select()` and the `fetchNextPosition` read the loop performs.

Cover exactly the four contract branches from spec §6:

```ts
it("reports a plain success when a row was actually inserted", /* upsert → data: [{ponto_id}] */);
it("reports alreadyExists when the insert was ignored", /* upsert → data: [] */);
it("retries when the position unique constraint collides", /* 23505 + position → then success */);
it("surfaces a real error unchanged", /* non-unique error → { ok: false, error } */);
```

**Do not weaken these assertions to match whatever the mock returns**
([`CONVENTIONS.md`](../CONVENTIONS.md) §7). They encode spec §3.1. If the real database disagrees
with the mock, Step 3's verification catches it and the spec's documented fallback applies — the
test is not what bends.

- [ ] **Step 2: Run and watch the duplicate test fail**

```
node node_modules/jest/bin/jest.js --testPathPattern=collections_pontos
```

Expected: the `alreadyExists` test **fails**, reporting a plain `{ ok: true }`. That failure is the
bug reproduced. If it passes, the mock isn't modelling `ON CONFLICT DO NOTHING` — fix the mock
first.

- [ ] **Step 3: Verify the real database behavior before implementing**

Spec §3.1 requires this — the fix rests on an assumption about what `ON CONFLICT DO NOTHING` returns
through PostgREST, and client typings do not answer it.

Use the Supabase MCP tools (or any available direct query path) against a scratch collection to
confirm: **an upsert with `ignoreDuplicates: true` and `.select()` returns an empty array when the
row already exists, and one row when it inserts.**

- If confirmed → proceed to Step 4.
- If **not** confirmed → stop, record the actual behavior as a `> **DEVIATION:**` note in this plan,
  and implement spec §3.1's documented fallback instead (a pre-check `select` before the insert,
  accepting the extra round-trip and a benign race, since the insert stays idempotent either way).
- If you cannot reach a database at all → say so plainly, implement the primary approach, and mark
  the Agent DoD item as **unverified** rather than ticking it. Do not claim verification you did not
  perform.

- [ ] **Step 4: Implement**

In the retry loop, add `.select("ponto_id")` to the upsert and branch on the returned row count:

```ts
const res = await supabase
  .from(TABLE)
  .upsert(payload as any, {
    onConflict: "collection_id,ponto_id",
    ignoreDuplicates: true as any,
  } as any)
  .select("ponto_id");

if (!res.error) {
  const inserted = Array.isArray(res.data) ? res.data.length : 0;
  return inserted > 0 ? { ok: true } : { ok: true, alreadyExists: true };
}
```

**Keep `ignoreDuplicates: true`.** Spec §2.3 explains why: flipping it to `false` would make a
duplicate add overwrite `position`, `added_by`, `ponto_versao_id` and the entidade fields of an
existing row — silently reordering a shared terreiro collection. That is worse than the bug.

**Keep the `23505` branches below.** They still serve the position-retry, and the PK branch is
now defense-in-depth. Add a short comment saying the PK branch is no longer the primary duplicate
path, so a future reader doesn't mistake it for dead code and delete it.

- [ ] **Step 5: Verify**

```
node node_modules/jest/bin/jest.js --testPathPattern=collections_pontos
npx tsc --noEmit
```

Expected: **0 failures**, **zero output**.

- [ ] **Step 6: Commit**

```
git add src/screens/Home/data/collections_pontos.ts src/screens/Home/data/collections_pontos.test.ts
git commit -m "fix: adding a duplicate ponto reports the truth

The insert upserts with ignoreDuplicates: true, so Postgres does
ON CONFLICT DO NOTHING and never raises the 23505 the code branched on -
making the alreadyExists path unreachable. A duplicate add therefore
returned plain success: the UI toasted \"Ponto adicionado à coleção\" and
applied its optimistic insert while the database had done nothing,
leaving cache and DB disagreeing until the next invalidation.

Detects from the write result instead (.select() returns no row for an
ignored insert). Deliberately keeps ignoreDuplicates: true - flipping it
to false would make a duplicate add overwrite position, added_by and the
entidade fields of the existing row, silently reordering a shared
terreiro collection, which is worse than the bug being fixed.

The alreadyExists handling in AddToCollectionFlow was already correct and
simply unreachable; no UI change was needed.

Backlog D6."
```

---

## Task 3: Cover the duplicate path at the flow level (D6)

**File:** `src/features/addToCollection/AddToCollectionFlow.test.tsx`

- [ ] **Step 1: Add the assertion**

With a mocked `addPontoToCollection` returning `{ ok: true, alreadyExists: true }`, assert the flow
surfaces the duplicate message and does **not** leave the ponto optimistically inserted.

If the existing test harness makes cache-state assertions disproportionate, assert the user-visible
half (the message) and say so explicitly in the commit — do not write a test that asserts nothing
meaningful.

- [ ] **Step 2: Verify**

```
node node_modules/jest/bin/jest.js
npx tsc --noEmit
```

Expected: **0 failures**, **zero output**.

- [ ] **Step 3: Commit**

```
git add src/features/addToCollection/AddToCollectionFlow.test.tsx
git commit -m "test: cover the duplicate-add path now that it is reachable

This branch existed and was correct but could never execute before D6."
```

---

## Task 4: Reach the add flow from the collection-mode player (D9)

**File:** `src/screens/Player/PlayerScreen.tsx` (~lines 625, 815)

- [ ] **Step 1: Ungate the button**

The button (~625) is gated on `isLibraryPlayer && activePonto`. Drop the `isLibraryPlayer` condition
so it renders in both modes. **Keep the `requireAuth(...)` wrapper** — signed-out users must get the
login sheet, not a dead control (and this is exactly the class of bug Spec 3 fixes; don't
reintroduce it here).

- [ ] **Step 2: Ungate the flow mount**

The `<AddToCollectionFlow>` mount (~815) is gated on `isLibraryPlayer && user?.id && activePonto`.
Drop `isLibraryPlayer`, keep `user?.id && activePonto`. Props stay exactly as Spec 2a established:

```tsx
allowVersionSelection={false}
initialPontoVersaoId={activeVersao?.id ?? null}
initialVersoes={activePonto.versoes}
```

- [ ] **Step 3: Rename the now-misleading state**

`libraryAddToCollectionOpen` / `setLibraryAddToCollectionOpen` (~line 234) are no longer
library-specific. Rename to `addToCollectionOpen` / `setAddToCollectionOpen`.

Mechanical, but do it now: a name that says "library" on a control that is no longer
library-only is exactly how the next reader concludes the gate was intentional and re-adds it.

- [ ] **Step 4: Verify**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
```

Expected: **zero output**, **0 failures**. `tsc` will catch any missed rename.

- [ ] **Step 5: Queue the human checks — do not run them here**

Append to [`../HUMAN-VALIDATION-QUEUE.md`](../HUMAN-VALIDATION-QUEUE.md) §2, and mark the
previously blocked items as ready to re-test:
- 2.7 — open a ponto from a terreiro collection → the "+" is present.
- 2.8 — **unblocked by this task**; commit an add from that context.
- Confirm the public-library flow is unchanged.
- 1.7 — re-test the duplicate message (`D6`).

**Commit regardless** — [`CONVENTIONS.md`](../CONVENTIONS.md) §4.

- [ ] **Step 6: Commit**

```
git add src/screens/Player/PlayerScreen.tsx
git commit -m "fix: add-to-collection is reachable from the collection player

Both the button and the flow mount were gated on isLibraryPlayer, so a
ponto opened from a terreiro's own collection had no add path at all -
the single most common way to reach a ponto in the app.

Pre-dates Spec 2a (the deleted modal carried \"Library\" in its own name),
so this completes an existing feature rather than adding one. Keeps
requireAuth so signed-out users get the login sheet.

Also renames libraryAddToCollectionOpen to addToCollectionOpen: leaving
\"library\" in the name of a control that is no longer library-only is how
the next reader concludes the gate was deliberate and restores it.

Backlog D9. Unblocks validation queue item 2.8."
```

---

## Task 5: Reconcile ([`CONVENTIONS.md`](../CONVENTIONS.md) §5)

- [ ] **Step 1: Final verification**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
```

Expected: **zero output**, **0 failures**.

- [ ] **Step 2: Confirm the gate is fully gone**

```
grep -n "isLibraryPlayer" src/screens/Player/PlayerScreen.tsx
```

Remaining matches are fine — the flag legitimately drives playlist/source behavior elsewhere. What
must **not** remain is any add-to-collection affordance still behind it.

- [ ] **Step 3: Tick this plan and record deviations**

Mark completed steps `- [x]`. Record inline `> **DEVIATION:**` notes — **especially Task 2 Step 3's
database verification**: what you ran, what it returned, and whether the primary approach or the
fallback shipped. That is the highest-value fact for the next reader and the easiest to lose.

- [ ] **Step 4: Update the backlog**

Mark `D6` and `D9` resolved with commit refs. If the fallback shipped, note it on `D6`'s row so
nobody re-litigates the approach later.

- [ ] **Step 5: Update the spec's Agent DoD**

Tick §8 in
[`../specs/2026-08-09-spec-5-add-to-collection-write-path.md`](../specs/2026-08-09-spec-5-add-to-collection-write-path.md),
add the completion date, and **be honest about the DB-verification checkbox** — leave it unticked
with a note if you could not reach a database.

- [ ] **Step 6: Commit**

```
git add docs/
git commit -m "docs: reconcile Spec 5 — add-to-collection write path resolved

D6 and D9 fixed. Records how the ON CONFLICT DO NOTHING return behavior
was verified (or that it wasn't) and which approach shipped. Human
validation queued, including the re-test of queue items 1.7 and 2.7 and
the now-unblocked 2.8."
```

---

## Implementation notes

**Tasks:** 5 (Task 1 read-only). **Commits:** 4.

**If a step fails:**
- Task 2 Step 2's duplicate test passes before the fix → the mock returns an error for the conflict
  case instead of an empty result. Model `ON CONFLICT DO NOTHING`: no error, no rows.
- The real DB returns a row for the ignored insert → the primary approach cannot work. Use the
  fallback in spec §3.1 and record the deviation; do not "fix" it by flipping `ignoreDuplicates`.
- `.select()` errors with a permission problem → an RLS policy blocks reading the row just written
  (spec §5 anticipates this). Fall back to the pre-check `select` and record it.

**Out of scope reminders:** `AddToCollection.tsx` (the inverse flow, `S-2c`), the repo-wide mutation
contract (`C3`), reordering/removing entries, and any schema or RLS change.
