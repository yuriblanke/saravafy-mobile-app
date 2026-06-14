# Spec 1 — Foundations

**Date:** 2026-06-13
**Source:** [code-quality-audit.md](../../architecture/code-quality-audit.md) waves 2, 3.
**Successors:** Spec 2 (Dedup), Spec 3 (Splits), Spec 4 (Quality) — all consume artifacts from this spec.

## 1. Goal

Build pure additive foundation layer — shared hooks, utilities, components — that subsequent specs can adopt without behavior change. Zero refactor in this spec; only new code + opt-in adoption at sample call sites to validate ergonomics.

## 2. Scope

### In scope

1. **`useTerreiroRole(terreiroId)` hook family** — consolidate 12+ inline `role === "admin"` checks.
2. **`getErrorMessage(e: unknown): string` utility** — replace duplicated copies in `Home.tsx:93-106`, `Collection.tsx:90-102`, `TerreiroBiblioteca.tsx:109-123`.
3. **`<QueryBoundary>` component** — wrap loading/error/empty scaffolding currently reinvented in 15+ screens.
4. **Sample adoption** — 3-5 call sites converted to validate API before locking in. Remaining adoption deferred to later specs.

### Out of scope (later specs)

- Spec 2: unify add-to-collection (3 implementations), move PreferencesContext server state → RQ.
- Spec 3: split monolith files (TabsHeader, TerreiroEditor, Home, etc.).
- Spec 4: FlatList migration, batch N+1 queries, TS `any` cleanup, write tests.

### Already-correct (audit false positives)

- `pontoIds` already memoized in `Collection.tsx:295` and `PlayerScreen.tsx:222`.
- `goToPontosTab` already `useCallback`'d in `Collection.tsx:199`.
- `showToast` already `useCallback`'d in `ToastContext.tsx:367`.

The real perf issue at `Collection.tsx:300-310` + `PlayerScreen.tsx:226-229` is **N+1 query cascade** (audio meta + custom tags fan out from same `pontoIds`). Fix requires backend RPC change → defer to Spec 4.

## 3. Acceptance criteria

### 3.1 `useTerreiroRole(terreiroId)`

- **Location:** `src/hooks/useTerreiroRole.ts`
- **Built on:** existing `useTerreiroMembershipStatus(terreiroId)` in `src/hooks/terreiroMembership.ts:88` — returns `{ data: { role, isActiveMember, hasPendingRequest, ... }, isLoading, ... }`. This is the same source `Collection.tsx`/`PlayerScreen.tsx` already use, so adoption is mechanical.
- **Why not `useMyTerreirosWithRoleQuery`:** that hook returns the bulk list of user's terreiros but does not carry the `isActiveMember` derivation needed for permission gates (an inactive member should not pass `canEditCustomTags`).
- **API:**
  ```ts
  // Match existing MyTerreiroRole — schema does not carry "follower" per me.ts:170-171.
  type TerreiroRole = "admin" | "curimba" | "member" | null;

  function useTerreiroRole(terreiroId: string | null | undefined): {
    role: TerreiroRole;
    isLoading: boolean;
    isActiveMember: boolean;     // pass-through from membership.data
    hasPendingRequest: boolean;  // pass-through from membership.data
    isAdmin: boolean;            // isActiveMember && role === "admin"
    isCurimba: boolean;          // isActiveMember && role === "curimba"
    isAdminOrCurimba: boolean;
    isMember: boolean;           // isActiveMember (any role)
    canEditCustomTags: boolean;  // isAdminOrCurimba
    canManageMembers: boolean;   // isAdmin
    canEditTerreiro: boolean;    // isAdmin
  };
  ```
- **Behavior:**
  - Returns `role: null` and all booleans `false` when `terreiroId` is missing/empty or user is not logged in.
  - All permission booleans gate on `isActiveMember` — an inactive/pending/removed member never reads `true` for `canEdit*` or `canManage*`.
  - `isLoading` mirrors underlying RQ loading state.
  - All boolean flags are derived; never source of truth.
  - Stable identity: returned object can be destructured without `React.memo` concerns (deps array safe).

### 3.2 `getErrorMessage(e: unknown): string`

- **Location:** `src/lib/errors.ts`
- **API:** `function getErrorMessage(e: unknown, fallback?: string): string`
- **Behavior:** matches existing inlined implementations:
  1. If `e instanceof Error` and `e.message.trim()` → return trimmed message.
  2. If `e` is object with string `message` field → return that.
  3. If `e` is string → return it.
  4. Otherwise → return `fallback ?? String(e)`.
- **Coverage:** unit tests for all 4 branches + null/undefined/0.

### 3.3 `<QueryBoundary>` component

- **Location:** `src/components/QueryBoundary.tsx`
- **API:**
  ```tsx
  type QueryBoundaryProps<T> = {
    query: { isLoading: boolean; isError: boolean; error: unknown; data: T | undefined };
    loading?: ReactNode;         // default: spinner
    error?: (e: unknown) => ReactNode; // default: themed error card with getErrorMessage(e)
    empty?: (data: T) => boolean; // default: !data
    emptyState?: ReactNode;
    children: (data: T) => ReactNode;
  };
  ```
- **Behavior:**
  - `isLoading && !data` → render `loading` slot.
  - `isError && !data` → render `error(error)` slot.
  - `data && empty(data)` → render `emptyState` slot (or null).
  - else → render `children(data!)`.
- **Stale-while-revalidate:** when `data` is present, render `children(data)` even if `isLoading=true` (background refetch). Component does NOT block UI on refetches.
- **Error with stale data:** if `data` present and `isError=true`, render `children(data)` and optionally call a `onError` side-effect prop (default: silent). Prevents flicker on transient failures.
- **Default loading:** themed centered `ActivityIndicator`.
- **Default error:** themed card with title "Não foi possível carregar" + `getErrorMessage(e)` body + optional retry button if `query.refetch` is passed.

### 3.4 Sample adoption (validation)

Convert 3-5 call sites to validate ergonomics. Pick varied surfaces:

| Call site | Use | Validates |
|---|---|---|
| `Collection.tsx:240-243` | `useTerreiroRole(terreiroId).canEditCustomTags` | replaces 3-clause check; verify identity vs old `myRole === "admin" \|\| myRole === "curimba" && isActiveMember` |
| `PlayerScreen.tsx:218-220` | `useTerreiroRole(terreiroId).canEditCustomTags` | same; ensures hook returns identical value across two consumers |
| `Home.tsx:93-106` | `import { getErrorMessage } from "@/src/lib/errors"` and delete local copy | removes duplicate |
| `Collection.tsx:90-102` | same — delete local copy | removes duplicate |
| `Home.tsx` (1 list render of pontos) | `<QueryBoundary>` for pontos query | validates loading + error + empty + stale-while-revalidate paths |

If any of these reveal API gaps, iterate spec before locking in.

## 4. Non-goals (explicit)

- **Do NOT** rewrite `useIsCurator` — keep it as-is; `useTerreiroRole` is per-terreiro, `useIsCurator` is global curator status. Different scopes.
- **Do NOT** migrate all 12+ role-check sites in this spec — only 2 adoption samples.
- **Do NOT** add retry logic, error boundaries, or telemetry to `QueryBoundary` — purely presentational.
- **Do NOT** introduce new contexts, providers, or global state.
- **Do NOT** change any RPC, table, or React Query key.

## 5. Risks

| Risk | Mitigation |
|---|---|
| `useMyTerreirosWithRoleQuery` shape changes break hook | Spec adoption tests will catch; hook reads via shared accessor. |
| `getErrorMessage` returns different string than current inline copies (regression in toast UX) | Unit tests assert exact equivalence per branch with sample inputs from each call site. |
| `<QueryBoundary>` styling drifts from per-screen ad-hoc loading UI | Adopt at 1 sample site first; visual diff before locking in default. |
| Sample adoption commits revert if API needs change | Each adoption is separate commit; reverting is mechanical. |

## 6. Testing

- **Prereq:** mobile app has no test infra today (no jest config, no `test` script, zero test files — confirmed during spec review). Plan adds `jest-expo` + `@testing-library/react-native` as Task 1. One-time cost; unlocks TDD for all subsequent specs.
- **Unit tests required:**
  - `src/lib/errors.test.ts` — 7 branches of `getErrorMessage`.
  - `src/hooks/useTerreiroRole.test.tsx` — null/undefined terreiroId, all role outcomes, inactive-with-role, hasPendingRequest passthrough, isLoading passthrough.
  - `src/components/QueryBoundary.test.tsx` — loading, error, empty, stale-while-revalidate, error-with-stale-data, custom slots.
- **No integration tests this spec** — adoption sites compile + visually verify in dev.

## 7. Deliverables

| File | Type | LOC est |
|---|---|---|
| `src/hooks/useTerreiroRole.ts` | new | ~60 |
| `src/hooks/useTerreiroRole.test.tsx` | new | ~80 |
| `src/lib/errors.ts` | new | ~20 |
| `src/lib/errors.test.ts` | new | ~40 |
| `src/components/QueryBoundary.tsx` | new | ~80 |
| `src/screens/Collection/Collection.tsx` | edit | -8 LOC (1 adoption) |
| `src/screens/Player/PlayerScreen.tsx` | edit | -6 LOC (1 adoption) |
| `src/screens/Home/Home.tsx` | edit | -15 LOC (2 adoptions) |

**Net:** +280 LOC new, -29 LOC removed. Foundation cost is upfront; payoff comes in Specs 2-4.

## 8. Plan format

Output of `superpowers:writing-plans` skill will be `docs/superpowers/plans/2026-06-13-spec-1-foundations.md` with one task per deliverable + TDD checkpoints (test → implementation → adoption → verify).

## 9. Definition of done

- All 3 new modules merged with passing unit tests.
- 4 sample adoption commits (one per call site) with `npx tsc --noEmit` clean.
- Manual smoke: Collection screen, Player screen, Home screen load and show pontos without regression.
- Audit doc updated: cross-reference `code-quality-audit.md` wave 2 + 3 entries with link to this spec.

## 10. Open questions (to resolve before plan)

- **Q1:** Should `QueryBoundary` accept a custom `errorCard` slot for screens that need branded variant (e.g., terreiro detail with cover image)? Default-only for now; iterate after first adoption.
- **Q2:** Does `useTerreiroRole` need a sync `userId` override param for cases like `InviteGate` which acts on behalf of another user? **A:** No — those checks are against the *invited* user's role, not the current user; out of scope. `InviteGate` keeps inline checks.
- **Q3:** Should `getErrorMessage` integrate with i18n? **A:** No — i18n is its own future audit (§5 of audit doc). Pass-through strings only.
- **Q4:** Should `useTerreiroRole` also expose raw `membership` query so consumers can read additional fields (e.g., `member_kind`)? **A:** No — keep the surface minimal. Consumers that need raw membership data continue to call `useTerreiroMembershipStatus` directly. `useTerreiroRole` is a permission lens, not a replacement.
- **Q5:** What happens when the `membership` query is in error state? **A:** Hook returns `role: null` + all booleans `false`. Errors don't grant permissions. Consumers that need to surface the error must call `useTerreiroMembershipStatus` directly.
