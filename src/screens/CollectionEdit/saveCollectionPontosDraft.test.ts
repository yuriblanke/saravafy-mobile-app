jest.mock("@/lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

import { supabase } from "@/lib/supabase";

import { saveCollectionPontosDraft } from "./saveCollectionPontosDraft";

type BuilderResult = { data: unknown; error: unknown };

type Builder = {
  upsert: jest.Mock;
  then: (resolve: (r: BuilderResult) => void) => void;
};

/**
 * Builder encadeável e "thenable" para o `.upsert(...)` do supabase-js:
 * `saveCollectionPontosDraft` faz `await supabase.from(...).upsert(payload, opts)`
 * sem `.select()` no meio, então o próprio retorno de `upsert` precisa ser thenable.
 */
function makeBuilder(result: BuilderResult): Builder {
  const builder = {} as Builder;
  builder.upsert = jest.fn(() => builder);
  builder.then = (resolve) => resolve(result);
  return builder;
}

const fromMock = supabase.from as unknown as jest.Mock;

describe("saveCollectionPontosDraft", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  // X18: reordenar uma coleção fazia upsert de `added_by: userId` nas duas
  // fases (posições provisórias e finais). Com `ignoreDuplicates: false`
  // (default), o upsert do supabase-js vira `ON CONFLICT ... DO UPDATE SET`
  // de toda coluna presente no payload: reordenar reescrevia a autoria de
  // TODOS os pontos da coleção para quem arrastou a lista. `position` é a
  // única coluna que deveria mudar num reorder puro (sem remoção).
  it("neither phase's payload carries added_by, and both carry collection_id/ponto_id/position", async () => {
    const phase1Builder = makeBuilder({ data: null, error: null });
    const phase2Builder = makeBuilder({ data: null, error: null });
    fromMock
      .mockReturnValueOnce(phase1Builder)
      .mockReturnValueOnce(phase2Builder);

    await saveCollectionPontosDraft({
      collectionId: "c1",
      orderedPontoIds: ["p2", "p1"],
      originalPontoIds: ["p1", "p2"],
      userId: "u1",
    });

    expect(fromMock).toHaveBeenCalledTimes(2);

    const [phase1Payload] = phase1Builder.upsert.mock.calls[0] as [
      Record<string, unknown>[],
    ];
    const [phase2Payload] = phase2Builder.upsert.mock.calls[0] as [
      Record<string, unknown>[],
    ];

    for (const payload of [phase1Payload, phase2Payload]) {
      expect(Array.isArray(payload)).toBe(true);
      expect(payload.length).toBe(2);
      for (const row of payload) {
        expect(row).not.toHaveProperty("added_by");
        expect(row).toMatchObject({
          collection_id: "c1",
          ponto_id: expect.any(String),
          position: expect.any(Number),
        });
      }
    }
  });
});
