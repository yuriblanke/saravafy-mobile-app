import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import TestRenderer from "react-test-renderer";
import { useTerreiroMembershipStatus } from "@/src/hooks/terreiroMembership";
import { useTerreiroRole } from "@/src/hooks/useTerreiroRole";
import { flushMacrotask } from "@/src/test-utils/supabaseQueryBuilderMock";

/**
 * Preservation test for task-6 (spec-10, S-3b) — Collection.tsx, the
 * "does both at once" target.
 *
 * Before this refactor, Collection.tsx called BOTH:
 *   - `useTerreiroMembershipStatus(terreiroId)` directly (as `membership`,
 *     still needed here for isMember/hasPendingRequest/reload/isLoading), and
 *   - `useTerreiroRole(terreiroId)` (as `terreiroRole`, for canEditCustomTags)
 *
 * ...and then recombined pieces of both, by hand, for `canEditCollection`:
 *
 *   const myRole = terreiroRole.role;
 *   const canEditCollection =
 *     (own-collection check) ||
 *     (!!terreiroId && membership.data.isActiveMember && (myRole === "admin" || myRole === "curimba"));
 *
 * That is a second, independent derivation of exactly what
 * `terreiroRole.isAdminOrCurimba` already computes — two derivations of the
 * same thing in one component, per the task brief. This file has two parts:
 *
 * 1. A mock-matrix proof that the formula
 *    `isActiveMember && (role === "admin" || role === "curimba")` — the
 *    terreiro-membership half of the pre-refactor `canEditCollection` —
 *    equals `useTerreiroRole.isAdminOrCurimba` for every membership state.
 * 2. A real-QueryClient proof that the two hook CALLS (not just the
 *    formula) actually share one cache entry when fed the same terreiroId:
 *    `useTerreiroMembershipStatus(id).data.isActiveMember` and
 *    `useTerreiroRole(id).isActiveMember` must be identical, because that's
 *    the premise the collapse relies on — if they were two independently
 *    fetched sources that only happened to agree in a mock, collapsing them
 *    would be unsafe.
 *
 * Collection.tsx pulls in a native-module graph (reanimated, expo-router,
 * etc.) that Jest can't load, so this tests the derivation at the hook seam
 * instead of rendering the screen — see task-6-brief.md's "Useful context"
 * note.
 */

const mockMembership = jest.fn();

// Part 1 stubs the membership hook outright (fast, only cares about the
// permission formula). Part 2 cannot: it needs the real
// `useTerreiroMembershipStatus`, backed by a real QueryClient, so both hook
// call-sites can be proven to read the same cache entry. The flag is
// constant for the duration of any single test, so hook order never changes
// mid-render.
let mockUseRealMembership = false;

type MembershipRow = { terreiro_id: string; role: string; status: string };

let mockAuthUser: { id: string } | null = null;
let mockMembershipRowsByUser: Record<string, MembershipRow[]> = {};

jest.mock("@/src/hooks/terreiroMembership", () => {
  const actual = jest.requireActual("@/src/hooks/terreiroMembership");
  return {
    ...actual,
    useTerreiroMembershipStatus: (terreiroId: string) =>
      mockUseRealMembership
        ? actual.useTerreiroMembershipStatus(terreiroId)
        : mockMembership(terreiroId),
  };
});

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

jest.mock("@/lib/supabase", () => {
  const {
    mockSupabaseQueryBuilder,
  } = require("@/src/test-utils/supabaseQueryBuilderMock");
  return mockSupabaseQueryBuilder({
    getMembershipRowsByUser: () => mockMembershipRowsByUser,
  });
});

type MembershipData = {
  role: "admin" | "curimba" | "member" | null;
  isActiveMember: boolean;
};

function setMembership(data: MembershipData, isLoading = false) {
  mockMembership.mockReturnValue({
    data: { ...data, pendingRequestId: null, hasPendingRequest: false },
    isLoading,
    error: null,
    reload: jest.fn(),
  });
}

function renderHookTest<T>(hook: () => T) {
  const result: { current?: T } = {};
  const TestComponent = () => {
    result.current = hook();
    return null;
  };
  TestRenderer.act(() => {
    TestRenderer.create(<TestComponent />);
  });
  return result;
}

// Collection.tsx's pre-refactor hand formula (terreiro-membership half of
// canEditCollection), kept verbatim for comparison.
function handIsAdminOrCurimba(data: MembershipData): boolean {
  return (
    data.isActiveMember && (data.role === "admin" || data.role === "curimba")
  );
}

const membershipStates: MembershipData[] = [
  { role: null, isActiveMember: false },
  { role: "member", isActiveMember: true },
  { role: "member", isActiveMember: false },
  { role: "curimba", isActiveMember: true },
  { role: "curimba", isActiveMember: false },
  { role: "admin", isActiveMember: true },
  { role: "admin", isActiveMember: false },
];

describe("Collection permission derivation — formula preserved by useTerreiroRole", () => {
  beforeEach(() => {
    mockUseRealMembership = false;
    mockMembership.mockReset();
  });

  it.each(membershipStates)(
    "canEditCollection's terreiro clause matches the pre-refactor hand formula for %j",
    (state) => {
      setMembership(state);
      const result = renderHookTest(() => useTerreiroRole("t1"));

      expect(result.current!.isAdminOrCurimba).toBe(
        handIsAdminOrCurimba(state)
      );
    }
  );
});

describe("Collection permission derivation — the two hook calls share one cache entry", () => {
  beforeEach(() => {
    mockUseRealMembership = true;
    mockAuthUser = { id: "u1" };
    mockMembershipRowsByUser = {};
  });

  afterEach(() => {
    mockUseRealMembership = false;
  });

  it("useTerreiroMembershipStatus(id).data and useTerreiroRole(id) agree under a real QueryClient — the collapse is only safe if they always did", async () => {
    mockMembershipRowsByUser.u1 = [
      { terreiro_id: "t1", role: "admin", status: "active" },
    ];

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });

    const rawResult: {
      current?: ReturnType<typeof useTerreiroMembershipStatus>;
    } = {};
    const roleResult: { current?: ReturnType<typeof useTerreiroRole> } = {};

    const Probe = () => {
      rawResult.current = useTerreiroMembershipStatus("t1");
      roleResult.current = useTerreiroRole("t1");
      return null;
    };

    let renderer!: ReturnType<typeof TestRenderer.create>;
    TestRenderer.act(() => {
      renderer = TestRenderer.create(
        <QueryClientProvider client={client}>
          <Probe />
        </QueryClientProvider>
      );
    });

    await TestRenderer.act(async () => {
      await flushMacrotask();
    });

    // Precondition: the real fetch resolved to an active admin.
    expect(rawResult.current!.data.isActiveMember).toBe(true);
    expect(rawResult.current!.data.role).toBe("admin");

    // The point of the test: both call-sites, fed the same terreiroId,
    // report the same values — proving `membership.data.isActiveMember`
    // and `terreiroRole.isActiveMember` were never two independent sources.
    expect(roleResult.current!.isActiveMember).toBe(
      rawResult.current!.data.isActiveMember
    );
    expect(roleResult.current!.role).toBe(rawResult.current!.data.role);
    expect(roleResult.current!.isAdminOrCurimba).toBe(true);

    TestRenderer.act(() => {
      renderer.unmount();
    });
  });
});
