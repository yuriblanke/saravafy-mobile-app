import React from "react";
import TestRenderer from "react-test-renderer";
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

describe("useTerreiroRole", () => {
  beforeEach(() => mockMembership.mockReset());

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
