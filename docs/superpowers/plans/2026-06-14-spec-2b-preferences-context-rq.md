# Spec 2b — PreferencesContext → React Query Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Migrate `fetchTerreirosQueAdministro` out of `PreferencesContext.tsx` into `useMyManagedTerreirosQuery` (React Query). Migrate 3 consumers to use the hook + cache invalidation. Remove dead context method.

**Architecture:** Port legacy fetcher verbatim (admin role filter + status column fallback + RLS recursion fallback + 4 image column shape cascade) into a new RQ hook in `src/queries/me.ts`. Add new query key. Replace `await fetchTerreirosQueAdministro(userId)` calls with `queryClient.invalidateQueries(...)`. Remove function from context.

**Tech Stack:** React Native, React Query v5, Supabase, TypeScript, jest-expo (test infra from Spec 1).

**Spec source:** `docs/superpowers/specs/2026-06-14-spec-2b-preferences-context-rq.md`

---

## File Structure

| File | Type | Responsibility |
|---|---|---|
| `src/queries/me.ts` | edit | Add `ManagedTerreiro` type, `fetchMyManagedTerreiros`, `useMyManagedTerreirosQuery`; move `isTerreiroMembersPolicyRecursionError` helper here |
| `src/queries/me.test.ts` | create | Unit tests for `fetchMyManagedTerreiros` branches (mocked supabase) |
| `src/queries/queryKeys.ts` | edit | Add `me.managedTerreiros(userId)` key |
| `contexts/PreferencesContext.tsx` | edit | Remove `fetchTerreirosQueAdministro` fn + `ManagedTerreiro` type export + context value entry |
| `src/components/InviteGate.tsx` | edit | Swap context fn → hook + invalidate |
| `src/components/TabsHeaderWithPreferences.tsx` | edit | Same swap |
| `src/screens/TerreiroEditor/TerreiroEditor.tsx` | edit | Same swap, 3 invalidate sites |

---

## Task 1: Snapshot existing legacy fetcher

**Files:**
- Read-only: `contexts/PreferencesContext.tsx:67-312`

Purpose: capture the exact legacy logic before porting. No code changes this task.

- [ ] **Step 1: Read the full `fetchTerreirosQueAdministro` body**

Run: `sed -n '67,312p' /mnt/c/saravafy/saravafy-mobile-app/contexts/PreferencesContext.tsx`

Note down (in your scratch):
- Initial membership query: `terreiro_members` filtered by `user_id`, `role IN ("admin")`, `status = "active"`.
- `status`-column-missing fallback: drop status filter, retry.
- RLS recursion fallback (via `isTerreiroMembersPolicyRecursionError`): fall back to `terreiros.created_by = userId` query with 4 image-column shape cascade.
- Happy path after membership query succeeds: collect `terreiro_id`s, fetch `terreiros` table with same 4 image-shape cascade, map to `ManagedTerreiro`.
- Final mapping: `{ id, name: t.title, avatarUrl: cover_image_url ?? avatar_url ?? image_url, role: "admin" }`.
- Sort: `safeLocaleCompare(a.name, b.name)`.

- [ ] **Step 2: Read the `isTerreiroMembersPolicyRecursionError` helper definition**

Run: `grep -n "isTerreiroMembersPolicyRecursionError\|function isTerreiro" /mnt/c/saravafy/saravafy-mobile-app/contexts/PreferencesContext.tsx | head -5`

Read its body. This helper moves to `src/queries/me.ts` (or `src/lib/`) in Task 4 — port it verbatim.

- [ ] **Step 3: Note ManagedTerreiro shape and any internal helpers used (e.g., `safeLocaleCompare`)**

Run: `grep -n "safeLocaleCompare\|ManagedTerreiro" /mnt/c/saravafy/saravafy-mobile-app/contexts/PreferencesContext.tsx | head -10`

`safeLocaleCompare` already exists in `src/queries/me.ts:182`. Reuse — do not duplicate.

(No commit this task — pure read.)

---

## Task 2: Add `me.managedTerreiros(userId)` query key

**Files:**
- Modify: `src/queries/queryKeys.ts:33-45` (the `me:` block)

- [ ] **Step 1: Add the key**

In `/mnt/c/saravafy/saravafy-mobile-app/src/queries/queryKeys.ts`, inside the `me:` object (currently lines 33-45), add a new entry:

```ts
managedTerreiros: (userId: string) =>
  ["me", "managedTerreiros", userId] as const,
```

Suggested placement: right after `editableTerreiros` (line 42-43) to keep similar keys grouped.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npx tsc --noEmit 2>&1 | head -5`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd /mnt/c/saravafy/saravafy-mobile-app
git add src/queries/queryKeys.ts
git commit -m "feat(queries): add me.managedTerreiros query key

Reserved for useMyManagedTerreirosQuery (Spec 2b)."
```

---

## Task 3: Move `ManagedTerreiro` type to `src/queries/me.ts`

**Files:**
- Modify: `src/queries/me.ts` — add type export
- Modify: `contexts/PreferencesContext.tsx` — remove type export, add import (so existing context-internal usage still compiles)

- [ ] **Step 1: Add type to `src/queries/me.ts`**

Find a sensible location (near other types around line 161-180). Insert:

```ts
export type ManagedTerreiro = {
  id: string;
  name: string;
  avatarUrl?: string;
  role: TerreiroRole;
};
```

Verify `TerreiroRole` is imported/defined in `me.ts`. If not, add it. (Existing `EditableTerreiroRole = "admin" | "curimba"` is similar — check exports.)

- [ ] **Step 2: Update PreferencesContext to import the type**

In `/mnt/c/saravafy/saravafy-mobile-app/contexts/PreferencesContext.tsx`:

Delete lines 20-25 (the local `export type ManagedTerreiro = { ... };` block).

Add at the top with other imports:
```ts
import { ManagedTerreiro } from "@/src/queries/me";
```

Re-export so external importers from `@/contexts/PreferencesContext` keep working (back-compat shim — removed in Task 8):
```ts
export type { ManagedTerreiro };
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -E "ManagedTerreiro|PreferencesContext" | head -10`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/queries/me.ts contexts/PreferencesContext.tsx
git commit -m "refactor(queries): move ManagedTerreiro type to src/queries/me.ts

PreferencesContext re-exports for back-compat. Re-export removed after
consumer migration (Spec 2b Task 8)."
```

---

## Task 4: Port `isTerreiroMembersPolicyRecursionError` helper

**Files:**
- Modify: `src/queries/me.ts` — add helper (un-exported, file-local)
- Keep: `contexts/PreferencesContext.tsx` — leave existing definition in place until Task 7 (the legacy fn still uses it)

- [ ] **Step 1: Copy helper into `src/queries/me.ts`**

Locate `isTerreiroMembersPolicyRecursionError` in `contexts/PreferencesContext.tsx` (use grep from Task 1 Step 2). Copy the body verbatim into `src/queries/me.ts` as a file-local helper (not exported):

```ts
function isTerreiroMembersPolicyRecursionError(err: unknown): boolean {
  // [paste exact body from PreferencesContext.tsx — do not modify logic]
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/queries/me.ts
git commit -m "refactor(queries): port isTerreiroMembersPolicyRecursionError to me.ts

Same body as PreferencesContext copy. Both coexist temporarily;
PreferencesContext copy removed when fetchTerreirosQueAdministro
is deleted (Spec 2b Task 8)."
```

---

## Task 5: Implement `fetchMyManagedTerreiros` + `useMyManagedTerreirosQuery` — TDD

**Files:**
- Modify: `src/queries/me.ts` — add async fetcher + hook
- Create: `src/queries/me.test.ts` — unit tests with mocked supabase

This is the bulk of Spec 2b. Port the legacy fetcher's branches verbatim.

- [ ] **Step 1: Write the failing test**

Create `/mnt/c/saravafy/saravafy-mobile-app/src/queries/me.test.ts`:

```ts
import { fetchMyManagedTerreiros } from "./me";

// Mock the supabase client
jest.mock("@/lib/supabase", () => {
  const mock = {
    from: jest.fn(),
  };
  return { supabase: mock };
});

import { supabase } from "@/lib/supabase";

type Chain = {
  select: jest.Mock;
  eq: jest.Mock;
  in: jest.Mock;
};

function makeChain(result: { data?: unknown; error?: unknown }): Chain {
  const chain: Chain = {
    select: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  // Terminal `.in()` returns a thenable
  chain.in.mockReturnValue(Promise.resolve(result));
  // For chains that end on `.eq()` (membership query has `.in().eq()`)
  chain.eq.mockReturnValueOnce(chain).mockReturnValueOnce(Promise.resolve(result) as any);
  return chain;
}

describe("fetchMyManagedTerreiros", () => {
  beforeEach(() => {
    (supabase.from as jest.Mock).mockReset();
  });

  it("returns empty array when userId is empty string", async () => {
    const result = await fetchMyManagedTerreiros({ userId: "" });
    expect(result).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns mapped ManagedTerreiros on happy path (admin membership + terreiro fetch)", async () => {
    const membersChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ terreiro_id: "t1", role: "admin" }],
          error: null,
        }),
      }),
    };
    const terreirosChain = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({
        data: [
          {
            id: "t1",
            title: "Terreiro 1",
            cover_image_url: "https://example.com/cover.png",
          },
        ],
        error: null,
      }),
    };
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(membersChain) // terreiro_members
      .mockReturnValueOnce(terreirosChain); // terreiros

    const result = await fetchMyManagedTerreiros({ userId: "u1" });

    expect(result).toEqual([
      {
        id: "t1",
        name: "Terreiro 1",
        avatarUrl: "https://example.com/cover.png",
        role: "admin",
      },
    ]);
  });

  it("returns empty when membership query returns no admin rows", async () => {
    const membersChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
    (supabase.from as jest.Mock).mockReturnValueOnce(membersChain);

    const result = await fetchMyManagedTerreiros({ userId: "u1" });
    expect(result).toEqual([]);
  });

  it("falls back to created_by query on RLS recursion error", async () => {
    const membersChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: {
            message:
              "infinite recursion detected in policy for relation \"terreiro_members\"",
            code: "42P17",
          },
        }),
      }),
    };
    const createdChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [
          {
            id: "t2",
            title: "Created Terreiro",
            cover_image_url: null,
            avatar_url: "https://example.com/avatar.png",
          },
        ],
        error: null,
      }),
    };
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(membersChain) // terreiro_members (errors)
      .mockReturnValueOnce(createdChain); // terreiros (created_by fallback)

    const result = await fetchMyManagedTerreiros({ userId: "u1" });

    expect(result).toEqual([
      {
        id: "t2",
        name: "Created Terreiro",
        avatarUrl: "https://example.com/avatar.png",
        role: "admin",
      },
    ]);
  });

  it("falls back to no-status filter when status column is missing", async () => {
    let membersCallCount = 0;
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "terreiro_members") {
        membersCallCount += 1;
        if (membersCallCount === 1) {
          // First call: status filter applied, errors with "status does not exist"
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'column "status" does not exist' },
              }),
            }),
          };
        }
        // Second call: no status filter, succeeds
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [{ terreiro_id: "t3", role: "admin" }],
            error: null,
          }),
        };
      }
      // terreiros table
      return {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ id: "t3", title: "T3", cover_image_url: "u" }],
          error: null,
        }),
      };
    });

    const result = await fetchMyManagedTerreiros({ userId: "u1" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t3");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
npm test -- --testPathPattern=queries/me
```
Expected: FAIL — `fetchMyManagedTerreiros` is not exported from `./me`.

- [ ] **Step 3: Implement `fetchMyManagedTerreiros` and `useMyManagedTerreirosQuery`**

In `/mnt/c/saravafy/saravafy-mobile-app/src/queries/me.ts`:

Port the legacy `fetchTerreirosQueAdministro` body from `PreferencesContext.tsx:67-312` as a new function `fetchMyManagedTerreiros(params: { userId: string }): Promise<ManagedTerreiro[]>`.

Rules:
- Same branches: status-column fallback, RLS recursion fallback to `created_by`, 4 image-column shape cascade for both `terreiros` lookups.
- Use the local `isTerreiroMembersPolicyRecursionError` helper from Task 4.
- Use `safeLocaleCompare` from `me.ts:182` for final sort.
- Drop the `__DEV__` `console.info` logging — not required for parity (move telemetry concerns to a separate spec if needed).
- Return type: `ManagedTerreiro[]`.

Then add the hook:

```ts
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { queryKeys } from "@/src/queries/queryKeys";

export function useMyManagedTerreirosQuery(
  userId: string | null,
): UseQueryResult<ManagedTerreiro[]> {
  return useQuery({
    queryKey: userId ? queryKeys.me.managedTerreiros(userId) : [],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return [] as ManagedTerreiro[];
      return fetchMyManagedTerreiros({ userId });
    },
    placeholderData: (prev) => prev,
  });
}
```

(Imports: ensure `useQuery`, `UseQueryResult`, and `queryKeys` are imported if not already.)

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- --testPathPattern=queries/me
```
Expected: PASS — all 5 tests.

If any fail because the mock chain doesn't match what the implementation calls (Supabase fluent API can be tricky), inspect the failing test, refine the mock chain, and retry. The test should not be loosened to hide a real branch divergence — if the implementation calls supabase differently than the mock, the implementation is wrong (not the test).

- [ ] **Step 5: Verify TypeScript compiles**

```
npx tsc --noEmit 2>&1 | grep -E "me\.ts|me\.test" | head -5
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/queries/me.ts src/queries/me.test.ts
git commit -m "feat(queries): add useMyManagedTerreirosQuery (admin-only)

Ports fetchTerreirosQueAdministro legacy logic into React Query hook:
- admin role filter
- status column missing fallback
- RLS recursion fallback to terreiros.created_by
- 4 image column shape cascade

Tests cover happy path, empty, RLS recursion fallback, status fallback.
Legacy fn in PreferencesContext remains until consumers migrate
(Spec 2b Tasks 6-7); removed in Task 8."
```

---

## Task 6: Migrate `InviteGate.tsx`

**Files:**
- Modify: `src/components/InviteGate.tsx` (lines 196, 771, 879)

- [ ] **Step 1: Read the 3 sites**

Run: `grep -n "fetchTerreirosQueAdministro" /mnt/c/saravafy/saravafy-mobile-app/src/components/InviteGate.tsx`

Inspect each. Confirm:
- Line 196: destructured from `usePreferences()` — read-side.
- Line 771: `await fetchTerreirosQueAdministro(userId)` inside an invite-accept handler — refresh after mutation.
- Line 879: dep array entry — for `useCallback`/`useEffect`.

- [ ] **Step 2: Replace destructure with `useQueryClient`**

Find the `usePreferences()` call near line 196. Remove `fetchTerreirosQueAdministro` from the destructure.

Add at the top of the component:
```ts
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/src/queries/queryKeys";
```

Inside the component (alongside other hooks):
```ts
const queryClient = useQueryClient();
```

- [ ] **Step 3: Replace the `await fetchTerreirosQueAdministro(userId)` call (line 771)**

Replace with:
```ts
await queryClient.invalidateQueries({
  queryKey: queryKeys.me.managedTerreiros(userId),
});
```

**Caveat:** the original `await` was fire-and-await-result (returns the data). The replacement is fire-and-forget-via-cache. If the surrounding code reads the result of the call, you must instead use `queryClient.fetchQuery(...)` or refactor to read from the hook. **Inspect the 3 lines around line 771 before swapping.** If the result is used, escalate as DONE_WITH_CONCERNS.

- [ ] **Step 4: Remove dep-array entry at line 879**

Find the `useCallback`/`useEffect` deps array that listed `fetchTerreirosQueAdministro`. Remove it. Add `queryClient` if it's referenced in the callback (RQ guarantees `queryClient` stable identity but ESLint rule may still want it listed).

- [ ] **Step 5: Verify TypeScript compiles**

```
npx tsc --noEmit 2>&1 | grep "InviteGate.tsx" | head -5
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/InviteGate.tsx
git commit -m "refactor: InviteGate uses queryClient.invalidateQueries for managed terreiros

Replaces imperative fetchTerreirosQueAdministro await with React Query
cache invalidation. Cleaner reactive pattern: any consumer of
useMyManagedTerreirosQuery updates automatically."
```

---

## Task 7: Migrate `TabsHeaderWithPreferences.tsx` and `TerreiroEditor.tsx`

**Files:**
- Modify: `src/components/TabsHeaderWithPreferences.tsx` (lines 649, 1267)
- Modify: `src/screens/TerreiroEditor/TerreiroEditor.tsx` (lines 633, 940, 969, 1415, 1539)

Same pattern as Task 6.

- [ ] **Step 1: TabsHeaderWithPreferences — read sites**

Run: `grep -n "fetchTerreirosQueAdministro" /mnt/c/saravafy/saravafy-mobile-app/src/components/TabsHeaderWithPreferences.tsx`

Inspect lines 649 (destructure) and 1267 (call after invite action).

- [ ] **Step 2: TabsHeaderWithPreferences — apply migration**

Same 4 substeps as Task 6 Step 2-5: add `useQueryClient` + `queryKeys` imports; remove from `usePreferences()` destructure; replace `await fetchTerreirosQueAdministro(userId)` with `await queryClient.invalidateQueries({ queryKey: queryKeys.me.managedTerreiros(userId) })`.

Verify TS clean:
```
npx tsc --noEmit 2>&1 | grep "TabsHeaderWithPreferences" | head -5
```

- [ ] **Step 3: TerreiroEditor — read sites**

Run: `grep -n "fetchTerreirosQueAdministro" /mnt/c/saravafy/saravafy-mobile-app/src/screens/TerreiroEditor/TerreiroEditor.tsx`

Inspect lines 633 (destructure), 940/1415/1539 (3 imperative calls after mutations), 969 (dep array).

- [ ] **Step 4: TerreiroEditor — apply migration**

Same pattern. Each of 3 calls becomes:
```ts
queryClient.invalidateQueries({
  queryKey: queryKeys.me.managedTerreiros(user.id),
});
```

Note: TerreiroEditor uses `.catch(() => undefined)` after the call (fire-and-forget pattern). `invalidateQueries` returns a promise; either keep the `.catch` or drop the `await` entirely. Match existing style.

Verify TS clean:
```
npx tsc --noEmit 2>&1 | grep "TerreiroEditor" | head -5
```

- [ ] **Step 5: Verify no remaining consumers**

Run: `grep -rn "fetchTerreirosQueAdministro" /mnt/c/saravafy/saravafy-mobile-app/src/ /mnt/c/saravafy/saravafy-mobile-app/contexts/`
Expected: ONLY matches inside `contexts/PreferencesContext.tsx` (the legacy definition, removed in Task 8).

- [ ] **Step 6: Commit**

```bash
git add src/components/TabsHeaderWithPreferences.tsx src/screens/TerreiroEditor/TerreiroEditor.tsx
git commit -m "refactor: TabsHeader + TerreiroEditor use invalidateQueries

Migrates remaining 5 fetchTerreirosQueAdministro call sites to
React Query cache invalidation. Legacy fn now unused; removal
in next commit."
```

---

## Task 8: Remove `fetchTerreirosQueAdministro` from `PreferencesContext.tsx`

**Files:**
- Modify: `contexts/PreferencesContext.tsx`

- [ ] **Step 1: Confirm zero consumers remain**

Run: `grep -rn "fetchTerreirosQueAdministro" /mnt/c/saravafy/saravafy-mobile-app/src/ /mnt/c/saravafy/saravafy-mobile-app/contexts/ /mnt/c/saravafy/saravafy-mobile-app/app/`

Expected: ONLY the definition inside `PreferencesContext.tsx`. If any other consumer surfaces, stop and migrate it (Task 6/7 pattern) before proceeding.

- [ ] **Step 2: Delete the function body**

In `/mnt/c/saravafy/saravafy-mobile-app/contexts/PreferencesContext.tsx`, delete the entire `export async function fetchTerreirosQueAdministro(userId: string) { ... }` block (approximately lines 67–312; verify exact span by searching).

- [ ] **Step 3: Delete `isTerreiroMembersPolicyRecursionError` helper (now duplicated in me.ts)**

Search the rest of the file for any remaining usage of `isTerreiroMembersPolicyRecursionError`. If none remain (`grep "isTerreiroMembersPolicyRecursionError"` inside PreferencesContext.tsx returns 0 matches outside the helper definition itself), delete the helper definition.

If something else still uses it, keep it — note as DONE_WITH_CONCERNS for a future cleanup.

- [ ] **Step 4: Remove from context value type + provider**

Search for `fetchTerreirosQueAdministro` in the rest of `PreferencesContext.tsx`. Likely appears in:
- The `PreferencesContextValue` interface
- The provider's value object (where it's added to the context)

Remove both entries.

- [ ] **Step 5: Remove the `export type { ManagedTerreiro }` back-compat shim (added in Task 3)**

Verify no external consumer imports `ManagedTerreiro` from `@/contexts/PreferencesContext`:

```
grep -rn "ManagedTerreiro" /mnt/c/saravafy/saravafy-mobile-app/src/ | grep -v "src/queries/me" | head -10
```

If matches exist, update each importer to import from `@/src/queries/me` instead. Then remove the re-export from `PreferencesContext.tsx`.

- [ ] **Step 6: Verify TypeScript compiles**

```
npx tsc --noEmit 2>&1 | wc -l
```
Expected: 0 (matches baseline). If positive, investigate before commit.

- [ ] **Step 7: Run full test suite**

```
npm test
```
Expected: all tests pass (28 = 23 baseline + 5 new in me.test.ts).

- [ ] **Step 8: Commit**

```bash
git add contexts/PreferencesContext.tsx
git commit -m "refactor: remove fetchTerreirosQueAdministro from PreferencesContext

Server state no longer lives in context. Consumers (InviteGate,
TabsHeader, TerreiroEditor) now use useMyManagedTerreirosQuery
from src/queries/me.ts and queryClient.invalidateQueries for
post-mutation refresh.

Removes ~210 LOC of server fetch logic from the context provider,
including the RLS recursion fallback and schema-tolerance branches
(ported verbatim to src/queries/me.ts)."
```

---

## Task 9: Smoke test + cross-link audit doc

- [ ] **Step 1: Final test run**

```
npm test && npx tsc --noEmit 2>&1 | wc -l
```
Expected: all tests pass; tsc output is `0`.

- [ ] **Step 2: Manual smoke (requires dev client)**

Start: `npm run start:dev` (in a separate terminal).

In the dev client, walk through:
- Login → open Preferences/menu → confirm "Meus terreiros" admin list populates.
- Open Terreiro Editor for an admin terreiro → save changes → return to menu → confirm list reflects the change.
- (If you have a pending admin invite) Accept invite → return to menu → confirm new terreiro appears.

If any flow shows stale data, the `invalidateQueries` call site is wrong (probably wrong `userId` arg) — fix before proceeding.

- [ ] **Step 3: Cross-link audit doc**

Edit `/mnt/c/saravafy/saravafy-mobile-app/docs/architecture/code-quality-audit.md`. Find the row "**6. Move `PreferencesContext` server state → RQ**" (in §4 remediation order) and append:

```
 → [Spec 2b](../superpowers/specs/2026-06-14-spec-2b-preferences-context-rq.md)
```

- [ ] **Step 4: Final commit**

```bash
git add docs/architecture/code-quality-audit.md
git commit -m "docs: cross-link Spec 2b from code-quality-audit wave 6

Spec 2b complete: PreferencesContext server state migrated to
React Query. fetchTerreirosQueAdministro removed; 3 consumers
use useMyManagedTerreirosQuery + invalidateQueries instead."
```

---

## Implementation notes

**Total tasks:** 9
**Estimated time:** 3-5 hours
**Net LOC:** ~+340 new (hook + tests), ~-250 removed (legacy fn + type export) = **+90 LOC** (test code accounts for net positive; production code is -20).
**Commits:** 8 (Task 1 is read-only, no commit).

**If a step fails:**
- Test failure in Task 5 (fetcher): mock chain doesn't match supabase fluent API used. Inspect what `supabase.from(...).select(...).eq(...).in(...).eq(...)` actually returns in the implementation; adjust mock to match. Do NOT loosen test assertions to hide divergence — that defeats the test.
- TS error in Task 6/7 (consumer migration): likely the surrounding code expected `await fetchTerreirosQueAdministro(userId)` to return data inline. Re-read the surrounding code; if the data is used, refactor to use `useMyManagedTerreirosQuery` instead of `invalidateQueries`, or use `queryClient.fetchQuery({ queryKey, queryFn })` for one-shot reads.
- Smoke test stale data: `userId` mismatch in invalidate call. Compare the `userId` passed to `invalidateQueries` with the `userId` the hook reads — they must match exactly.

**Out of scope (reminder):**
- AddToCollection unification → Spec 2a (sibling).
- Other PreferencesContext concerns (theme, start page) → not addressed; only the server-fetch leak.
- Logout cache eviction for the new key (audit §6.10) → separate spec.
