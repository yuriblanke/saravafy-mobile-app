# Spec 3 — Auth state leaks

**Date:** 2026-08-09
**Source:** [`BACKLOG.md`](../BACKLOG.md) `D8`, `D12` — both found during the 2026-08-08/09 human validation pass.
**Depends on:** Spec 1 Foundations (`useTerreiroRole` is the consumer that surfaces `D8`).
**Process:** follows [`CONVENTIONS.md`](../CONVENTIONS.md). Plan: `plans/2026-08-09-spec-3-auth-state-leaks.md`.

## 1. Goal

After logging out, the app must actually look and behave logged out — without needing an app
restart. Two independent defects currently break that: one in the data layer (stale role served by
`placeholderData`), one in the presentation layer (missing `!user` guards in both Preferences
implementations).

This is the highest-priority group in the backlog because it is the only one where the failure is a
**permission-adjacent** one: a signed-out viewer sees affordances reserved for terreiro
admins/curimbas.

## 2. Scope

### 2.1 In scope

1. **`D8`** — `useTerreiroMembershipStatus` keeps serving the previous user's membership after
   logout, via `placeholderData: (prev) => prev`.
2. **`D12`** — `Preferences.tsx`'s `ProfileSection` / `LogoutSection` render logged-in UI ("? Você"
   identity card, "Sair" button) with no auth check; the parallel
   `TabsHeaderWithPreferences.tsx` implementation has the same gap in its own "Sair" row.

### 2.2 Out of scope

- **`D1`** (logout cache eviction for non-user-scoped keys) — related but a different mechanism;
  fixing it neither fixes nor is fixed by this spec. Stays P0 in the backlog.
- **`C5`** (unifying the two parallel Preferences implementations) — this spec patches the same hole
  in both, deliberately, and documents that duplication as the cost. Unification is its own effort.
- **`D13`** (no way to remove/override the profile photo) — needs a product decision and probably a
  schema change; separate spec.
- Any redesign of the Preferences UI. Guards only.

### 2.3 Known constraints

- `requireAuth(action, opts)` and `openLoginSheet(opts)` already exist in
  `src/contexts/LoginPromptContext.tsx` — reuse, do not build a new login affordance.
- `TabsHeaderWithPreferences.tsx:476-494` already renders a correct "Entrar" button when `!user`.
  That is the reference implementation for the Preferences-screen equivalent.
- `useTerreiroMembershipStatus` is consumed by `useTerreiroRole`, which is consumed by
  `Collection.tsx` and `PlayerScreen.tsx` (Spec 1's adoption sites). Fixing the base hook fixes all
  of them; no consumer needs to change.
- Both queries in the hook carry `placeholderData: (prev) => prev` (lines ~157 and ~197). The
  membership one is the leak; the pending-request one has the same shape and must be checked too.

## 3. Acceptance criteria

### 3.1 `D8` — membership never outlives the session that produced it

- **File:** `src/hooks/terreiroMembership.ts`
- **Fix:** gate the derivation on `userId`, not only on `terreiroId`:

  ```ts
  const memberRow = useMemo(() => {
    if (!terreiroId || !userId) return null;      // userId added
    const rows = membershipQuery.data ?? [];
    return rows.find((r) => r.terreiro_id === terreiroId) ?? null;
  }, [membershipQuery.data, terreiroId, userId]); // userId added
  ```

- **Also:** `pendingRequestId` must be `null` when `!userId`, by the same reasoning.
- **Behavior contract:**
  - `userId === null` → `role: null`, `isActiveMember: false`, `hasPendingRequest: false`,
    `pendingRequestId: null`. Unconditionally, regardless of what any prior query returned.
  - No permission may ever be derived from data fetched for a different `userId`.
  - Logging out and back in as a *different* user must never show the first user's roles.

**Why not just delete `placeholderData`:** it exists to avoid a loading flash when switching
between terreiros within one session — a real benefit, and removing it risks introducing the exact
flicker class this whole effort is trying to eliminate (see `D11`, `S-4a`). Gating the *derivation*
keeps the intra-session benefit and closes the cross-session leak. Deleting it is the fallback if
the gate proves insufficient.

### 3.2 `D12` — Preferences respects logged-out state

Both implementations, independently:

**A. `src/screens/Preferences/components/ProfileSection.tsx`**
- When `!user`: render a signed-out identity block instead of the identity card — a short line plus
  an "Entrar" button calling `openLoginSheet()`.
- Must NOT render: `displayName` (which degrades to the literal string `"Você"` via
  `getDisplayName("")`), initials `"?"`, email, badges, curator toggle, or the "Revisar envios" row.

**B. `src/screens/Preferences/components/LogoutSection.tsx`**
- When `!user`: render nothing (`return null`). The section, its button, and its confirm modal are
  all meaningless signed out.

**C. `src/components/TabsHeaderWithPreferences.tsx` (~line 1948)**
- Same: the "Sair" row is not rendered when `!user`.

- **Behavior contract:** with no session, no screen offers "Sair", and no screen shows a
  placeholder identity as though it were an account.

### 3.3 Regression guard

`getDisplayName("")` returning the literal `"Você"` is defensible as a last-resort label but is
what made this bug look like real content. Leave the utility as-is (out of scope) — the guards
above mean it is never reached with an empty value from these call sites.

## 4. Non-goals

- Do NOT unify the two Preferences implementations (that is `C5`).
- Do NOT change `signOut` itself, `AuthContext`, or session persistence.
- Do NOT add navigation-on-logout (e.g. auto-closing the Preferences screen). Guards only — a
  correct signed-out Preferences screen is a valid state.
- Do NOT touch `queryKeys.ts` or logout cache eviction (`D1`).
- Do NOT remove `placeholderData` unless §3.1's gate proves insufficient (record it as a deviation
  if so).

## 5. Risks

| Risk | Mitigation |
|---|---|
| Gating on `userId` introduces a loading flash when switching terreiros in-session | The gate only nulls out when `userId` is falsy — an in-session terreiro switch keeps `userId`, so `placeholderData` still applies. Covered by a unit test asserting data survives a `terreiroId` change. |
| `D8` has other consumers beyond `useTerreiroRole` that assume the old behavior | grep all `useTerreiroMembershipStatus` call sites before changing; `tsc` catches shape changes (there are none — only values change). |
| Hiding `LogoutSection` entirely leaves a visibly empty "Conta" area | It renders `null` including its `PreferencesSection` wrapper, so no empty titled section remains. Verify in the human pass. |
| The `TabsHeaderWithPreferences` fix is forgotten because the Preferences-screen fix "looks done" | It is a separate, explicitly listed acceptance criterion (§3.2C) with its own plan task and its own commit. |

## 6. Testing

- **Unit (required):** `src/hooks/terreiroMembership.test.tsx` (new)
  - `userId: null` → all-false/null contract, **even when the query cache holds a prior result**
    (this is the actual regression test for `D8`; a test that just checks a fresh null user proves
    nothing).
  - `userId` present + active admin row → `role: "admin"`, `isActiveMember: true`.
  - `terreiroId` changes while `userId` stays → previous data still usable (guards against the
    §5 flash regression).
  - `hasPendingRequest` false when `!userId`.
- **Unit (required):** extend `src/hooks/useTerreiroRole.test.tsx` — a logged-out consumer gets
  `canEditCustomTags: false` even with prior membership data present.
- **Component (if infra allows):** `ProfileSection` / `LogoutSection` render nothing
  account-shaped when `!user`. If mocking `useAuth` + the curator hooks proves disproportionate,
  say so explicitly and rely on the unit tests plus human validation — do not write a hollow test.
- **Human (deferred, per [`CONVENTIONS.md`](../CONVENTIONS.md) §4):** appended to
  [`HUMAN-VALIDATION-QUEUE.md`](../HUMAN-VALIDATION-QUEUE.md).

## 7. Deliverables

| File | Type | Note |
|---|---|---|
| `src/hooks/terreiroMembership.ts` | edit | `userId` gate on `memberRow` + `pendingRequestId` |
| `src/hooks/terreiroMembership.test.tsx` | create | `D8` regression tests |
| `src/hooks/useTerreiroRole.test.tsx` | edit | logged-out permission assertion |
| `src/screens/Preferences/components/ProfileSection.tsx` | edit | signed-out branch |
| `src/screens/Preferences/components/LogoutSection.tsx` | edit | `!user` → `null` |
| `src/components/TabsHeaderWithPreferences.tsx` | edit | guard the "Sair" row |

## 8. Definition of done

Split per [`CONVENTIONS.md`](../CONVENTIONS.md) §4.

### Agent DoD — ✅ complete 2026-08-09

- [x] `npx tsc --noEmit` → **zero output**.
- [x] Test suite → **0 failures**, including the new `D8` regression tests (40 passing, 6 added by
      this spec).
- [x] `grep -n "placeholderData" src/hooks/terreiroMembership.ts` reviewed: both remain, derivation
      gated. Nothing removed, so §3.1's fallback was not needed. (The grep returns five hits in the
      file; three belong to unrelated queries in the same module.)
- [x] No new inline query keys ([`CONVENTIONS.md`](../CONVENTIONS.md) §11).
- [x] Backlog updated: `D8` and `D12` marked resolved with commit refs.

**Correction to §2.3:** this spec expected three consumers of `useTerreiroMembershipStatus`
(`useTerreiroRole`, `Collection.tsx`, `PlayerScreen.tsx`). There are **eight** — six of them bypass
`useTerreiroRole` entirely. All eight were opened and every one reads the hook for the signed-in
viewer's own permissions, so the gate holds for all of them, but the blast radius stated here was
too narrow.

**Correction to §2 (`D12` site count):** three sites were expected. The Task 6 scan of the overlay
found a **fourth** — the preferences sheet's profile identity row, with the same missing guard and a
still-tappable edit-profile pencil. Fixed in the same commit.

### Human DoD — deferred to the queue

- Log in as terreiro admin → log out **without restarting** → Player and Collection show no
  edit affordances; Preferences shows "Entrar" and no "Sair"; header shows "Entrar".
- Log out and log back in as a **different** user → no trace of the first user's roles.
- Switch between terreiros while logged in → role badges/permissions still resolve without a
  visible loading flash (guards against the §5 regression).

## 9. Open questions

- **Q1:** Should the signed-out Preferences screen hide more sections (theme, offline downloads)?
  **A:** No. Those are device-level preferences and work fine signed out. Only account-shaped UI is
  in scope.
- **Q2:** Should logging out from within Preferences navigate away automatically?
  **A:** No — explicitly a non-goal. A correct signed-out Preferences screen is a valid state, and
  auto-navigation is a UX change, not a bug fix.
