import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import TestRenderer from "react-test-renderer";
import { useTerreiroRole } from "./useTerreiroRole";
import { flushMacrotask } from "../test-utils/supabaseQueryBuilderMock";

const mockMembership = jest.fn();

// Most tests here stub the membership hook outright (fast, and they only care
// about the permission mapping). The D8 regression test cannot: it has to
// populate the real query cache under a signed-in user and then drop the user,
// so it flips this flag and runs the real `useTerreiroMembershipStatus`.
// The flag is constant for the duration of any single test, so hook order
// never changes mid-render.
let mockUseRealMembership = false;

type MembershipRow = { terreiro_id: string; role: string; status: string };

let mockAuthUser: { id: string } | null = null;
let mockMembershipRowsByUser: Record<string, MembershipRow[]> = {};

jest.mock("./terreiroMembership", () => {
  const actual = jest.requireActual("./terreiroMembership");
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
  } = require("../test-utils/supabaseQueryBuilderMock");
  return mockSupabaseQueryBuilder({
    getMembershipRowsByUser: () => mockMembershipRowsByUser,
  });
});

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

function renderHookTest<T>(hook: () => T) {
  let result: { current?: T } = {};

  const TestComponent = () => {
    result.current = hook();
    return null;
  };

  TestRenderer.act(() => {
    TestRenderer.create(<TestComponent />);
  });
  return result;
}

type RoleResult = ReturnType<typeof useTerreiroRole>;

/** Renders `useTerreiroRole` over the real membership hook + a real QueryClient. */
function renderRoleWithQueryClient(initialTerreiroId: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  const result: { current: RoleResult | null } = { current: null };

  const Probe = ({ terreiroId }: { terreiroId: string }) => {
    result.current = useTerreiroRole(terreiroId);
    return null;
  };

  const tree = (terreiroId: string) => (
    <QueryClientProvider client={client}>
      <Probe terreiroId={terreiroId} />
    </QueryClientProvider>
  );

  let renderer!: ReturnType<typeof TestRenderer.create>;
  TestRenderer.act(() => {
    renderer = TestRenderer.create(tree(initialTerreiroId));
  });

  const settle = async () => {
    await TestRenderer.act(async () => {
      await flushMacrotask();
    });
  };

  const rerender = async (terreiroId: string) => {
    await TestRenderer.act(async () => {
      renderer.update(tree(terreiroId));
      await flushMacrotask();
    });
  };

  const unmount = () => {
    TestRenderer.act(() => {
      renderer.unmount();
    });
  };

  return { result, settle, rerender, unmount };
}

describe("useTerreiroRole", () => {
  beforeEach(() => {
    mockUseRealMembership = false;
    mockMembership.mockReset();
  });

  it("returns null role and all-false booleans when terreiroId is empty", () => {
    setMembership();
    const result = renderHookTest(() => useTerreiroRole(""));
    expect(result.current!.role).toBeNull();
    expect(result.current!.isAdmin).toBe(false);
    expect(result.current!.isMember).toBe(false);
    expect(result.current!.canEditCustomTags).toBe(false);
  });

  it("returns null role when terreiroId is undefined", () => {
    setMembership();
    const result = renderHookTest(() => useTerreiroRole(undefined));
    expect(result.current!.role).toBeNull();
  });

  it("returns admin role + all admin booleans true when membership is active admin", () => {
    setMembership({ role: "admin", isActiveMember: true });
    const result = renderHookTest(() => useTerreiroRole("t1"));
    expect(result.current!.role).toBe("admin");
    expect(result.current!.isAdmin).toBe(true);
    expect(result.current!.isCurimba).toBe(false);
    expect(result.current!.isAdminOrCurimba).toBe(true);
    expect(result.current!.canEditCustomTags).toBe(true);
    expect(result.current!.canManageMembers).toBe(true);
    expect(result.current!.canEditTerreiro).toBe(true);
    expect(result.current!.isMember).toBe(true);
  });

  it("curimba can edit custom tags but cannot manage members or edit terreiro", () => {
    setMembership({ role: "curimba", isActiveMember: true });
    const result = renderHookTest(() => useTerreiroRole("t1"));
    expect(result.current!.isCurimba).toBe(true);
    expect(result.current!.canEditCustomTags).toBe(true);
    expect(result.current!.canManageMembers).toBe(false);
    expect(result.current!.canEditTerreiro).toBe(false);
  });

  it("plain member has no edit permissions but isMember=true", () => {
    setMembership({ role: "member", isActiveMember: true });
    const result = renderHookTest(() => useTerreiroRole("t1"));
    expect(result.current!.role).toBe("member");
    expect(result.current!.isMember).toBe(true);
    expect(result.current!.canEditCustomTags).toBe(false);
    expect(result.current!.canManageMembers).toBe(false);
  });

  it("inactive member with role gets all-false permissions", () => {
    setMembership({ role: "admin", isActiveMember: false });
    const result = renderHookTest(() => useTerreiroRole("t1"));
    expect(result.current!.role).toBe("admin");
    expect(result.current!.isActiveMember).toBe(false);
    expect(result.current!.canEditCustomTags).toBe(false);
    expect(result.current!.canManageMembers).toBe(false);
  });

  it("passes through hasPendingRequest", () => {
    setMembership({ hasPendingRequest: true, pendingRequestId: "req-1" });
    const result = renderHookTest(() => useTerreiroRole("t1"));
    expect(result.current!.hasPendingRequest).toBe(true);
  });

  it("passes through isLoading", () => {
    setMembership({}, true);
    const result = renderHookTest(() => useTerreiroRole("t1"));
    expect(result.current!.isLoading).toBe(true);
  });
});

describe("useTerreiroRole — D8 regression, over the real membership hook", () => {
  beforeEach(() => {
    mockUseRealMembership = true;
    mockAuthUser = { id: "u1" };
    mockMembershipRowsByUser = {};
  });

  afterEach(() => {
    mockUseRealMembership = false;
  });

  it("grants nothing after logout even though an admin membership is still cached", async () => {
    mockMembershipRowsByUser.u1 = [
      { terreiro_id: "t1", role: "admin", status: "active" },
    ];

    const { result, settle, rerender, unmount } = renderRoleWithQueryClient("t1");
    await settle();

    // Precondition: a real admin session resolved, so the query cache holds the
    // rows the leak would otherwise keep serving to a signed-out viewer.
    expect(result.current!.role).toBe("admin");
    expect(result.current!.isAdmin).toBe(true);
    expect(result.current!.canEditCustomTags).toBe(true);

    // Act: the admin logs out. Same mounted component, session gone.
    mockAuthUser = null;
    await rerender("t1");

    expect(result.current!.role).toBeNull();
    expect(result.current!.canEditCustomTags).toBe(false);
    expect(result.current!.isAdmin).toBe(false);
    expect(result.current!.canManageMembers).toBe(false);
    expect(result.current!.canEditTerreiro).toBe(false);
    expect(result.current!.isAdminOrCurimba).toBe(false);
    expect(result.current!.isMember).toBe(false);

    unmount();
  });
});
