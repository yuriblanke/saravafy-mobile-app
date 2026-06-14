# Spec 2b — PreferencesContext server state → React Query

**Date:** 2026-06-14
**Source:** [code-quality-audit.md](../../architecture/code-quality-audit.md) wave 6 (cross-cutting issue §6.13).
**Depends on:** Spec 1 Foundations.
**Sibling:** Spec 2a (AddToCollection unify) — independent; can land in either order.

## 1. Goal

Migrate `fetchTerreirosQueAdministro` out of `PreferencesContext` into a React Query hook. Removes server state from a context provider (anti-pattern) and consolidates cache invalidation under React Query.

## 2. Scope

### 2.1 In scope

1. **Build `useMyManagedTerreirosQuery(userId)`** in `src/queries/me.ts` (admin-only, with RLS recursion fallback).
2. **Move `ManagedTerreiro` type** from `PreferencesContext.tsx` to `src/queries/me.ts`.
3. **Add `queryKeys.me.managedTerreiros(userId)`** to query keys registry.
4. **Migrate 3 consumers** to use new hook:
   - `src/components/InviteGate.tsx` (lines 196, 771, 879)
   - `src/components/TabsHeaderWithPreferences.tsx` (lines 649, 1267)
   - `src/screens/TerreiroEditor/TerreiroEditor.tsx` (lines 633, 940, 969, 1415, 1539)
5. **Remove from `PreferencesContext.tsx`:** `fetchTerreirosQueAdministro` function (~210 LOC) and its inclusion in context value/provider.

### 2.2 Out of scope

- AddToCollection unification (Spec 2a).
- Migrating `useMyEditableTerreirosQuery` — different scope (admin + curimba); keep distinct.
- Other PreferencesContext server-state leaks (none identified at audit time; if more surface, separate spec).
- Renaming the context. Other PreferencesContext concerns (theme, start page) stay.

### 2.3 Known constraints

- **Admin-only filter:** `fetchTerreirosQueAdministro` returns only `role = "admin"` rows. `useMyEditableTerreirosQuery` returns `admin + curimba`. New hook is admin-only.
- **RLS recursion fallback:** When `terreiro_members` RLS policy recurses, query fails. Existing fallback queries `terreiros` by `created_by = userId` to recover. **Must port verbatim — this is app-survivability code.**
- **`status` column tolerance:** Existing code falls back to no-status filter when column is missing (schema drift tolerance). Port this.
- **3 distinct image select shapes** in legacy fetcher (with `cover_image_url`, `avatar_url`, `image_url` permutations for schema tolerance). Port the cascade.
- **Type `ManagedTerreiro`** is currently exported from `PreferencesContext.tsx`. Move to `src/queries/me.ts` — any external importers must update.

## 3. Acceptance criteria

### 3.1 `useMyManagedTerreirosQuery(userId)`

- **Location:** `src/queries/me.ts` (alongside `useMyEditableTerreirosQuery` at line 575).
- **API (matches existing shape in `PreferencesContext.tsx:20-25` — DO NOT change):**
  ```ts
  // Type moves from PreferencesContext to src/queries/me.ts; same shape.
  export type ManagedTerreiro = {
    id: string;
    name: string;            // mapped from terreiros.title
    avatarUrl?: string;       // cascade: cover_image_url | avatar_url | image_url
    role: TerreiroRole;       // "admin" | "curimba" — but this hook filters admin only
  };

  export function useMyManagedTerreirosQuery(
    userId: string | null
  ): UseQueryResult<ManagedTerreiro[]>;

  export async function fetchMyManagedTerreiros(params: {
    userId: string
  }): Promise<ManagedTerreiro[]>;
  ```
- **Behavior:**
  - Filters `terreiro_members.role = "admin"` + `status = "active"`.
  - On `status` column missing → retry without status filter.
  - On RLS recursion error → fallback to `terreiros.created_by = userId` query.
  - Same schema-tolerance cascade for terreiros image columns (4 select shapes).
  - `staleTime: 60_000` matching peer queries.
  - `placeholderData: (prev) => prev` matching peer pattern.
  - When `userId` is null → returns `[]` (disabled).

### 3.2 Query key

- **Registry:** `src/queries/queryKeys.ts`
- **New entry:** `me.managedTerreiros(userId: string)` returns `["me", "managedTerreiros", userId] as const`.

### 3.3 Three consumers migrated

For each consumer, the pattern is:
- **Read:** swap `usePreferences().fetchTerreirosQueAdministro` → `useMyManagedTerreirosQuery(userId)`.
- **Write (after mutations):** swap imperative `await fetchTerreirosQueAdministro(userId)` → `queryClient.invalidateQueries({ queryKey: queryKeys.me.managedTerreiros(userId) })`.

Specific sites:

| File | Read sites | Write sites |
|---|---|---|
| `InviteGate.tsx` | line 196 destructure | line 771 (after invite accept) |
| `TabsHeaderWithPreferences.tsx` | line 649 destructure | line 1267 (after invite action) |
| `TerreiroEditor.tsx` | line 633 destructure | lines 940, 1415, 1539 (after save/create/delete) |

### 3.4 `PreferencesContext.tsx` cleanup

- Delete `fetchTerreirosQueAdministro` function body.
- Delete from `PreferencesContextValue` type.
- Delete from provider value object.
- Delete `ManagedTerreiro` export (now in me.ts).
- Keep `isTerreiroMembersPolicyRecursionError` helper — used by new hook (move to `src/queries/me.ts` or `src/lib/`).

## 4. Non-goals

- Do NOT change RPCs or table schemas.
- Do NOT introduce caching strategies beyond default RQ behavior.
- Do NOT optimize the query (e.g. join vs two-step) — port legacy logic verbatim.
- Do NOT migrate `useMyEditableTerreirosQuery` consumers — out of scope.

## 5. Risks

| Risk | Mitigation |
|---|---|
| RLS recursion fallback breaks edge case during port | Port branch logic verbatim; unit test the fallback with mocked supabase error. |
| Consumers expect `fetchTerreirosQueAdministro` to return fresh data synchronously | Existing call sites await the fn. Replacement `invalidateQueries` is fire-and-forget; UI updates via RQ subscription. Verify each consumer's expectation; if any reads result inline, must refactor. |
| Cache key collision with `useMyEditableTerreirosQuery` | Distinct key (`managedTerreiros` vs `preferences.terreiros`); no overlap. |
| `ManagedTerreiro` type move breaks unidentified consumer | grep before removal; CI tsc catches. |

## 6. Testing

- **Unit tests required:**
  - `src/queries/me.test.ts` (new file or extend if exists) — `fetchMyManagedTerreiros` branches:
    - happy path (admin rows present)
    - status column missing fallback
    - RLS recursion fallback to `terreiros.created_by`
    - empty userId returns empty array
    - 4 image-column shape fallbacks (or assert the cascade order)
- **Manual smoke:**
  - Login → open Preferences → "Meus terreiros" list populates with admin terreiros.
  - Edit a terreiro → save → managed list reflects update without manual refresh.
  - Accept a terreiro admin invite → managed list adds the new terreiro.

## 7. Deliverables

| File | Type | LOC |
|---|---|---|
| `src/queries/me.ts` | edit | ~+200 (new hook + fetcher + type) |
| `src/queries/me.test.ts` | create | ~150 |
| `src/queries/queryKeys.ts` | edit | +3 (new key) |
| `contexts/PreferencesContext.tsx` | edit | ~-220 (remove fn + type) |
| `src/components/InviteGate.tsx` | edit | ~+5 / -5 |
| `src/components/TabsHeaderWithPreferences.tsx` | edit | ~+5 / -5 |
| `src/screens/TerreiroEditor/TerreiroEditor.tsx` | edit | ~+10 / -10 |

**Net LOC:** ~+340 new, ~-250 removed = **+90 LOC** (test code accounts for net positive; production code is −20).

## 8. Definition of done

- All new unit tests pass.
- `npx tsc --noEmit` baseline preserved (0 errors).
- All 23 existing tests pass + new tests pass.
- Manual smoke test of 3 flows above.
- `grep "fetchTerreirosQueAdministro" src/ contexts/` returns no matches.
- Audit doc `code-quality-audit.md` wave 6 row cross-linked.

## 9. Open questions

- **Q1:** Should the RLS recursion fallback also retry the membership query (e.g. on auth refresh) or stay one-shot per session? **A:** One-shot — matches legacy. Don't add retry strategies in this spec.
- **Q2:** Does any consumer await the legacy fn's return value (vs fire-and-forget)? **A:** Verify per consumer during impl. If found, escalate — may need to keep a thin async helper.
- **Q3:** Should the new hook auto-invalidate on auth state change (logout/login)? **A:** No new behavior — RQ logout eviction already handles this (per audit §6.10 noted as a known gap, but out of scope for this spec).
