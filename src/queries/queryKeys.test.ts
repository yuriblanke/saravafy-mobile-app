import { queryKeys } from "./queryKeys";

/**
 * Este arquivo não testa uma função — testa o **contrato** do registro (`C1`).
 *
 * O `C2`/`C6` existiram porque duas entradas diferentes produziam a mesma chave
 * (`me.terreirosWithRole` era alias de `preferences.terreiros`) e ninguém percebeu:
 * invalidar por um nome parecia funcionar, e o outro nome ficava sem cobertura.
 * Um teste que só olhasse chave por chave nunca pegaria isso — a colisão só existe
 * quando o registro é olhado inteiro.
 */

/**
 * Argumento genérico para chamar qualquer factory sem saber sua assinatura.
 *
 * É um `String` embrulhado num Proxy: serve tanto para os parâmetros posicionais
 * (`(userId: string)`) quanto para os de objeto (`({ terreiroId, visibilityTier })`),
 * porque qualquer acesso a propriedade devolve um marcador.
 */
const ARG: any = new Proxy(new String("<arg>"), {
  get(target, prop) {
    if (prop in target) return (target as any)[prop];
    return `<${String(prop)}>`;
  },
});

type Factory = (...args: any[]) => readonly unknown[];

function collectFactories(
  node: unknown,
  path: string[] = [],
): { path: string; fn: Factory }[] {
  if (typeof node === "function") {
    return [{ path: path.join("."), fn: node as Factory }];
  }

  if (!node || typeof node !== "object") return [];

  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    collectFactories(value, [...path, key]),
  );
}

/** Renderiza a chave numa forma comparável, achatando os argumentos. */
function serialize(key: readonly unknown[]): string {
  return key
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object") return "<arg>";
      return String(part);
    })
    .join(" | ");
}

const factories = collectFactories(queryKeys);

describe("contrato do registro de query keys", () => {
  it("expõe apenas factories, nunca arrays soltos", () => {
    expect(factories.length).toBeGreaterThan(0);

    for (const { path, fn } of factories) {
      expect(typeof fn).toBe("function");
      expect(Array.isArray(fn(ARG, ARG))).toBe(true);
    }
  });

  it("toda chave é um array não vazio começando por string", () => {
    for (const { path, fn } of factories) {
      const key = fn(ARG, ARG);

      expect(key.length).toBeGreaterThan(0);
      expect(typeof key[0]).toBe("string");
      expect((key[0] as string).length).toBeGreaterThan(0);
    }
  });

  // O teste que importa. Duas entradas distintas produzindo a mesma chave é
  // exatamente o `C6` (`me.terreirosWithRole` alias de `preferences.terreiros`):
  // parece que há duas coisas, existe uma só, e metade das invalidações escritas
  // contra o nome "errado" viram no-op silencioso.
  it("não existem duas entradas produzindo a mesma chave", () => {
    const byKey = new Map<string, string[]>();

    for (const { path, fn } of factories) {
      const serialized = serialize(fn(ARG, ARG));
      byKey.set(serialized, [...(byKey.get(serialized) ?? []), path]);
    }

    const colisoes = [...byKey.entries()]
      .filter(([, paths]) => paths.length > 1)
      .map(([key, paths]) => `${paths.join(" === ")}  ->  [${key}]`);

    expect(colisoes).toEqual([]);
  });

  // `C2`: sub-recurso de um terreiro mora sob a raiz `terreiro`, para que uma
  // invalidação por prefixo de `["terreiro", id]` alcance a família inteira. Uma
  // chave achatada no topo não compartilha prefixo com as irmãs — foi assim que
  // as três chaves de membros escaparam.
  it("todo sub-recurso de um terreiro compartilha o prefixo da raiz terreiro", () => {
    const membros = collectFactories(queryKeys.terreiro, ["terreiro"]);

    expect(membros.length).toBeGreaterThan(1);

    for (const { path, fn } of membros) {
      expect(fn(ARG, ARG)[0]).toBe("terreiro");
    }
  });

  it("um helper de prefixo é prefixo real da chave completa que ele cobre", () => {
    const casos: [readonly unknown[], readonly unknown[]][] = [
      [
        queryKeys.terreiros.collectionsByTerreiroPrefix(),
        queryKeys.terreiros.collectionsByTerreiro("t1"),
      ],
      [queryKeys.collections.pontosPrefix(), queryKeys.collections.pontos("c1")],
      [queryKeys.pontos.allPrefix(), queryKeys.pontos.allPublic()],
      [queryKeys.pontos.allPrefix(), queryKeys.pontos.feed("u1")],
      [queryKeys.terreiro.all("t1"), queryKeys.terreiro.members("t1")],
      [
        queryKeys.collections.editableByUserPrefix("u1"),
        queryKeys.collections.editableByUser({
          userId: "u1",
          terreiroIdsHash: "h",
        }),
      ],
    ];

    for (const [prefixo, completa] of casos) {
      expect(completa.length).toBeGreaterThan(prefixo.length);
      expect(completa.slice(0, prefixo.length)).toEqual([...prefixo]);
    }
  });

  // Guarda do `C7`: o nome da chave precisa descrever o que ela guarda. `me.profile`
  // guardava um booleano de modo curador — a primeira query de perfil de verdade
  // teria sobrescrito o booleano sem nada indicando o conflito.
  it("não existe mais uma chave me.profile guardando outra coisa", () => {
    expect((queryKeys.me as Record<string, unknown>).profile).toBeUndefined();
    expect(queryKeys.me.curatorModeEnabled("u1")).toEqual([
      "me",
      "curatorModeEnabled",
      "u1",
    ]);
  });
});
