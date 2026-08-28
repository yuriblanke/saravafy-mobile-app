import React from "react";
import TestRenderer from "react-test-renderer";
import { useTerreiroRole } from "@/src/hooks/useTerreiroRole";

/**
 * Preservation test for task-6 (spec-10, S-3b).
 *
 * Before this refactor, TerreiroBiblioteca.tsx derived the current user's
 * edit permission and "not a member yet" gate by hand, straight off
 * `useTerreiroMembershipStatus`:
 *
 *   const myRole = membership.role;
 *   const canEdit = membership.isActiveMember && (myRole === "admin" || myRole === "curimba");
 *   ...
 *   {!membership.isActiveMember ? <JoinTerreiroButton .../> : null}
 *
 * This pins those exact formulas (kept verbatim below, as they read before
 * the edit) against `useTerreiroRole`'s equivalent fields
 * (`isAdminOrCurimba`, `isActiveMember`) across the full membership-state
 * matrix. A mismatch on any state is the STOP CONDITION from the task
 * brief: a permission-rule change, not a refactor.
 *
 * TerreiroBiblioteca.tsx pulls in a native-module graph (reanimated,
 * expo-router, expo-linear-gradient, etc.) that Jest can't load, so this
 * tests the derivation at the hook seam instead of rendering the screen —
 * see task-6-brief.md's "Useful context" note.
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

// TerreiroBiblioteca.tsx's pre-refactor hand formula, kept verbatim for comparison.
function handCanEdit(data: MembershipData): boolean {
  return data.isActiveMember && (data.role === "admin" || data.role === "curimba");
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

describe("TerreiroBiblioteca permission derivation — preserved by useTerreiroRole", () => {
  beforeEach(() => {
    mockMembership.mockReset();
  });

  it.each(membershipStates)(
    "canEdit / join-gate match the pre-refactor hand formula for %j",
    (state) => {
      setMembership(state);
      const result = renderHookTest(() => useTerreiroRole("t1"));

      expect(result.current!.isAdminOrCurimba).toBe(handCanEdit(state));
      // JoinTerreiroButton's pre-refactor gate was `!membership.isActiveMember`.
      expect(result.current!.isActiveMember).toBe(state.isActiveMember);
    }
  );
});
