// Shared `@/lib/supabase` mock for the terreiro-membership hook tests
// (`terreiroMembership.test.tsx`, `useTerreiroRole.test.tsx`). Extracted
// because the two test files built near-identical fakes of the Supabase
// query-builder chain independently, which drifted whenever the real query
// shape changed in only one of them.
//
// State is read through getters rather than captured directly: jest.mock
// factories run before a test file's own `let` mock-state variables are
// initialized (they only need to resolve lazily, the first time the mocked
// module is required), and the tests reassign those variables (not just
// mutate them) in `beforeEach`. A getter always reads the current value.

export type MembershipRow = { terreiro_id: string; role: string; status: string };
export type PendingResponse = { data: { id: string } | null; error: null };

type PendingResponder = (
  terreiroId: string,
  userId: string
) => Promise<PendingResponse>;

type BuildOptions = {
  getMembershipRowsByUser: () => Record<string, MembershipRow[]>;
  // Optional: terreiroMembership.test.tsx exercises pending-request
  // responses per test; useTerreiroRole.test.tsx never needs that table to
  // return anything but empty, so it can omit this and get the same
  // `{ data: null, error: null }` it hardcoded before extraction.
  getPendingResponder?: () => PendingResponder;
};

/**
 * Builds the `{ supabase: { from } }` shape returned from
 * `jest.mock("@/lib/supabase", () => mockSupabaseQueryBuilder({ ... }))`.
 * Fakes the two tables used by the terreiro-membership hooks:
 * `terreiro_members` and `terreiro_membership_requests`.
 */
export function mockSupabaseQueryBuilder({
  getMembershipRowsByUser,
  getPendingResponder,
}: BuildOptions) {
  const build = (table: string) => {
    const filters: Record<string, unknown> = {};

    const run = async (): Promise<any> => {
      if (table === "terreiro_members") {
        const userId = String(filters.user_id ?? "");
        return { data: getMembershipRowsByUser()[userId] ?? [], error: null };
      }
      if (table === "terreiro_membership_requests") {
        const responder =
          getPendingResponder?.() ??
          (async () => ({ data: null, error: null }) as PendingResponse);
        return responder(
          String(filters.terreiro_id ?? ""),
          String(filters.user_id ?? "")
        );
      }
      throw new Error(`Unexpected table in test: ${table}`);
    };

    const builder: any = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters[column] = value;
        return builder;
      },
      in: () => builder,
      order: () => builder,
      maybeSingle: () => run(),
      // Makes the builder awaitable, like a real PostgrestFilterBuilder.
      then: (onFulfilled: any, onRejected: any) =>
        run().then(onFulfilled, onRejected),
    };

    return builder;
  };

  return { supabase: { from: (table: string) => build(table) } };
}

// React Query's notifyManager flushes its batch on a `setTimeout(0)`, so a
// single macrotask tick is not always enough to see a resolved query. Drain a
// few ticks so the assertions do not depend on scheduler luck.
export async function flushMacrotask() {
  for (let i = 0; i < 5; i += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}
