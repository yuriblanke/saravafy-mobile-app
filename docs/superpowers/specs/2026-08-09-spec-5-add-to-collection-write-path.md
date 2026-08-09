# Spec 5 — Add-to-collection write path

**Date:** 2026-08-09
**Source:** [`BACKLOG.md`](../BACKLOG.md) `D6`, `D9` — both found during the 2026-08-08/09 human validation pass.
**Depends on:** Spec 2a (`AddToCollectionFlow` is the component both defects live around).
**Process:** follows [`CONVENTIONS.md`](../CONVENTIONS.md). Plan written before execution.

## 1. Goal

Adding a ponto to a collection should tell the truth about what happened, and should be reachable
from every place a ponto is shown.

Two defects: the duplicate case silently reports success while the database does nothing (`D6`),
and the affordance is missing entirely when the player was opened from a terreiro's collection
(`D9`).

Both sit on the flow Spec 2a just consolidated — which is why they are worth fixing now, while
there is exactly one implementation to fix instead of three.

## 2. Scope

### 2.1 In scope

1. **`D6`** — `addPontoToCollection` uses `ignoreDuplicates: true`, so Postgres does
   `ON CONFLICT DO NOTHING` and never raises the `23505` the code branches on. The `alreadyExists`
   path is unreachable; a duplicate add reports success and the optimistic cache patch desyncs from
   the database.
2. **`D9`** — the add-to-collection button and the `AddToCollectionFlow` mount are both gated on
   `isLibraryPlayer` (`source === "all"`), so the player opened from a terreiro collection has no
   add path at all.

### 2.2 Out of scope

- `AddToCollection.tsx` (the inverse fixed-collection/pick-ponto route) — untouched, as in Spec 2a.
  Its consolidation is `S-2c`.
- Reordering, removing, or editing collection entries.
- The optimistic-update *pattern* itself (`C3`) — this spec makes one flow's rollback correct; it
  does not enforce the contract repo-wide.
- Any change to `collections_pontos` schema, RLS, or the position-uniqueness retry loop.

### 2.3 Known constraints

- **Why `ignoreDuplicates: true` is there and must stay:** it makes the insert idempotent without
  clobbering the existing row. Flipping it to `false` would make a duplicate add *overwrite*
  `position`, `added_by`, `ponto_versao_id` and the entidade fields of an entry that already
  exists — silently reordering someone's collection. That is worse than the current bug.
- Therefore detection must come from **what the write returned**, not from an error.
- `AddToCollectionFlow` already handles `alreadyExists` correctly end-to-end
  (`AddToCollectionFlow.tsx` `onSuccess`: rolls back the optimistic insert and the count increment,
  and shows "Este ponto já estava na coleção"). **That code is correct and currently unreachable** —
  `D6` is purely a detection failure in the data layer. No UI work is needed for it.
- The player already exposes everything the flow needs in collection mode (`activePonto`,
  `activeVersao`, `user.id`, `variant`); only the gate is missing.

## 3. Acceptance criteria

### 3.1 `D6` — duplicates are detected from the write result

- **File:** `src/screens/Home/data/collections_pontos.ts` (~lines 151-183)
- **Fix:** ask the upsert to return the affected row, and treat "no row returned" as "already
  existed":

  ```ts
  const res = await supabase
    .from(TABLE)
    .upsert(payload as any, {
      onConflict: "collection_id,ponto_id",
      ignoreDuplicates: true as any,
    } as any)
    .select("ponto_id");        // ← added

  if (!res.error) {
    const inserted = Array.isArray(res.data) ? res.data.length : 0;
    return inserted > 0 ? { ok: true } : { ok: true, alreadyExists: true };
  }
  ```

  With `ON CONFLICT DO NOTHING`, an ignored insert returns no rows, so an empty result is an
  unambiguous duplicate signal.

- **Verification required during implementation:** this behavior must be confirmed against the real
  database, not assumed from the client library's typings. If an empty array is *not* returned for
  the ignored case, stop and record it — the fallback is a pre-check `select` before the insert
  (accepting the extra round-trip and a benign race, since the insert stays idempotent either way).
- **Keep:** the `23505` branches below. They remain correct for the position-uniqueness retry and
  as defense if conflict behavior ever changes. Add a comment noting the PK branch is not the
  primary duplicate path anymore.
- **Behavior contract:**
  - Adding a ponto not in the collection → `{ ok: true }`, toast "Ponto adicionado à coleção",
    optimistic insert stands.
  - Adding a ponto already in the collection → `{ ok: true, alreadyExists: true }`, toast "Este
    ponto já estava na coleção", optimistic insert **and** count increment rolled back.
  - Either way the existing database row is never modified.

### 3.2 `D9` — add-to-collection reachable from the collection-mode player

- **File:** `src/screens/Player/PlayerScreen.tsx` (~lines 625, 815)
- Ungate the button and the `AddToCollectionFlow` mount from `isLibraryPlayer`. Both should be
  available whenever there is an `activePonto` and a signed-in user, in either player mode.
- Keep the existing `requireAuth(...)` wrapper on the button so signed-out users get the login
  sheet rather than a dead control — and so this does not reintroduce the class of bug Spec 3 fixes.
- Props stay exactly as Spec 2a established for player mode: `allowVersionSelection={false}`,
  `initialPontoVersaoId={activeVersao?.id ?? null}`, `initialVersoes={activePonto.versoes}`.
- **Behavior contract:** opening a ponto from a terreiro collection and from the public library
  yields the same single-phase add flow, with the version currently shown in the player
  pre-selected in both cases.

## 4. Non-goals

- Do NOT add multi-ponto or bulk add.
- Do NOT change which collections are eligible, or the ordering/filtering inside the flow.
- Do NOT alter the two-phase Home wizard behavior.
- Do NOT "fix" `ignoreDuplicates` by flipping it to `false` — see §2.3.

## 5. Risks

| Risk | Mitigation |
|---|---|
| `.select()` changes the statement's RLS behavior (needs read permission on the row just written) | Anyone permitted to add to a collection can already read it — the flow lists the collection's pontos. Verify explicitly during implementation; if a policy blocks the read, fall back to the pre-check `select` described in §3.1. |
| An empty result also occurs for reasons other than a duplicate | With `ON CONFLICT DO NOTHING` on a single-row upsert there are exactly two outcomes: inserted (1 row) or conflicted (0 rows). Errors take the `res.error` path before this branch. |
| Ungating the player button exposes it in a context with no eligible collections | The flow already renders an explicit empty state ("Você ainda não tem permissão para adicionar pontos em coleções") — reachable, not a dead end. |
| `D9` makes `D6` newly visible in a context where it wasn't reachable before | Fix `D6` first, in that order, in the plan. |

## 6. Testing

- **Unit (required):** `src/screens/Home/data/collections_pontos.test.ts` (new), with a mocked
  Supabase chain:
  - upsert returns one row → `{ ok: true }`, no `alreadyExists`.
  - upsert returns an empty array → `{ ok: true, alreadyExists: true }`.
  - upsert errors with a position-constraint `23505` → retries (existing loop preserved).
  - upsert errors with a non-unique error → `{ ok: false, error }`.
  - **Do not loosen these assertions to match whatever the mock happens to return**
    ([`CONVENTIONS.md`](../CONVENTIONS.md) §7) — the mock encodes the contract in §3.1, and if the
    real database disagrees, the implementation note in §3.1 applies, not a weaker test.
- **Component (extend):** `AddToCollectionFlow.test.tsx` — a commit whose result carries
  `alreadyExists: true` produces the duplicate message and does not leave the ponto optimistically
  inserted.
- **Human (deferred):** appended to [`HUMAN-VALIDATION-QUEUE.md`](../HUMAN-VALIDATION-QUEUE.md),
  including the re-test of queue items 1.7, 2.7 and 2.8 (2.8 has been blocked by `D9`).

## 7. Deliverables

| File | Type | Note |
|---|---|---|
| `src/screens/Home/data/collections_pontos.ts` | edit | `.select()` + result-based duplicate detection |
| `src/screens/Home/data/collections_pontos.test.ts` | create | four branch tests |
| `src/screens/Player/PlayerScreen.tsx` | edit | ungate button + flow mount |
| `src/features/addToCollection/AddToCollectionFlow.test.tsx` | edit | duplicate-path assertion |

## 8. Definition of done

### Agent DoD

- [ ] `npx tsc --noEmit` → **zero output**.
- [ ] Test suite → **0 failures**.
- [ ] The §3.1 database behavior was verified, not assumed — result recorded in the plan (including
      if it forced the fallback approach).
- [ ] No new inline query keys ([`CONVENTIONS.md`](../CONVENTIONS.md) §11).
- [ ] Backlog updated: `D6`, `D9` marked resolved with commit refs.

### Human DoD — deferred to the queue

- Add a ponto already in a collection → "Este ponto já estava na coleção"; the entry is **not**
  duplicated and does **not** jump position (re-tests queue 1.7).
- Open a ponto from a terreiro collection → the "+" is present (re-tests queue 2.7).
- Commit an add from that context → ponto lands in the chosen collection (unblocks queue 2.8).
- Confirm the public-library player add flow is unchanged.

## 9. Open questions

- **Q1:** Should a duplicate add move the ponto to the end of the collection instead of no-op-ing?
  **A:** No. That is a product decision, and silently reordering a shared terreiro collection
  because someone re-tapped is exactly the surprise this effort is trying to remove. No-op plus a
  clear message.
- **Q2:** Should the collection-mode player hide the add button when the ponto is already in the
  collection currently being played? **A:** No — that requires the flow to know the host
  collection's contents, and the duplicate message (once `D6` works) already covers it honestly.
