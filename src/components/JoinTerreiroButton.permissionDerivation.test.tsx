import React from "react";
import TestRenderer from "react-test-renderer";
import { useTerreiroRole } from "@/src/hooks/useTerreiroRole";

/**
 * Preservation test for task-6 (spec-10, S-3b).
 *
 * Before this refactor, JoinTerreiroButton.tsx decided whether the current
 * user was already a member by hand, straight off
 * `useTerreiroMembershipStatus`:
 *
 *   if (membership.data.isActiveMember) {
 *     showToast("Você já é membro deste terreiro.");
 *     return;
 *   }
 *
 * No role string is compared here, but `isActiveMember` is exactly the
 * "current user's standing in this terreiro" question `useTerreiroRole`
 * exists to answer canonically (its `isMember` field). This pins that value
 * against `useTerreiroRole.isMember` across the full membership-state
 * matrix. A mismatch on any state is the STOP CONDITION from the task
 * brief: a permission-rule change, not a refactor.
 *
 * JoinTerreiroButton still calls `useTerreiroMembershipStatus` directly for
 * `isLoading`/`reload()` (not exposed by `useTerreiroRole`), so this test
 * only covers the membership check that moved.
 */

const mockMembership = jest.fn();

// `jest.requireActual` below still runs terreiroMembership.ts's own
// top-level imports (AuthContext -> lib/supabase -> AsyncStorage), which
// fails to load under Jest. Mock those two out, same as
// useTerreiroRole.test.tsx does, since the real membership implementation
// is fully replaced anyway.
jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {},
}));

jest.mock("@/src/hooks/terreiroMembership", () => {
  const actual = jest.requireActual("@/src/hooks/terreiroMembership");
  return {
    ...actual,
    useTerreiroMembershipStatus: (terreiroId: string) =>
      mockMembership(terreiroId),
  };
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

const membershipStates: MembershipData[] = [
  { role: null, isActiveMember: false },
  { role: "member", isActiveMember: true },
  { role: "member", isActiveMember: false },
  { role: "curimba", isActiveMember: true },
  { role: "curimba", isActiveMember: false },
  { role: "admin", isActiveMember: true },
  { role: "admin", isActiveMember: false },
];

describe("JoinTerreiroButton permission derivation — preserved by useTerreiroRole", () => {
  beforeEach(() => {
    mockMembership.mockReset();
  });

  it.each(membershipStates)(
    "isMember matches the pre-refactor hand formula (membership.data.isActiveMember) for %j",
    (state) => {
      setMembership(state);
      const result = renderHookTest(() => useTerreiroRole("t1"));

      expect(result.current!.isMember).toBe(state.isActiveMember);
    }
  );
});
