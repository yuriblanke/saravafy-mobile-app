import {
  addTagToCustomTagsMap,
  isCustomTagsQueryKeyForTerreiro,
  removeTagFromCustomTagsMap,
  type CustomTagEntry,
  type CustomTagsMap,
} from "./terreiroPontoCustomTagsCache";

const TERREIRO = "terreiro-1";
const OUTRO_TERREIRO = "terreiro-2";
const PONTO = "ponto-1";

function tag(over: Partial<CustomTagEntry> = {}): CustomTagEntry {
  return {
    id: "tag-1",
    tagText: "Maria",
    tagTextNormalized: "maria",
    createdAt: "2026-08-10T00:00:00.000Z",
    ...over,
  };
}

describe("isCustomTagsQueryKeyForTerreiro", () => {
  it("casa a chave do mapa de tags do terreiro, qualquer que seja o lote", () => {
    expect(
      isCustomTagsQueryKeyForTerreiro(
        ["pontos", "customTags", TERREIRO, "hash-a"],
        TERREIRO,
      ),
    ).toBe(true);
    expect(
      isCustomTagsQueryKeyForTerreiro(
        ["pontos", "customTags", TERREIRO, "hash-b"],
        TERREIRO,
      ),
    ).toBe(true);
  });

  it("não casa outro terreiro", () => {
    expect(
      isCustomTagsQueryKeyForTerreiro(
        ["pontos", "customTags", OUTRO_TERREIRO, "hash-a"],
        TERREIRO,
      ),
    ).toBe(false);
  });

  it("não casa outras chaves da raiz pontos", () => {
    expect(
      isCustomTagsQueryKeyForTerreiro(["pontos", "feed", TERREIRO], TERREIRO),
    ).toBe(false);
    expect(
      isCustomTagsQueryKeyForTerreiro(
        ["pontos", "versoesBatch", "escopo", TERREIRO],
        TERREIRO,
      ),
    ).toBe(false);
  });

  it("não quebra com chave malformada", () => {
    expect(isCustomTagsQueryKeyForTerreiro(undefined, TERREIRO)).toBe(false);
    expect(isCustomTagsQueryKeyForTerreiro("pontos", TERREIRO)).toBe(false);
    expect(isCustomTagsQueryKeyForTerreiro([], TERREIRO)).toBe(false);
    expect(
      isCustomTagsQueryKeyForTerreiro(["pontos", "customTags"], TERREIRO),
    ).toBe(false);
  });
});

describe("addTagToCustomTagsMap", () => {
  it("acrescenta a tag num mapa vazio", () => {
    expect(addTagToCustomTagsMap(undefined, PONTO, tag())).toEqual({
      [PONTO]: [tag()],
    });
  });

  it("preserva as tags que já estavam no ponto", () => {
    const prev: CustomTagsMap = { [PONTO]: [tag({ id: "a", tagTextNormalized: "joao" })] };
    const next = addTagToCustomTagsMap(prev, PONTO, tag({ id: "b" }));

    expect(next[PONTO]).toHaveLength(2);
    expect(next[PONTO][1].id).toBe("b");
  });

  it("preserva os outros pontos do mapa", () => {
    const prev: CustomTagsMap = { "ponto-9": [tag({ id: "z" })] };
    const next = addTagToCustomTagsMap(prev, PONTO, tag());

    expect(next["ponto-9"]).toEqual(prev["ponto-9"]);
  });

  it("não duplica: mesma tag normalizada devolve o mapa anterior por referência", () => {
    const prev: CustomTagsMap = { [PONTO]: [tag({ id: "a" })] };
    const next = addTagToCustomTagsMap(prev, PONTO, tag({ id: "b" }));

    // Mesmo tagTextNormalized, id diferente — ainda é a mesma médium.
    expect(next).toBe(prev);
  });

  it("não trata mapa antigo malformado como erro", () => {
    expect(addTagToCustomTagsMap(null, PONTO, tag())).toEqual({
      [PONTO]: [tag()],
    });
  });
});

describe("removeTagFromCustomTagsMap", () => {
  it("remove a tag pelo id", () => {
    const prev: CustomTagsMap = {
      [PONTO]: [tag({ id: "a" }), tag({ id: "b", tagTextNormalized: "joao" })],
    };
    const next = removeTagFromCustomTagsMap(prev, PONTO, "a");

    expect(next[PONTO]).toHaveLength(1);
    expect(next[PONTO][0].id).toBe("b");
  });

  it("preserva os outros pontos do mapa", () => {
    const prev: CustomTagsMap = {
      [PONTO]: [tag({ id: "a" })],
      "ponto-9": [tag({ id: "z" })],
    };
    const next = removeTagFromCustomTagsMap(prev, PONTO, "a");

    expect(next["ponto-9"]).toEqual(prev["ponto-9"]);
  });

  // Este é o comportamento que a versão duplicada nos componentes errava: ela
  // escrevia `[pontoId]: []` mesmo num lote que nunca continha aquele ponto.
  it("devolve o mapa anterior por referência quando não há o que remover", () => {
    const prev: CustomTagsMap = { "ponto-9": [tag({ id: "z" })] };

    expect(removeTagFromCustomTagsMap(prev, PONTO, "a")).toBe(prev);
    expect(removeTagFromCustomTagsMap(prev, "ponto-9", "inexistente")).toBe(
      prev,
    );
  });

  it("não injeta chave vazia para um ponto ausente", () => {
    const prev: CustomTagsMap = { "ponto-9": [tag({ id: "z" })] };
    const next = removeTagFromCustomTagsMap(prev, PONTO, "a");

    expect(Object.keys(next)).toEqual(["ponto-9"]);
  });

  it("não trata mapa antigo malformado como erro", () => {
    expect(removeTagFromCustomTagsMap(undefined, PONTO, "a")).toEqual({});
  });
});
