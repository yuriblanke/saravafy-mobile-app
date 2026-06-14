jest.mock("@/lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

jest.mock("@/src/domain/terreiroRoles", () => ({
  normalizeTerreiroRole: (r: unknown) =>
    typeof r === "string" && ["admin", "curimba", "member"].includes(r)
      ? r
      : null,
  normalizeTerreiroMemberKind: () => null,
}));

import { supabase } from "@/lib/supabase";

import { fetchMyManagedTerreiros } from "./me";

type BuilderResult = { data: unknown; error: unknown };

type Builder = {
  select: jest.Mock;
  eq: jest.Mock;
  in: jest.Mock;
  then: (resolve: (r: BuilderResult) => void) => void;
};

function makeBuilder(result: BuilderResult): Builder {
  const builder = {} as Builder;
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.in = jest.fn(() => builder);
  builder.then = (resolve) => resolve(result);
  return builder;
}

const fromMock = supabase.from as unknown as jest.Mock;

describe("fetchMyManagedTerreiros", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("returns empty array when userId is empty", async () => {
    const result = await fetchMyManagedTerreiros({ userId: "" });
    expect(result).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("maps admin memberships to ManagedTerreiro[] (happy path)", async () => {
    const membersBuilder = makeBuilder({
      data: [{ terreiro_id: "t1", role: "admin" }],
      error: null,
    });
    const terreirosBuilder = makeBuilder({
      data: [
        {
          id: "t1",
          title: "Terreiro Um",
          cover_image_url: "https://example.com/c.png",
        },
      ],
      error: null,
    });
    fromMock
      .mockReturnValueOnce(membersBuilder)
      .mockReturnValueOnce(terreirosBuilder);

    const result = await fetchMyManagedTerreiros({ userId: "u1" });

    expect(result).toEqual([
      {
        id: "t1",
        name: "Terreiro Um",
        avatarUrl: "https://example.com/c.png",
        role: "admin",
      },
    ]);
    expect(fromMock).toHaveBeenNthCalledWith(1, "terreiro_members");
    expect(fromMock).toHaveBeenNthCalledWith(2, "terreiros");
  });

  it("falls back to terreiros.created_by when membership returns no admin rows", async () => {
    const membersBuilder = makeBuilder({ data: [], error: null });
    const createdBuilder = makeBuilder({
      data: [
        {
          id: "t2",
          title: "Criado",
          cover_image_url: null,
          avatar_url: "https://example.com/a.png",
        },
      ],
      error: null,
    });
    fromMock
      .mockReturnValueOnce(membersBuilder)
      .mockReturnValueOnce(createdBuilder);

    const result = await fetchMyManagedTerreiros({ userId: "u1" });

    expect(result).toEqual([
      {
        id: "t2",
        name: "Criado",
        avatarUrl: "https://example.com/a.png",
        role: "admin",
      },
    ]);
    expect(createdBuilder.eq).toHaveBeenCalledWith("created_by", "u1");
  });

  it("falls back to terreiros.created_by on RLS infinite-recursion error", async () => {
    const membersBuilder = makeBuilder({
      data: null,
      error: {
        message:
          'infinite recursion detected in policy for relation "terreiro_members"',
        code: "42P17",
      },
    });
    const createdBuilder = makeBuilder({
      data: [
        {
          id: "t3",
          title: "Recovered",
          cover_image_url: "https://example.com/r.png",
        },
      ],
      error: null,
    });
    fromMock
      .mockReturnValueOnce(membersBuilder)
      .mockReturnValueOnce(createdBuilder);

    const result = await fetchMyManagedTerreiros({ userId: "u1" });

    expect(result).toEqual([
      {
        id: "t3",
        name: "Recovered",
        avatarUrl: "https://example.com/r.png",
        role: "admin",
      },
    ]);
    expect(createdBuilder.eq).toHaveBeenCalledWith("created_by", "u1");
  });

  it("retries membership without status filter when status column is missing", async () => {
    const failingMembers = makeBuilder({
      data: null,
      error: { message: 'column "status" does not exist' },
    });
    const retryingMembers = makeBuilder({
      data: [{ terreiro_id: "t4", role: "admin" }],
      error: null,
    });
    const terreirosBuilder = makeBuilder({
      data: [
        {
          id: "t4",
          title: "Quatro",
          cover_image_url: "https://example.com/4.png",
        },
      ],
      error: null,
    });
    fromMock
      .mockReturnValueOnce(failingMembers)
      .mockReturnValueOnce(retryingMembers)
      .mockReturnValueOnce(terreirosBuilder);

    const result = await fetchMyManagedTerreiros({ userId: "u1" });

    expect(result).toEqual([
      {
        id: "t4",
        name: "Quatro",
        avatarUrl: "https://example.com/4.png",
        role: "admin",
      },
    ]);
    expect(fromMock).toHaveBeenCalledTimes(3);
  });
});
