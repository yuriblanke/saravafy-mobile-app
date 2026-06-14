# Spec 1 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build pure additive foundation layer (`useTerreiroRole` hook, `getErrorMessage` util, `<QueryBoundary>` component) and validate via 4 sample adoptions, enabling subsequent specs (2-4) to consume these abstractions.

**Architecture:** New modules under `src/hooks/`, `src/lib/`, `src/components/`. Each module built on existing primitives (`useTerreiroMembershipStatus`, current inline error patterns, RQ query shape). Sample adoptions are mechanical replacements with zero behavior change. No new contexts, no RPC changes, no query key changes.

**Tech Stack:** React Native 0.76 / Expo SDK 52 / React Query v5 / TypeScript / Supabase. Plan introduces `jest-expo` as test runner (no existing test infra).

**Spec source:** `docs/superpowers/specs/2026-06-13-spec-1-foundations.md`

---

## File Structure

| File | Type | Responsibility |
|---|---|---|
| `package.json` | edit | Add `jest`, `jest-expo`, `@testing-library/react-native`, `@testing-library/jest-native`, `test` script |
| `jest.config.js` | create | jest-expo preset config |
| `jest.setup.ts` | create | Testing library matchers |
| `src/lib/errors.ts` | create | `getErrorMessage(e, fallback?)` shared util |
| `src/lib/errors.test.ts` | create | 6 branch tests |
| `src/hooks/useTerreiroRole.ts` | create | Per-terreiro role + permission derivation hook |
| `src/hooks/useTerreiroRole.test.tsx` | create | Hook tests across role/loading/missing states |
| `src/components/QueryBoundary.tsx` | create | Loading/error/empty/stale-while-revalidate wrapper |
| `src/components/QueryBoundary.test.tsx` | create | 4 state branch tests |
| `src/screens/Home/Home.tsx` | edit | Adoption: import `getErrorMessage` from `@/src/lib/errors`, remove local copy (lines 93-106) |
| `src/screens/Collection/Collection.tsx` | edit | Adoption: same removal (lines 90-102) + `useTerreiroRole(terreiroId).canEditCustomTags` (lines 240-243) |
| `src/screens/Player/PlayerScreen.tsx` | edit | Adoption: `useTerreiroRole(terreiroId).canEditCustomTags` (lines 218-220) |

**No file > 80 LOC introduced.** Each new module has single responsibility.

---

## Task 1: Bootstrap test infrastructure (jest-expo)

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`
- Create: `jest.setup.ts`

The mobile app has zero test infrastructure today (no `test` script, no jest config, no test files). This spec requires unit tests, and subsequent specs will too. Install once.

- [ ] **Step 1: Inspect current package.json `scripts` and `devDependencies`**

Run: `cat /mnt/c/saravafy/saravafy-mobile-app/package.json | grep -E "\"scripts\"|jest|testing-library" | head -20`
Expected: only `react-test-renderer` shows; no jest entries.

- [ ] **Step 2: Install jest-expo + testing-library**

Run from `/mnt/c/saravafy/saravafy-mobile-app/`:
```bash
npm install --save-dev jest jest-expo @testing-library/react-native @testing-library/jest-native @types/jest
```
Expected: clean install, no peer-dep errors. If peer-dep warnings about React 19, accept (jest-expo supports SDK 52).

- [ ] **Step 3: Add `test` and `test:watch` scripts to package.json**

In `package.json`, inside `"scripts"`, add:
```json
"test": "jest",
"test:watch": "jest --watch",
"test:ci": "jest --ci --silent"
```

- [ ] **Step 4: Create `jest.config.js`**

Create `/mnt/c/saravafy/saravafy-mobile-app/jest.config.js`:
```js
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEach: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/?(*.)+(test).[jt]s?(x)"],
  testPathIgnorePatterns: ["/node_modules/", "/android/", "/ios/"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@tanstack/react-query|@supabase/.*))",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts", "!src/**/*.test.{ts,tsx}"],
};
```

- [ ] **Step 5: Create `jest.setup.ts`**

Create `/mnt/c/saravafy/saravafy-mobile-app/jest.setup.ts`:
```ts
import "@testing-library/jest-native/extend-expect";
```

- [ ] **Step 6: Smoke test — create + run a trivial test**

Create `/mnt/c/saravafy/saravafy-mobile-app/src/lib/__smoke__.test.ts`:
```ts
describe("jest bootstrap", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npm test -- --testPathPattern=__smoke__`
Expected: PASS — 1 test passed.

If FAIL with "Cannot find module" or transform errors, fix `jest.config.js` `transformIgnorePatterns` before proceeding.

- [ ] **Step 7: Delete smoke test (no longer needed)**

Run: `rm /mnt/c/saravafy/saravafy-mobile-app/src/lib/__smoke__.test.ts`

- [ ] **Step 8: Commit**

```bash
cd /mnt/c/saravafy/saravafy-mobile-app
git add package.json package-lock.json jest.config.js jest.setup.ts
git commit -m "chore: bootstrap jest-expo + testing-library for unit tests

First test infra in mobile app. Required by Spec 1 (Foundations) and
subsequent specs. Smoke-verified with trivial test; harness boots and runs."
```

---

## Task 2: `getErrorMessage` utility — TDD

**Files:**
- Create: `src/lib/errors.ts`
- Create: `src/lib/errors.test.ts`

Single shared utility replacing 10+ duplicated copies across screens, queries, and components.

- [ ] **Step 1: Write the failing test**

Create `/mnt/c/saravafy/saravafy-mobile-app/src/lib/errors.test.ts`:
```ts
import { getErrorMessage } from "./errors";

describe("getErrorMessage", () => {
  it("returns Error.message when present and non-empty", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("trims and returns object.message when present", () => {
    expect(getErrorMessage({ message: "  hello  " })).toBe("  hello  ");
  });

  it("returns the input when it is a string", () => {
    expect(getErrorMessage("oops")).toBe("oops");
  });

  it("returns fallback for null", () => {
    expect(getErrorMessage(null, "default")).toBe("default");
  });

  it("returns fallback for undefined", () => {
    expect(getErrorMessage(undefined, "default")).toBe("default");
  });

  it("returns String(e) when no fallback is provided and shape is unknown", () => {
    expect(getErrorMessage({ noMessage: true })).toBe("[object Object]");
  });

  it("ignores empty Error.message and falls back to String(e)", () => {
    const err = new Error("");
    expect(getErrorMessage(err)).toBe(String(err));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npm test -- --testPathPattern=lib/errors`
Expected: FAIL with `Cannot find module './errors'`.

- [ ] **Step 3: Implement `getErrorMessage`**

Create `/mnt/c/saravafy/saravafy-mobile-app/src/lib/errors.ts`:
```ts
export function getErrorMessage(e: unknown, fallback?: string): string {
  if (e instanceof Error && typeof e.message === "string" && e.message.trim()) {
    return e.message;
  }

  if (e && typeof e === "object") {
    const anyErr = e as { message?: unknown };
    if (typeof anyErr.message === "string" && anyErr.message.trim()) {
      return anyErr.message;
    }
  }

  if (typeof e === "string") {
    return e;
  }

  if (e == null && fallback !== undefined) {
    return fallback;
  }

  return fallback ?? String(e);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npm test -- --testPathPattern=lib/errors`
Expected: PASS — 7 tests passed.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npx tsc --noEmit 2>&1 | grep -E "src/lib/errors" | head -5`
Expected: no output (no errors in new files).

- [ ] **Step 6: Commit**

```bash
cd /mnt/c/saravafy/saravafy-mobile-app
git add src/lib/errors.ts src/lib/errors.test.ts
git commit -m "feat: add getErrorMessage shared utility (src/lib/errors)

Single source for unknown-error → user-facing string conversion.
Replaces 10+ inline duplicates across screens, queries, and components.
Adoption deferred to Tasks 6, 7. Tests cover all 7 branches."
```

---

## Task 3: `useTerreiroRole` hook — TDD

**Files:**
- Create: `src/hooks/useTerreiroRole.ts`
- Create: `src/hooks/useTerreiroRole.test.tsx`

Per-terreiro role + permission lens built on existing `useTerreiroMembershipStatus`.

- [ ] **Step 1: Write the failing test**

Create `/mnt/c/saravafy/saravafy-mobile-app/src/hooks/useTerreiroRole.test.tsx`:
```tsx
import { renderHook } from "@testing-library/react-native";
import { useTerreiroRole } from "./useTerreiroRole";

const mockMembership = jest.fn();

jest.mock("./terreiroMembership", () => ({
  useTerreiroMembershipStatus: (terreiroId: string) => mockMembership(terreiroId),
}));

const baseData = {
  role: null as null | "admin" | "curimba" | "member",
  isActiveMember: false,
  pendingRequestId: null as string | null,
  hasPendingRequest: false,
};

function setMembership(overrides: Partial<typeof baseData> = {}, isLoading = false) {
  mockMembership.mockReturnValue({
    data: { ...baseData, ...overrides },
    isLoading,
    error: null,
    reload: jest.fn(),
  });
}

describe("useTerreiroRole", () => {
  beforeEach(() => mockMembership.mockReset());

  it("returns null role and all-false booleans when terreiroId is empty", () => {
    setMembership();
    const { result } = renderHook(() => useTerreiroRole(""));
    expect(result.current.role).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isMember).toBe(false);
    expect(result.current.canEditCustomTags).toBe(false);
  });

  it("returns null role when terreiroId is undefined", () => {
    setMembership();
    const { result } = renderHook(() => useTerreiroRole(undefined));
    expect(result.current.role).toBeNull();
  });

  it("returns admin role + all admin booleans true when membership is active admin", () => {
    setMembership({ role: "admin", isActiveMember: true });
    const { result } = renderHook(() => useTerreiroRole("t1"));
    expect(result.current.role).toBe("admin");
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isCurimba).toBe(false);
    expect(result.current.isAdminOrCurimba).toBe(true);
    expect(result.current.canEditCustomTags).toBe(true);
    expect(result.current.canManageMembers).toBe(true);
    expect(result.current.canEditTerreiro).toBe(true);
    expect(result.current.isMember).toBe(true);
  });

  it("curimba can edit custom tags but cannot manage members or edit terreiro", () => {
    setMembership({ role: "curimba", isActiveMember: true });
    const { result } = renderHook(() => useTerreiroRole("t1"));
    expect(result.current.isCurimba).toBe(true);
    expect(result.current.canEditCustomTags).toBe(true);
    expect(result.current.canManageMembers).toBe(false);
    expect(result.current.canEditTerreiro).toBe(false);
  });

  it("plain member has no edit permissions but isMember=true", () => {
    setMembership({ role: "member", isActiveMember: true });
    const { result } = renderHook(() => useTerreiroRole("t1"));
    expect(result.current.role).toBe("member");
    expect(result.current.isMember).toBe(true);
    expect(result.current.canEditCustomTags).toBe(false);
    expect(result.current.canManageMembers).toBe(false);
  });

  it("inactive member with role gets all-false permissions", () => {
    setMembership({ role: "admin", isActiveMember: false });
    const { result } = renderHook(() => useTerreiroRole("t1"));
    expect(result.current.role).toBe("admin");
    expect(result.current.isActiveMember).toBe(false);
    expect(result.current.canEditCustomTags).toBe(false);
    expect(result.current.canManageMembers).toBe(false);
  });

  it("passes through hasPendingRequest", () => {
    setMembership({ hasPendingRequest: true, pendingRequestId: "req-1" });
    const { result } = renderHook(() => useTerreiroRole("t1"));
    expect(result.current.hasPendingRequest).toBe(true);
  });

  it("passes through isLoading", () => {
    setMembership({}, true);
    const { result } = renderHook(() => useTerreiroRole("t1"));
    expect(result.current.isLoading).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npm test -- --testPathPattern=hooks/useTerreiroRole`
Expected: FAIL with `Cannot find module './useTerreiroRole'`.

- [ ] **Step 3: Implement `useTerreiroRole`**

Create `/mnt/c/saravafy/saravafy-mobile-app/src/hooks/useTerreiroRole.ts`:
```ts
import { useMemo } from "react";
import { useTerreiroMembershipStatus } from "./terreiroMembership";

export type TerreiroRole = "admin" | "curimba" | "member" | null;

export interface UseTerreiroRoleResult {
  role: TerreiroRole;
  isLoading: boolean;
  isActiveMember: boolean;
  hasPendingRequest: boolean;
  isAdmin: boolean;
  isCurimba: boolean;
  isAdminOrCurimba: boolean;
  isMember: boolean;
  canEditCustomTags: boolean;
  canManageMembers: boolean;
  canEditTerreiro: boolean;
}

export function useTerreiroRole(
  terreiroId: string | null | undefined,
): UseTerreiroRoleResult {
  const tid = typeof terreiroId === "string" ? terreiroId : "";
  const membership = useTerreiroMembershipStatus(tid);

  return useMemo(() => {
    const data = membership.data;
    const role: TerreiroRole = tid ? data.role : null;
    const isActiveMember = tid ? data.isActiveMember : false;
    const hasPendingRequest = tid ? data.hasPendingRequest : false;

    const isAdmin = isActiveMember && role === "admin";
    const isCurimba = isActiveMember && role === "curimba";
    const isAdminOrCurimba = isAdmin || isCurimba;
    const isMember = isActiveMember;

    return {
      role,
      isLoading: membership.isLoading,
      isActiveMember,
      hasPendingRequest,
      isAdmin,
      isCurimba,
      isAdminOrCurimba,
      isMember,
      canEditCustomTags: isAdminOrCurimba,
      canManageMembers: isAdmin,
      canEditTerreiro: isAdmin,
    };
  }, [
    tid,
    membership.data.role,
    membership.data.isActiveMember,
    membership.data.hasPendingRequest,
    membership.isLoading,
  ]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npm test -- --testPathPattern=hooks/useTerreiroRole`
Expected: PASS — 8 tests passed.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npx tsc --noEmit 2>&1 | grep -E "useTerreiroRole" | head -5`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd /mnt/c/saravafy/saravafy-mobile-app
git add src/hooks/useTerreiroRole.ts src/hooks/useTerreiroRole.test.tsx
git commit -m "feat: add useTerreiroRole permission hook

Per-terreiro role + permission lens built on useTerreiroMembershipStatus.
All can*/is* booleans gate on isActiveMember — inactive members never
pass permission checks. Tests cover all role/state combinations.
Adoption deferred to Tasks 7, 8."
```

---

## Task 4: `<QueryBoundary>` component — TDD

**Files:**
- Create: `src/components/QueryBoundary.tsx`
- Create: `src/components/QueryBoundary.test.tsx`

Loading/error/empty/stale-while-revalidate wrapper for React Query results.

- [ ] **Step 1: Write the failing test**

Create `/mnt/c/saravafy/saravafy-mobile-app/src/components/QueryBoundary.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { QueryBoundary } from "./QueryBoundary";

type Q<T> = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
};

function q<T>(over: Partial<Q<T>>): Q<T> {
  return { isLoading: false, isError: false, error: null, data: undefined, ...over };
}

describe("QueryBoundary", () => {
  it("renders default loading when isLoading=true and no data", () => {
    render(
      <QueryBoundary query={q<string>({ isLoading: true })}>
        {(d) => <Text>{d}</Text>}
      </QueryBoundary>,
    );
    expect(screen.getByTestId("query-boundary-loading")).toBeOnTheScreen();
  });

  it("renders default error when isError=true and no data", () => {
    render(
      <QueryBoundary query={q<string>({ isError: true, error: new Error("boom") })}>
        {(d) => <Text>{d}</Text>}
      </QueryBoundary>,
    );
    expect(screen.getByText("boom")).toBeOnTheScreen();
  });

  it("renders children when data is present", () => {
    render(
      <QueryBoundary query={q<string>({ data: "hello" })}>
        {(d) => <Text>{d}</Text>}
      </QueryBoundary>,
    );
    expect(screen.getByText("hello")).toBeOnTheScreen();
  });

  it("renders emptyState when empty predicate returns true", () => {
    render(
      <QueryBoundary
        query={q<string[]>({ data: [] })}
        empty={(d) => d.length === 0}
        emptyState={<Text>nothing</Text>}
      >
        {(d) => <Text>{d.join(",")}</Text>}
      </QueryBoundary>,
    );
    expect(screen.getByText("nothing")).toBeOnTheScreen();
  });

  it("stale-while-revalidate: renders children when data present even if isLoading=true", () => {
    render(
      <QueryBoundary query={q<string>({ isLoading: true, data: "stale" })}>
        {(d) => <Text>{d}</Text>}
      </QueryBoundary>,
    );
    expect(screen.getByText("stale")).toBeOnTheScreen();
    expect(screen.queryByTestId("query-boundary-loading")).toBeNull();
  });

  it("renders children when isError=true but data is present", () => {
    render(
      <QueryBoundary
        query={q<string>({ isError: true, error: new Error("x"), data: "cached" })}
      >
        {(d) => <Text>{d}</Text>}
      </QueryBoundary>,
    );
    expect(screen.getByText("cached")).toBeOnTheScreen();
  });

  it("uses custom loading slot when provided", () => {
    render(
      <QueryBoundary
        query={q<string>({ isLoading: true })}
        loading={<Text>custom-loading</Text>}
      >
        {(d) => <Text>{d}</Text>}
      </QueryBoundary>,
    );
    expect(screen.getByText("custom-loading")).toBeOnTheScreen();
  });

  it("uses custom error renderer when provided", () => {
    render(
      <QueryBoundary
        query={q<string>({ isError: true, error: new Error("e") })}
        error={(e) => <Text>err:{(e as Error).message}</Text>}
      >
        {(d) => <Text>{d}</Text>}
      </QueryBoundary>,
    );
    expect(screen.getByText("err:e")).toBeOnTheScreen();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npm test -- --testPathPattern=QueryBoundary`
Expected: FAIL with `Cannot find module './QueryBoundary'`.

- [ ] **Step 3: Implement `<QueryBoundary>`**

Create `/mnt/c/saravafy/saravafy-mobile-app/src/components/QueryBoundary.tsx`:
```tsx
import { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { getErrorMessage } from "@/src/lib/errors";

export interface QueryLike<T> {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
}

export interface QueryBoundaryProps<T> {
  query: QueryLike<T>;
  loading?: ReactNode;
  error?: (e: unknown) => ReactNode;
  empty?: (data: T) => boolean;
  emptyState?: ReactNode;
  children: (data: T) => ReactNode;
}

export function QueryBoundary<T>(props: QueryBoundaryProps<T>) {
  const { query, loading, error, empty, emptyState, children } = props;

  if (query.data !== undefined) {
    if (empty && empty(query.data)) {
      return <>{emptyState ?? null}</>;
    }
    return <>{children(query.data)}</>;
  }

  if (query.isError) {
    if (error) return <>{error(query.error)}</>;
    return <DefaultErrorCard error={query.error} />;
  }

  if (query.isLoading) {
    return <>{loading ?? <DefaultLoading />}</>;
  }

  return null;
}

function DefaultLoading() {
  return (
    <View style={styles.loadingContainer} testID="query-boundary-loading">
      <ActivityIndicator />
    </View>
  );
}

function DefaultErrorCard({ error }: { error: unknown }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Não foi possível carregar</Text>
      <Text style={styles.errorBody}>{getErrorMessage(error)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorContainer: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "rgba(244, 67, 54, 0.08)",
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  errorBody: {
    fontSize: 13,
    opacity: 0.8,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npm test -- --testPathPattern=QueryBoundary`
Expected: PASS — 8 tests passed.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npx tsc --noEmit 2>&1 | grep -E "QueryBoundary" | head -5`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd /mnt/c/saravafy/saravafy-mobile-app
git add src/components/QueryBoundary.tsx src/components/QueryBoundary.test.tsx
git commit -m "feat: add QueryBoundary component

Loading/error/empty wrapper for React Query results.
Stale-while-revalidate: if data is present, renders children even
during background refetch or transient error — prevents flicker.
Adoption deferred to Task 9."
```

---

## Task 5: Run full test suite to confirm green baseline

- [ ] **Step 1: Run all tests**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npm test`
Expected: PASS — 23 tests across 3 files (7 errors + 8 useTerreiroRole + 8 QueryBoundary).

- [ ] **Step 2: Confirm TypeScript still compiles**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npx tsc --noEmit 2>&1 | wc -l`
Record number. If it matches the pre-Spec-1 baseline (pre-existing errors only), proceed. If new errors appear, fix before adoption tasks.

---

## Task 6: Adoption — replace local `getErrorMessage` in `Home.tsx`

**Files:**
- Modify: `src/screens/Home/Home.tsx:93-106`

- [ ] **Step 1: Add import**

In `/mnt/c/saravafy/saravafy-mobile-app/src/screens/Home/Home.tsx`, add to existing imports block (preserve existing order):
```ts
import { getErrorMessage } from "@/src/lib/errors";
```

- [ ] **Step 2: Delete local `getErrorMessage` function (lines 93-106)**

Remove the block:
```ts
function getErrorMessage(e: unknown): string {
  if (e instanceof Error && typeof e.message === "string" && e.message.trim()) {
    return e.message;
  }

  if (e && typeof e === "object") {
    const anyErr = e as any;
    if (typeof anyErr.message === "string" && anyErr.message.trim()) {
      return anyErr.message;
    }
  }

  return String(e);
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npx tsc --noEmit 2>&1 | grep "Home.tsx" | head -5`
Expected: no new errors specific to Home.tsx.

- [ ] **Step 4: Commit**

```bash
cd /mnt/c/saravafy/saravafy-mobile-app
git add src/screens/Home/Home.tsx
git commit -m "refactor: Home uses shared getErrorMessage util

Sample adoption 1 of Spec 1. Removes local copy (-14 LOC).
Behavior identical: same branch order, same fallback to String(e)."
```

---

## Task 7: Adoption — replace local `getErrorMessage` in `Collection.tsx`

**Files:**
- Modify: `src/screens/Collection/Collection.tsx:90-102`

- [ ] **Step 1: Add import**

In `/mnt/c/saravafy/saravafy-mobile-app/src/screens/Collection/Collection.tsx`, add:
```ts
import { getErrorMessage } from "@/src/lib/errors";
```

- [ ] **Step 2: Delete local `getErrorMessage` function (lines 90-102 in original; line numbers may have shifted)**

Locate the local `function getErrorMessage(e: unknown): string {` block and remove it entirely.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npx tsc --noEmit 2>&1 | grep "Collection.tsx" | head -5`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd /mnt/c/saravafy/saravafy-mobile-app
git add src/screens/Collection/Collection.tsx
git commit -m "refactor: Collection uses shared getErrorMessage util

Sample adoption 2 of Spec 1. Removes local copy."
```

---

## Task 8: Adoption — `useTerreiroRole` in `Collection.tsx`

**Files:**
- Modify: `src/screens/Collection/Collection.tsx:240-243`

Replace inline role check with hook. Verify behavior preserved.

- [ ] **Step 1: Add import**

In `/mnt/c/saravafy/saravafy-mobile-app/src/screens/Collection/Collection.tsx`, add:
```ts
import { useTerreiroRole } from "@/src/hooks/useTerreiroRole";
```

- [ ] **Step 2: Replace inline canEditCustomTags computation**

Locate (around line 234-243):
```ts
const membership = useTerreiroMembershipStatus(terreiroId);
const createRequest = useCreateTerreiroMembershipRequest(
  isMembersOnly ? terreiroId : ""
);

const myRole = membership.data.role;
const canEditCustomTags =
  !!terreiroId &&
  membership.data.isActiveMember &&
  (myRole === "admin" || myRole === "curimba");
```

Replace with:
```ts
const membership = useTerreiroMembershipStatus(terreiroId);
const createRequest = useCreateTerreiroMembershipRequest(
  isMembersOnly ? terreiroId : ""
);

const terreiroRole = useTerreiroRole(terreiroId);
const myRole = terreiroRole.role;
const canEditCustomTags = terreiroRole.canEditCustomTags;
```

(Note: `membership` is still used downstream for `isActiveMember`, `hasPendingRequest`, `pendingRequestId`, etc. — keep that call; the new hook is additive.)

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npx tsc --noEmit 2>&1 | grep "Collection.tsx" | head -10`
Expected: no new errors.

- [ ] **Step 4: Smoke test — render Collection screen**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npm run start:dev` (in a separate terminal — leave running).

Manually open a collection screen in the dev client. Verify:
- Pontos load.
- "Add tag" / "Remove tag" sheets appear only for admin/curimba of the owning terreiro.
- Plain members and non-members see no edit affordances.

If behavior changes, stop and inspect — `useTerreiroRole` must return same `canEditCustomTags` as the old expression.

- [ ] **Step 5: Commit**

```bash
cd /mnt/c/saravafy/saravafy-mobile-app
git add src/screens/Collection/Collection.tsx
git commit -m "refactor: Collection uses useTerreiroRole for canEditCustomTags

Sample adoption 3 of Spec 1. Replaces 3-clause inline check with
useTerreiroRole(terreiroId).canEditCustomTags. Membership query call
preserved for downstream consumers (isActiveMember, hasPendingRequest)."
```

---

## Task 9: Adoption — `useTerreiroRole` in `PlayerScreen.tsx`

**Files:**
- Modify: `src/screens/Player/PlayerScreen.tsx:215-220`

- [ ] **Step 1: Add import**

In `/mnt/c/saravafy/saravafy-mobile-app/src/screens/Player/PlayerScreen.tsx`, add:
```ts
import { useTerreiroRole } from "@/src/hooks/useTerreiroRole";
```

- [ ] **Step 2: Replace inline canSeeMediumTags / canEdit derivation**

Locate (around line 215-220):
```ts
const myTerreiroRole = ...; // existing computation
const canEditCustomTags =
  !!terreiroId &&
  membership.data.isActiveMember &&
  (myTerreiroRole === "admin" || myTerreiroRole === "curimba");
```

Replace the `canEditCustomTags` expression with:
```ts
const terreiroRole = useTerreiroRole(terreiroId);
const canEditCustomTags = terreiroRole.canEditCustomTags;
```

(If `myTerreiroRole` is used elsewhere in the file, keep it sourced from the same place; only replace the permission boolean.)

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npx tsc --noEmit 2>&1 | grep "PlayerScreen.tsx" | head -10`
Expected: no new errors.

- [ ] **Step 4: Smoke test — Player screen**

In dev client (still running), open the player from a terreiro's collection. Verify:
- Same tag edit gating as before (admin/curimba only).
- Player playback still works.
- No console warnings about hook order changes.

- [ ] **Step 5: Commit**

```bash
cd /mnt/c/saravafy/saravafy-mobile-app
git add src/screens/Player/PlayerScreen.tsx
git commit -m "refactor: PlayerScreen uses useTerreiroRole for canEditCustomTags

Sample adoption 4 of Spec 1. Same pattern as Collection adoption."
```

---

## Task 10: Adoption — `<QueryBoundary>` for Home pontos query

**Files:**
- Modify: `src/screens/Home/Home.tsx` (locate the main pontos list query render)

Validates `<QueryBoundary>` loading + error + empty + stale-while-revalidate paths on a real query consumer.

- [ ] **Step 1: Locate the Home pontos query render block**

Run: `grep -n "useQuery\|isLoading\|pontos.*map\|FlatList\|ScrollView" /mnt/c/saravafy/saravafy-mobile-app/src/screens/Home/Home.tsx | head -20`

Identify the block that renders pontos with conditional loading/error/empty UI. Read 30 lines of context around it.

- [ ] **Step 2: Wrap the render with `<QueryBoundary>`**

Replace the conditional loading/error/empty scaffolding with the shape below. Use the actual query variable name from the file (Step 1 identified it):

```tsx
<QueryBoundary
  query={pontosQuery}
  empty={(items) => items.length === 0}
  emptyState={
    <View style={{ padding: 24, alignItems: "center" }}>
      <Text>Nenhum ponto encontrado.</Text>
    </View>
  }
>
  {(items) => (
    /* Move the existing list render here, referencing `items`
       instead of whatever variable name held the query result. */
  )}
</QueryBoundary>
```

Rules:
- Do NOT pass a custom `loading` slot — use the boundary's default `ActivityIndicator`. This validates the default visually.
- Do NOT pass a custom `error` renderer — use the boundary's default error card. Same reason.
- Keep `View`/`Text` import additions co-located with existing RN imports.
- If the existing render references the query result via a variable named e.g. `pontosList` or `feedItems`, rename the closure param `items` to match for minimal diff, OR keep `items` and update internal refs — pick whichever produces the smaller diff.

If no clean wrap site exists (the query is consumed across multiple places in the same render), pick the most contained block and document the limitation in the commit message. Do not force-fit.

- [ ] **Step 3: Add import**

In `/mnt/c/saravafy/saravafy-mobile-app/src/screens/Home/Home.tsx`:
```ts
import { QueryBoundary } from "@/src/components/QueryBoundary";
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npx tsc --noEmit 2>&1 | grep "Home.tsx" | head -5`
Expected: no new errors.

- [ ] **Step 5: Smoke test — Home screen**

In dev client, open Home. Verify:
- Initial load shows loading spinner.
- Pontos render when data arrives.
- Pull-to-refresh during stale state shows pontos (no flicker to loading).
- Disable network → pull-to-refresh → no flicker, may show error eventually.
- Empty search query result shows empty state.

- [ ] **Step 6: Commit**

```bash
cd /mnt/c/saravafy/saravafy-mobile-app
git add src/screens/Home/Home.tsx
git commit -m "refactor: Home uses QueryBoundary for pontos query

Sample adoption 5 (final) of Spec 1. Validates QueryBoundary in
real consumer: loading, error, empty, and stale-while-revalidate paths.
Removes ad-hoc conditional scaffolding."
```

---

## Task 11: Final verification + cross-link audit doc

- [ ] **Step 1: Run full test suite**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npm test`
Expected: all tests pass (count = pre-spec count + 23).

- [ ] **Step 2: TypeScript clean check**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npx tsc --noEmit 2>&1 | wc -l`
Compare to baseline recorded in Task 5 Step 2. Number must be equal or lower — never higher.

- [ ] **Step 3: Update audit doc cross-reference**

Edit `/mnt/c/saravafy/saravafy-mobile-app/docs/architecture/code-quality-audit.md`. In §4 ("Recommended remediation order"), append column linking waves 2 + 3 to Spec 1:

Find the row "**2. Extract `useTerreiroRole(terreiroId)`**" and append at end of row: `→ [Spec 1](../superpowers/specs/2026-06-13-spec-1-foundations.md)`

Find the row "**3. Build `<QueryBoundary>` + `getErrorMessage` util**" and append: `→ [Spec 1](../superpowers/specs/2026-06-13-spec-1-foundations.md)`

- [ ] **Step 4: Smoke test — full app launch in dev client**

Run: `cd /mnt/c/saravafy/saravafy-mobile-app && npm run start:dev`

Launch on Android or iOS simulator. Walk through:
- Login → Home loads → search for ponto → open player → open collection from terreiro → verify tag edit gating.
- No crashes, no console errors, no visible regressions.

- [ ] **Step 5: Final commit**

```bash
cd /mnt/c/saravafy/saravafy-mobile-app
git add docs/architecture/code-quality-audit.md
git commit -m "docs: cross-link Spec 1 from code-quality-audit waves 2,3

Spec 1 (Foundations) complete: useTerreiroRole hook, getErrorMessage
util, QueryBoundary component, 5 sample adoptions, jest-expo test infra.
Unblocks Specs 2-4 which consume these primitives."
```

---

## Implementation notes

**Total tasks:** 11
**Estimated total time:** 4-6 hours
**Net LOC change:** +280 new, -29 removed (in adoption sites)
**Tests added:** 23 (jest-expo baseline)
**Commits:** 11 (one per task)

**Adoption deferred to later specs** (intentionally NOT done in Spec 1):
- 8 remaining `getErrorMessage` local copies (queries, components, ReviewSubmission, etc.) → Spec 2 or 3 mechanical sweep.
- 10+ remaining inline role checks across `TabsHeaderWithPreferences`, `InviteGate`, `AccessManager` → Spec 2 (Dedup wave).
- `<QueryBoundary>` adoption at remaining 14+ query consumers → opportunistic in Specs 2-4.

**If a step fails:**
- TypeScript error in adoption task → revert the file (`git checkout src/screens/<file>`), re-read the new API, retry.
- Test failure in foundation task → fix the implementation, never the test. The test encodes the spec contract.
- Smoke test regression → the hook/component returns a different value than the inline expression. Re-read the spec §3.1 / §3.3 contract; check `isActiveMember` gating in particular.

**Out of scope for this plan:**
- Adopting `getErrorMessage` everywhere.
- Migrating all inline role checks.
- Performance fixes (N+1 cascades, FlatList migration).
- TS `any` cleanup.

Those land in Specs 2, 3, 4 respectively.
