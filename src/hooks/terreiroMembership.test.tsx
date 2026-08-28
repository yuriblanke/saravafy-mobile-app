import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import TestRenderer from "react-test-renderer";

import { useTerreiroMembershipStatus } from "./terreiroMembership";
import { flushMacrotask } from "../test-utils/supabaseQueryBuilderMock";
import type { PendingResponse } from "../test-utils/supabaseQueryBuilderMock";

type MembershipRow = {
  terreiro_id: string;
  role: string;
  status: string;
};

// Mutable module-level state driven per test. Names must start with `mock` so
// babel-plugin-jest-hoist allows the jest.mock factories to close over them.
let mockAuthUser: { id: string } | null = null;
let mockMembershipRowsByUser: Record<string, MembershipRow[]> = {};
let mockPendingResponder: (
  terreiroId: string,
  userId: string
) => Promise<PendingResponse> = async () => ({ data: null, error: null });

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

jest.mock("@/lib/supabase", () => {
  const {
    mockSupabaseQueryBuilder,
  } = require("../test-utils/supabaseQueryBuilderMock");
  return mockSupabaseQueryBuilder({
    getMembershipRowsByUser: () => mockMembershipRowsByUser,
    getPendingResponder: () => mockPendingResponder,
  });
});

type Status = ReturnType<typeof useTerreiroMembershipStatus>;

function renderMembership(initialTerreiroId: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  const result: { current: Status | null } = { current: null };

  const Probe = ({ terreiroId }: { terreiroId: string }) => {
    result.current = useTerreiroMembershipStatus(terreiroId);
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

describe("useTerreiroMembershipStatus", () => {
  beforeEach(() => {
    mockAuthUser = { id: "u1" };
    mockMembershipRowsByUser = {};
    mockPendingResponder = async () => ({ data: null, error: null });
  });

  it("returns admin role and active membership when userId is present", async () => {
    mockMembershipRowsByUser.u1 = [
      { terreiro_id: "t1", role: "admin", status: "active" },
    ];

    const { result, settle, unmount } = renderMembership("t1");
    await settle();

    expect(result.current!.data.role).toBe("admin");
    expect(result.current!.data.isActiveMember).toBe(true);

    unmount();
  });

  it("returns no role when userId is null even though a prior query resolved", async () => {
    mockMembershipRowsByUser.u1 = [
      { terreiro_id: "t1", role: "admin", status: "active" },
    ];

    const { result, settle, rerender, unmount } = renderMembership("t1");
    await settle();

    // Precondition: the admin session really did resolve, so the query cache
    // holds the rows that the leak would later serve to a signed-out viewer.
    expect(result.current!.data.role).toBe("admin");

    // Act: the admin logs out. Same mounted component, userId gone.
    mockAuthUser = null;
    await rerender("t1");

    expect(result.current!.data.role).toBeNull();
    expect(result.current!.data.isActiveMember).toBe(false);
    expect(result.current!.data.hasPendingRequest).toBe(false);
    expect(result.current!.data.pendingRequestId).toBeNull();

    unmount();
  });

  it("returns no pending request when userId is null even though a prior request resolved", async () => {
    mockMembershipRowsByUser.u1 = [];
    mockPendingResponder = async (terreiroId) =>
      terreiroId === "t1"
        ? { data: { id: "req-1" }, error: null }
        : { data: null, error: null };

    const { result, settle, rerender, unmount } = renderMembership("t1");
    await settle();

    expect(result.current!.data.hasPendingRequest).toBe(true);
    expect(result.current!.data.pendingRequestId).toBe("req-1");

    mockAuthUser = null;
    await rerender("t1");

    expect(result.current!.data.hasPendingRequest).toBe(false);
    expect(result.current!.data.pendingRequestId).toBeNull();

    unmount();
  });

  it("re-derives the role per terreiro when terreiroId changes while userId stays", async () => {
    mockMembershipRowsByUser.u1 = [
      { terreiro_id: "t1", role: "admin", status: "active" },
      { terreiro_id: "t2", role: "member", status: "active" },
    ];

    const { result, settle, rerender, unmount } = renderMembership("t1");
    await settle();

    expect(result.current!.data.role).toBe("admin");

    await rerender("t2");

    expect(result.current!.data.role).toBe("member");
    expect(result.current!.data.isActiveMember).toBe(true);

    unmount();
  });

  it("keeps serving previously fetched data while an in-session terreiro switch is in flight", async () => {
    // Guards spec section 5: `placeholderData: (prev) => prev` must survive.
    // Deleting it would make this flash to null mid-switch.
    mockMembershipRowsByUser.u1 = [];

    let resolveT2: (value: PendingResponse) => void = () => {};
    mockPendingResponder = async (terreiroId) => {
      if (terreiroId === "t1") return { data: { id: "req-1" }, error: null };
      return new Promise<PendingResponse>((resolve) => {
        resolveT2 = resolve;
      });
    };

    const { result, settle, rerender, unmount } = renderMembership("t1");
    await settle();

    expect(result.current!.data.pendingRequestId).toBe("req-1");

    // Switch terreiro while still signed in; t2's query has not resolved yet.
    await rerender("t2");

    expect(result.current!.data.pendingRequestId).toBe("req-1");
    expect(result.current!.data.hasPendingRequest).toBe(true);

    await TestRenderer.act(async () => {
      resolveT2({ data: null, error: null });
      await flushMacrotask();
    });

    expect(result.current!.data.pendingRequestId).toBeNull();
    expect(result.current!.data.hasPendingRequest).toBe(false);

    unmount();
  });
});
