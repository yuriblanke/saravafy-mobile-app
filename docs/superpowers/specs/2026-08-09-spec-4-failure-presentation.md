# Spec 4 — Failure presentation

**Date:** 2026-08-09
**Source:** [`BACKLOG.md`](../BACKLOG.md) `D10`, `D7`, `D11` — all found during the 2026-08-08/09 human validation pass.
**Depends on:** Spec 1 Foundations (`getErrorMessage` and `<QueryBoundary>` are both Spec 1 artifacts; this spec fixes gaps in them).
**Process:** follows [`CONVENTIONS.md`](../CONVENTIONS.md). Plan written before execution.

## 1. Goal

When something fails, the app should say so in language a person understands, and it should never
throw away content it already has in order to say it.

Three defects break that today, and they are ordered by dependency: the shared error utility has no
network branch (`D10`), one screen never used the utility at all (`D7`), and the component built
specifically to preserve content during failures is defeated at one of its two adoption sites
(`D11`).

**`D10` must be fixed first.** Routing more call sites through a utility that itself emits
`TypeError: Network request failed` would spread the defect while appearing to consolidate it.

## 2. Scope

### 2.1 In scope

1. **`D10`** — `src/lib/errors.ts` has no branch for network/connectivity failures; passes raw
   runtime strings through.
2. **`D7`** — `src/hooks/usePontosSearch.ts` extracts `e.message` inline and never uses
   `getErrorMessage`, so Home search shows `TypeError: Network request failed` verbatim.
3. **`D11`** — `src/screens/Terreiros/Terreiros.tsx` computes `error` without the "don't hide
   loaded content" guard its sibling `isLoading` already has, so a background refetch failure
   covers an already-rendered list with a full error card.

### 2.2 Out of scope

- **`S-3a`** (sweeping the remaining ~8 local `getErrorMessage` copies onto the shared util) — this
  spec fixes the util and two specific call sites that produced observed bugs. The bulk sweep stays
  in the backlog and becomes *safe to do* once `D10` lands.
- **`X1` / `X2`** (the trim-contract mismatch and dead branch in `errors.ts`) — adjacent lines, but
  a separate concern; fold in only if touching them is unavoidable, and record it.
- The `<QueryBoundary>` component itself. `D11` is a bug in how one *caller* builds its input;
  Spec 1's component logic is correct as written.
- Adding retry/backoff, offline queues, or connectivity detection UI.

### 2.3 Known constraints

- React Native surfaces fetch failures as `TypeError` with message `"Network request failed"`. That
  exact string is the primary signal; matching must not be so narrow it misses Supabase-wrapped
  variants, nor so broad it swallows genuine application errors.
- `src/components/AddMediumTagSheet.tsx:62` has its own near-identical local `getErrorMessage` copy
  with the same gap — it produced the observed 3.5 failure. It is the one sweep target included
  here, because leaving it would mean the same reported bug survives this spec.
- `Terreiros.tsx:430` (`isLoading`) is the correct reference pattern; line 431 (`error`) is the
  defect. Fix by symmetry, not invention.

## 3. Acceptance criteria

### 3.1 `D10` — `getErrorMessage` normalizes connectivity failures

- **File:** `src/lib/errors.ts`
- **New behavior:** before returning any raw message, detect a network/connectivity failure and
  return a single friendly Portuguese string:

  > `Sem conexão. Verifique sua internet e tente novamente.`

- **Detection contract:**
  - Matches `TypeError` whose message contains `network request failed` (case-insensitive).
  - Matches messages containing `network request failed` regardless of error class (Supabase and
    other layers may re-wrap).
  - Also matches the common `Failed to fetch` phrasing.
  - Does **not** match merely because the word "network" appears in an otherwise meaningful
    application error.
- **Preserved behavior:** every existing branch and its current return value stays exactly as-is
  for non-network input. This is additive; Spec 1's tests must keep passing unmodified.
- **Export:** the detection predicate is exported (e.g. `isNetworkError(e: unknown): boolean`) so
  call sites can branch on connectivity without re-implementing string matching.

### 3.2 `D7` — Home search uses the shared utility

- **File:** `src/hooks/usePontosSearch.ts` (~line 73)
- Replace the inline `e instanceof Error ? e.message : String(e)` with `getErrorMessage(e)`.
- No other behavior in the hook changes.

### 3.3 `D11` — a failed refetch must not hide loaded content

- **File:** `src/screens/Terreiros/Terreiros.tsx` (~line 431)
- Mirror the guard `isLoading` already uses:

  ```ts
  const isLoading = terreirosQuery.isFetching && terreiros.length === 0;   // existing, correct
  const error = terreirosQuery.isError && terreiros.length === 0           // add the guard
    ? "..."
    : null;
  ```

- **Behavior contract:**
  - Query errors **with** cached rows on screen → list stays rendered, no error card.
  - Query errors **without** any rows (genuine cold failure) → error card, unchanged from today.
  - This restores the stale-while-revalidate guarantee Spec 1 §3.3 specified.
- **Error copy:** the current message is `"Ops, seu app parece estar desatualizado."`, which is
  wrong for a connectivity failure. Use `getErrorMessage(terreirosQuery.error)` so `D10`'s network
  branch applies, keeping the existing string only as the `fallback` argument.

### 3.4 `AddMediumTagSheet` local copy

- **File:** `src/components/AddMediumTagSheet.tsx` (~line 62)
- Delete the local `getErrorMessage` and import the shared one. This is the call site that produced
  the observed queue 3.5 failure; fixing `D10` alone would not reach it.

## 4. Non-goals

- Do NOT sweep the other ~8 `getErrorMessage` copies (that is `S-3a`, and it becomes safe *after*
  this).
- Do NOT change `<QueryBoundary>`'s own logic.
- Do NOT introduce a connectivity/offline banner, retry policy, or `NetInfo` dependency — the
  offline effort is deliberately deferred (`S-5`).
- Do NOT restructure `Terreiros.tsx`'s synthetic query object beyond the guard and the message
  source.

## 5. Risks

| Risk | Mitigation |
|---|---|
| Network detection swallows a real application error that happens to mention "network" | Match on the specific known phrasings, not the bare word. Unit-test a decoy: an `Error("Erro ao carregar network settings")` must pass through unchanged. |
| Changing `errors.ts` breaks Spec 1's existing tests | Those tests must pass **unmodified**. If any needs changing, the change is not additive — stop and reconsider. |
| `D11`'s guard hides a genuine persistent failure behind stale data indefinitely | Bounded by design: the guard only applies while rows exist, and `<QueryBoundary>`'s retry affordance stays reachable in the empty case. Accepted tradeoff, and the same one `isLoading` already makes. |
| The friendly string is wrong for a server-side 5xx that also fails to reach the network layer | Out of scope; only client-side connectivity failures are matched. Server errors keep their message. |

## 6. Testing

- **Unit (required):** extend `src/lib/errors.test.ts`
  - `TypeError("Network request failed")` → friendly string.
  - Lower/mixed-case variants → friendly string.
  - `Error("Failed to fetch")` → friendly string.
  - Decoy: an application error containing the word "network" → **unchanged**.
  - All 7 pre-existing branch tests still pass **without modification**.
  - `isNetworkError` directly: true/false cases.
- **Unit (required):** `src/screens/Terreiros/*` — the `error` derivation. If the guard is inline in
  the component and awkward to test directly, extract the two-line derivation into a tiny pure
  helper and test that; do not skip coverage for the defect this spec exists to fix.
- **Human (deferred):** appended to [`HUMAN-VALIDATION-QUEUE.md`](../HUMAN-VALIDATION-QUEUE.md).

## 7. Deliverables

| File | Type | Note |
|---|---|---|
| `src/lib/errors.ts` | edit | network branch + exported `isNetworkError` |
| `src/lib/errors.test.ts` | edit | new cases incl. decoy; existing cases untouched |
| `src/hooks/usePontosSearch.ts` | edit | use shared util |
| `src/components/AddMediumTagSheet.tsx` | edit | delete local copy, import shared |
| `src/screens/Terreiros/Terreiros.tsx` | edit | `error` guard + message source |

## 8. Definition of done

### Agent DoD — ✅ complete 2026-08-09

- [x] `npx tsc --noEmit` → **zero output**.
- [x] Test suite → **0 failures** (52 passing; 12 added by this spec). Spec 1's original 7
      `errors.test.ts` cases pass **unmodified** — the diff to `errors.ts` is insertion-only.
- [x] `grep -rn "Network request failed" src/` shows no hand-rolled handling outside
      `src/lib/errors.ts`. Five matches, all benign: three in the matcher's own tests, one in Task 5's
      test (a real `TypeError`, deliberately not a string), and one **comment** in
      `TerreiroEditor.tsx:295` explaining why cover upload avoids `fetch(file://…).blob()` on
      Android. No code path can render the raw string to a user.
- [x] Backlog updated: `D7`, `D10`, `D11` marked resolved with commit refs; `S-3a` annotated as
      unblocked, with its real copy count corrected from 8 to 10.

**Known gap carried forward — `X13`.** `isNetworkError` matches only `Error`s and message-bearing
objects, not a bare string. No call site stringifies today (grepped), so nothing leaks now, but
`S-3a` routes ten more copies onto this utility and some may pass `String(e)`. Deliberately left
as the plan prescribed rather than widened by an agent; it is a human call. See `X13` in the backlog.

### Human DoD — deferred to the queue

- Airplane mode → Home search → friendly message, not `TypeError`.
- Airplane mode → Collection → add a médium tag → friendly toast.
- Terreiros tab loaded → wait past `staleTime` → airplane mode → trigger a refetch → **list stays
  on screen**, no error card over content.
- Terreiros tab with cold cache + no connection → error card still appears (guard didn't overreach).

## 9. Open questions

- **Q1:** Should the friendly copy differ between "no connection at all" and "server unreachable"?
  **A:** No — indistinguishable from the client for this class of failure, and one clear sentence
  beats two vague ones.
- **Q2:** Should `<QueryBoundary>` itself refuse to render its error slot when data exists, making
  `D11` structurally impossible at every future call site? **A:** It already does — the component
  checks `query.data !== undefined` first (Spec 1 §3.3). The bug is that `Terreiros.tsx` passes
  `data: undefined` when `error` is set, defeating that check from outside. A future hardening could
  make the input harder to misuse, but that is a design change; out of scope here.
