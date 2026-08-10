import { getErrorMessage, isNetworkError } from "./errors";

describe("getErrorMessage", () => {
  it("returns Error.message when present and non-empty", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  // X1: a spec (§3.2) sempre disse "trimmed"; a implementação devolvia o texto
  // original e este teste ratificava isso apesar do nome. Resolvido a favor da
  // spec — o nome e a asserção agora concordam.
  it("trims and returns object.message when present", () => {
    expect(getErrorMessage({ message: "  hello  " })).toBe("hello");
  });

  it("trims Error.message too, not just object.message", () => {
    expect(getErrorMessage(new Error("  boom  "))).toBe("boom");
  });

  it("trims a bare string as well", () => {
    expect(getErrorMessage("  oops  ")).toBe("oops");
  });

  it("returns the input when it is a string", () => {
    expect(getErrorMessage("oops")).toBe("oops");
  });

  it("returns fallback for null", () => {
    expect(getErrorMessage(null, "default")).toBe("default");
  });

  it("returns fallback for undefined", () => {
    expect(getErrorMessage(undefined, "default")).toBe("default");
  });

  it("returns String(e) when no fallback is provided and shape is unknown", () => {
    expect(getErrorMessage({ noMessage: true })).toBe("[object Object]");
  });

  it("ignores empty Error.message and falls back to String(e)", () => {
    const err = new Error("");
    expect(getErrorMessage(err)).toBe(String(err));
  });

  // Antes, `new Error("")` caía no fallback mas a string `""` não. A mensagem
  // vazia agora conta como ausente em qualquer formato.
  it("treats a blank message as absent in every shape", () => {
    expect(getErrorMessage("", "default")).toBe("default");
    expect(getErrorMessage("   ", "default")).toBe("default");
    expect(getErrorMessage({ message: "   " }, "default")).toBe("default");
    expect(getErrorMessage(new Error("   "), "default")).toBe("default");
  });

  // X2: o ramo `if (e == null && fallback !== undefined) return fallback;` era
  // subsumido por `fallback ?? String(e)`. Estes casos provam a equivalência,
  // incluindo o de fronteira que `??` trata e um `if` ingênuo erraria.
  it("honours an empty-string fallback instead of skipping it", () => {
    expect(getErrorMessage(null, "")).toBe("");
    expect(getErrorMessage({ noMessage: true }, "")).toBe("");
  });
});

describe("getErrorMessage — network failures", () => {
  const FRIENDLY = "Sem conexão. Verifique sua internet e tente novamente.";

  it("normalizes React Native's fetch failure", () => {
    expect(getErrorMessage(new TypeError("Network request failed"))).toBe(
      FRIENDLY,
    );
  });

  it("matches case-insensitively", () => {
    expect(getErrorMessage(new Error("network request failed"))).toBe(FRIENDLY);
  });

  it("matches when a layer re-wraps the message", () => {
    expect(getErrorMessage(new Error("FetchError: Network request failed"))).toBe(
      FRIENDLY,
    );
  });

  it("matches the Failed to fetch phrasing", () => {
    expect(getErrorMessage(new Error("Failed to fetch"))).toBe(FRIENDLY);
  });

  // Decoy — this is the test that keeps the matcher honest.
  it("does NOT swallow an application error that merely mentions networks", () => {
    const e = new Error("Erro ao carregar network settings do terreiro");
    expect(getErrorMessage(e)).toBe(
      "Erro ao carregar network settings do terreiro",
    );
  });
});

describe("isNetworkError", () => {
  it("is true for fetch failures", () => {
    expect(isNetworkError(new TypeError("Network request failed"))).toBe(true);
  });

  it("is false for application errors", () => {
    expect(isNetworkError(new Error("Coleção não encontrada"))).toBe(false);
  });

  it("is false for null and undefined", () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });

  it("is false for a string that is not a connectivity failure", () => {
    expect(isNetworkError("boom")).toBe(false);
  });

  // X13: o motivo desta correção existir. A extração lia `.message` de `Error` e
  // de objeto, e ignorava string pura — então um call site que fizesse `String(e)`
  // antes de chamar vazava "Network request failed" verbatim para a tela. Era o
  // pré-requisito bloqueando o S-3a, que varre 10 cópias locais e não podia
  // começar antes disto.
  it("is true for a bare string carrying the fetch failure (X13)", () => {
    expect(isNetworkError("Network request failed")).toBe(true);
    expect(isNetworkError("Failed to fetch")).toBe(true);
    expect(isNetworkError("network request failed")).toBe(true);
  });

  it("normalizes a bare-string network failure through getErrorMessage too", () => {
    expect(getErrorMessage("Network request failed")).toBe(
      "Sem conexão. Verifique sua internet e tente novamente.",
    );
    expect(getErrorMessage(String(new TypeError("Network request failed")))).toBe(
      "Sem conexão. Verifique sua internet e tente novamente.",
    );
  });

  it("is false for an object whose message is not a string", () => {
    expect(isNetworkError({ message: 42 })).toBe(false);
    expect(isNetworkError({ message: null })).toBe(false);
  });
});
