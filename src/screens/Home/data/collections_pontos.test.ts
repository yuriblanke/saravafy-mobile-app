jest.mock("@/lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

import { supabase } from "@/lib/supabase";

import { addPontoToCollection } from "./collections_pontos";

type BuilderResult = { data: unknown; error: unknown };

type Builder = {
  select: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  upsert: jest.Mock;
  then: (resolve: (r: BuilderResult) => void) => void;
};

/**
 * Um builder encadeável e "thenable", como o do supabase-js: qualquer cadeia
 * resolve no mesmo `result`. Serve tanto para o `select` de `fetchNextPosition`
 * quanto para o `upsert` da escrita.
 */
function makeBuilder(result: BuilderResult): Builder {
  const builder = {} as Builder;
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.order = jest.fn(() => builder);
  builder.limit = jest.fn(() => builder);
  builder.upsert = jest.fn(() => builder);
  builder.then = (resolve) => resolve(result);
  return builder;
}

/** Leitura de `max(position)`: coleção vazia → próxima posição 1. */
function makePositionBuilder(maxPosition: number | null): Builder {
  return makeBuilder({
    data: maxPosition == null ? [] : [{ position: maxPosition }],
    error: null,
  });
}

const fromMock = supabase.from as unknown as jest.Mock;

const PARAMS = {
  collectionId: "c1",
  pontoId: "p1",
  addedBy: "u1",
};

describe("addPontoToCollection", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("reports a plain success when a row was actually inserted", async () => {
    const positionBuilder = makePositionBuilder(3);
    // INSERT ... ON CONFLICT DO NOTHING RETURNING: inseriu → devolve 1 linha.
    const upsertBuilder = makeBuilder({
      data: [{ ponto_id: "p1" }],
      error: null,
    });
    fromMock
      .mockReturnValueOnce(positionBuilder)
      .mockReturnValueOnce(upsertBuilder);

    const result = await addPontoToCollection(PARAMS);

    expect(result).toEqual({ ok: true });

    // §2.3: `ignoreDuplicates: true` não pode ser invertido — senão um add
    // duplicado sobrescreveria position/added_by/entidade da linha existente.
    const [, options] = upsertBuilder.upsert.mock.calls[0];
    expect(options).toMatchObject({
      onConflict: "collection_id,ponto_id",
      ignoreDuplicates: true,
    });
  });

  it("reports alreadyExists when the insert was ignored", async () => {
    const positionBuilder = makePositionBuilder(3);
    // ON CONFLICT DO NOTHING: conflitou → sem erro, sem linha.
    const upsertBuilder = makeBuilder({ data: [], error: null });
    fromMock
      .mockReturnValueOnce(positionBuilder)
      .mockReturnValueOnce(upsertBuilder);

    const result = await addPontoToCollection(PARAMS);

    expect(result).toEqual({ ok: true, alreadyExists: true });
  });

  it("retries when the position unique constraint collides", async () => {
    const firstPosition = makePositionBuilder(3);
    const collidingUpsert = makeBuilder({
      data: null,
      error: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "collections_pontos_collection_id_position_key"',
        details: "Key (collection_id, position)=(c1, 4) already exists.",
      },
    });
    const secondPosition = makePositionBuilder(4);
    const succeedingUpsert = makeBuilder({
      data: [{ ponto_id: "p1" }],
      error: null,
    });
    fromMock
      .mockReturnValueOnce(firstPosition)
      .mockReturnValueOnce(collidingUpsert)
      .mockReturnValueOnce(secondPosition)
      .mockReturnValueOnce(succeedingUpsert);

    const result = await addPontoToCollection(PARAMS);

    expect(result).toEqual({ ok: true });
    expect(fromMock).toHaveBeenCalledTimes(4);
    expect(succeedingUpsert.upsert.mock.calls[0][0]).toMatchObject({
      position: 5,
    });
  });

  it("surfaces a real error unchanged", async () => {
    const positionBuilder = makePositionBuilder(3);
    const failingUpsert = makeBuilder({
      data: null,
      error: {
        code: "42501",
        message: "new row violates row-level security policy",
      },
    });
    fromMock
      .mockReturnValueOnce(positionBuilder)
      .mockReturnValueOnce(failingUpsert);

    const result = await addPontoToCollection(PARAMS);

    expect(result).toEqual({
      ok: false,
      error: "new row violates row-level security policy",
    });
  });
});
