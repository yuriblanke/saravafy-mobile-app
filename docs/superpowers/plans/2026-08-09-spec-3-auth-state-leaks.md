# Spec 3 — Auth state leaks: Implementation Plan

> **For agentic workers:** use `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`. Steps use `- [ ]` checkboxes.
> **Read [`CONVENTIONS.md`](../CONVENTIONS.md) first** — in particular §3 (exact verification),
> §4 (no dev-client steps; human checks are queued, never blocking) and §5 (reconciliation is the
> final task, not optional).

**Goal:** after logout, no screen serves a stale role and no screen offers account UI.

**Spec source:** [`../specs/2026-08-09-spec-3-auth-state-leaks.md`](../specs/2026-08-09-spec-3-auth-state-leaks.md)

**Working directory:** `C:\saravafy\saravafy-mobile-app` (Windows; PowerShell or Git Bash).

**Order matters:** the data-layer fix (Task 2) lands before the presentation guards (Tasks 4-6), so
that if a guard is missed, the underlying permission leak is already closed.

**Test command:** `npm test` is defined but `jest` may not resolve on PATH in this environment; the
reliable invocation is `node node_modules/jest/bin/jest.js`. Use whichever works, but read the
summary line — the gate is **0 failures**, never a specific total.

---

## File Structure

| File | Type | Responsibility |
|---|---|---|
| `src/hooks/terreiroMembership.ts` | edit | Gate role/pending derivation on `userId` |
| `src/hooks/terreiroMembership.test.tsx` | create | `D8` regression tests |
| `src/hooks/useTerreiroRole.test.tsx` | edit | Logged-out permission assertion |
| `src/screens/Preferences/components/ProfileSection.tsx` | edit | Signed-out identity branch |
| `src/screens/Preferences/components/LogoutSection.tsx` | edit | `!user` → render nothing |
| `src/components/TabsHeaderWithPreferences.tsx` | edit | Guard the "Sair" row |

---

## Task 1: Record the baseline

- [ ] **Step 1: Confirm a clean starting point**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
```

Expected: **zero `tsc` output**, **0 test failures**. If either fails before you change anything,
stop and report — do not build on a broken baseline.

- [ ] **Step 2: Inventory the consumers you are about to affect**

```
grep -rn "useTerreiroMembershipStatus" src/
```

Record the list. Spec §2.3 expects `useTerreiroRole` plus direct callers in `Collection.tsx` and
`PlayerScreen.tsx`. **If a consumer appears that reads `role` for a purpose other than gating
current-user permissions** (e.g. displaying another user's role), note it — the §3.1 gate would
change its behavior, and that is a deviation to record, not to silently accept.

(No commit — read-only.)

---

## Task 2: Gate membership derivation on `userId` (D8) — TDD

**Files:** `src/hooks/terreiroMembership.ts`, `src/hooks/terreiroMembership.test.tsx`

- [ ] **Step 1: Write the failing test first**

Create `src/hooks/terreiroMembership.test.tsx`. Model the mocking on the existing
`src/hooks/useTerreiroRole.test.tsx` (same harness, already working in this repo).

The load-bearing test is the one that mimics a real logout — **cached data present, `userId` gone**.
A test that merely renders a fresh logged-out hook proves nothing, because the leak only appears
when a prior successful query exists:

```tsx
it("returns no role when userId is null even though a prior query resolved", () => {
  // Arrange: a query cache (or mocked query result) already holding an admin row
  // for terreiro "t1", exactly as it would be right after an admin logs out.
  // Act: render with userId = null.
  // Assert: role === null, isActiveMember === false,
  //         hasPendingRequest === false, pendingRequestId === null.
});
```

Also cover:
- `userId` present + active admin row → `role: "admin"`, `isActiveMember: true`.
- `terreiroId` changes while `userId` stays → previously fetched data still usable
  (this is the guard against the §5 flash regression; without it, a later "simplification" that
  deletes `placeholderData` would pass tests while reintroducing flicker).
- `hasPendingRequest` is `false` when `userId` is null.

- [ ] **Step 2: Run it and watch it fail**

```
node node_modules/jest/bin/jest.js --testPathPattern=terreiroMembership
```

Expected: **the logout test fails** — it should report a leaked `"admin"` role. If it passes
immediately, the test is not reproducing the defect; fix the test before touching the source.

- [ ] **Step 3: Apply the gate**

In `src/hooks/terreiroMembership.ts` (~line 160):

```ts
const memberRow = useMemo(() => {
  if (!terreiroId || !userId) return null;
  const rows = membershipQuery.data ?? [];
  return rows.find((r) => r.terreiro_id === terreiroId) ?? null;
}, [membershipQuery.data, terreiroId, userId]);
```

Then ensure `pendingRequestId` is `null` when `!userId` (~line 200) by the same reasoning:

```ts
const pendingRequestId = userId ? pendingQuery.data ?? null : null;
```

Leave both `placeholderData: (prev) => prev` lines in place — spec §3.1 explains why removing them
is the fallback, not the fix.

- [ ] **Step 4: Verify**

```
node node_modules/jest/bin/jest.js --testPathPattern=terreiroMembership
npx tsc --noEmit
```

Expected: **0 failures**, **zero `tsc` output**.

- [ ] **Step 5: Commit**

```
git add src/hooks/terreiroMembership.ts src/hooks/terreiroMembership.test.tsx
git commit -m "fix: never derive terreiro role from another session's data

useTerreiroMembershipStatus keeps placeholderData across query-key
changes, so after logout - when userId goes null and the query is
disabled - it kept serving the previous user's membership rows. Every
permission built on it (useTerreiroRole, canEditCustomTags) stayed stuck
on the pre-logout role until the component unmounted, showing
admin/curimba affordances to a signed-out viewer.

Gates the derivation on userId rather than removing placeholderData,
which still earns its keep for in-session terreiro switches. Regression
test asserts the real shape of the bug: cached data present, userId gone.

Backlog D8."
```

---

## Task 3: Assert the fix through the permission lens (D8)

**File:** `src/hooks/useTerreiroRole.test.tsx`

- [ ] **Step 1: Add a consumer-level regression test**

`useTerreiroRole` is what screens actually call. Add a case proving the leak is closed at that
boundary too: with membership data present but no user, `canEditCustomTags`, `isAdmin`,
`canManageMembers` and `canEditTerreiro` are all `false`.

- [ ] **Step 2: Verify**

```
node node_modules/jest/bin/jest.js
npx tsc --noEmit
```

Expected: **0 failures**, **zero output**.

- [ ] **Step 3: Commit**

```
git add src/hooks/useTerreiroRole.test.tsx
git commit -m "test: assert useTerreiroRole grants nothing without a session

Covers D8 at the boundary screens actually consume, not just the hook
underneath it."
```

---

## Task 4: Signed-out branch in ProfileSection (D12)

**File:** `src/screens/Preferences/components/ProfileSection.tsx`

- [ ] **Step 1: Add the early branch**

Import `useLoginPrompt` from `@/src/contexts/LoginPromptContext` and, when `!user`, return a
signed-out block instead of the identity card:

- A short line inviting sign-in.
- A button calling `openLoginSheet()`.
- Reuse `PreferencesSection title="Conta"` so the screen's structure is unchanged.

`TabsHeaderWithPreferences.tsx:476-494` is the existing "Entrar" affordance — match its wording and
intent rather than inventing new copy.

Nothing account-shaped may render in this branch: no `displayName` (it degrades to the literal
string `"Você"`), no initials, no email, no badges, no curator toggle, no "Revisar envios" row.

**Hook order:** the `!user` early return must come *after* all hook calls in the component, or
React will error on hook-count changes between renders. Compute first, branch at the return.

- [ ] **Step 2: Verify**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
```

Expected: **zero output**, **0 failures**.

- [ ] **Step 3: Queue the human check — do not run it here**

Append to [`../HUMAN-VALIDATION-QUEUE.md`](../HUMAN-VALIDATION-QUEUE.md) §5: signed out, the
Preferences "Conta" area shows an "Entrar" affordance and no "? Você" placeholder identity.
**Commit regardless** — per [`CONVENTIONS.md`](../CONVENTIONS.md) §4 this never gates the task.

- [ ] **Step 4: Commit**

```
git add src/screens/Preferences/components/ProfileSection.tsx
git commit -m "fix: Preferences shows a sign-in prompt instead of a fake identity

ProfileSection read everything through user?.x with no !user branch, so
after logging out it rendered an identity card built from empty strings -
getDisplayName(\"\") returns the literal \"Você\" and getInitials falls back
to \"?\", producing the reported \"? Você\" account card.

Backlog D12 (1 of 3 sites)."
```

---

## Task 5: Hide LogoutSection when signed out (D12)

**File:** `src/screens/Preferences/components/LogoutSection.tsx`

- [ ] **Step 1: Guard the whole section**

Read `user` from `useAuth()` and return `null` when absent — including the `PreferencesSection`
wrapper, so no empty titled section is left behind. Same hook-order rule as Task 4.

- [ ] **Step 2: Verify**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
```

Expected: **zero output**, **0 failures**.

- [ ] **Step 3: Commit**

```
git add src/screens/Preferences/components/LogoutSection.tsx
git commit -m "fix: no \"Sair\" button when there is no session (Preferences route)

LogoutSection rendered its button and confirm modal unconditionally.
Returns null when signed out, wrapper included, so no empty section
remains.

Backlog D12 (2 of 3 sites)."
```

---

## Task 6: Guard the "Sair" row in the parallel implementation (D12)

**File:** `src/components/TabsHeaderWithPreferences.tsx` (~line 1948)

This is a **separate task on purpose.** The same defect exists independently in the second
Preferences implementation, and the whole point of `aggregation.md` §6.12 is that fixing one does
not reach the other. Do not skip this because Tasks 4-5 "already fixed Preferences".

- [ ] **Step 1: Guard the row**

Wrap the `Pressable` rendering "Sair" (~1948-1959) so it is not rendered when there is no `user`.
`user` is already in scope in that component (`const { user, signOut } = useAuth()`, ~line 635).

- [ ] **Step 2: Check for siblings in the same overlay**

```
grep -n "signOut\|isLogoutConfirmOpen" src/components/TabsHeaderWithPreferences.tsx
```

The confirm modal is state-driven and unreachable once the trigger is hidden, so it needs no guard.
**If any other account-shaped affordance in this overlay lacks a `user` check, note it** — fix it
here if trivial, otherwise record it in [`../BACKLOG.md`](../BACKLOG.md) rather than leaving it
undocumented ([`CONVENTIONS.md`](../CONVENTIONS.md) §9).

- [ ] **Step 3: Verify**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
```

Expected: **zero output**, **0 failures**.

- [ ] **Step 4: Commit**

```
git add src/components/TabsHeaderWithPreferences.tsx
git commit -m "fix: no \"Sair\" row when signed out (overlay implementation)

Same missing guard as LogoutSection, fixed separately because the two
Preferences implementations share no code - which is the concrete cost
aggregation.md §6.12 describes, and the reason C5 exists.

Backlog D12 (3 of 3 sites)."
```

---

## Task 7: Reconcile ([`CONVENTIONS.md`](../CONVENTIONS.md) §5)

- [ ] **Step 1: Final verification**

```
npx tsc --noEmit
node node_modules/jest/bin/jest.js
```

Expected: **zero output**, **0 failures**.

- [ ] **Step 2: Confirm the leak is closed everywhere it was reported**

```
grep -n "placeholderData" src/hooks/terreiroMembership.ts
```

Both occurrences should remain, with the derivation gated. If you removed either, that is a
deviation — record it inline in this plan with the reasoning (spec §3.1 permits it as a fallback).

- [ ] **Step 3: Tick this plan's checkboxes and record any deviation**

Mark every completed step `- [x]`. For anything that differed from the plan, add an inline
`> **DEVIATION:**` note explaining what and why. An unticked, un-annotated plan is what made the
earlier specs unusable as history.

- [ ] **Step 4: Update the backlog**

In [`../BACKLOG.md`](../BACKLOG.md), mark `D8` and `D12` resolved with commit refs. If Task 6 Step 2
surfaced extra unguarded affordances, they are already logged there.

Add a note to `C5` that this spec patched the same hole in both implementations — evidence for why
unification is worth doing.

- [ ] **Step 5: Update the spec's Agent DoD**

Tick §8's Agent DoD boxes in
[`../specs/2026-08-09-spec-3-auth-state-leaks.md`](../specs/2026-08-09-spec-3-auth-state-leaks.md)
and add the completion date.

- [ ] **Step 6: Confirm the human checks are queued**

Verify [`../HUMAN-VALIDATION-QUEUE.md`](../HUMAN-VALIDATION-QUEUE.md) §5 contains the spec §8
Human DoD items, including the **different-user re-login** check and the **in-session terreiro
switch** check (the latter guards the §5 flash regression and is easy to forget because it tests
something that should *not* change).

- [ ] **Step 7: Commit**

```
git add docs/
git commit -m "docs: reconcile Spec 3 — auth state leaks resolved

D8 and D12 fixed and marked resolved. Human validation queued, not run
(CONVENTIONS.md §4). Records that D12 needed the same fix applied
separately in both Preferences implementations, as concrete evidence
for C5."
```

---

## Implementation notes

**Tasks:** 7 (Task 1 read-only). **Commits:** 6.

**If a step fails:**
- Task 2 Step 2 test *passes* before the fix → the test isn't reproducing the leak. The cache must
  hold a prior successful result while `userId` is null; a fresh logged-out render won't show it.
- Hook-order warnings after Tasks 4-5 → an early return was placed above a hook call. Move all
  hooks above the branch.
- A `useTerreiroMembershipStatus` consumer breaks → check Task 1 Step 2's inventory. If it reads
  `role` for something other than the current user's permissions, the gate is wrong for that
  consumer: stop, record the deviation, and reconsider scope rather than weakening the gate.

**Out of scope reminders:** `D1` (logout cache eviction), `C5` (unifying Preferences), `D13`
(profile photo), and any Preferences redesign. Guards only.
