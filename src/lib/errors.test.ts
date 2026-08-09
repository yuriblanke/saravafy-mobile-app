import { getErrorMessage, isNetworkError } from "./errors";

describe("getErrorMessage", () => {
  it("returns Error.message when present and non-empty", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("trims and returns object.message when present", () => {
    expect(getErrorMessage({ message: "  hello  " })).toBe("  hello  ");
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
});

describe("getErrorMessage — network failures", () => {
  const FRIENDLY = "Sem conexão. Verifique sua internet e tente novamente.";

  it("normalizes React Native's fetch failure", () => {
    expect(getErrorMessage(new TypeError("Network request failed"))).toBe(FRIENDLY);
  });

  it("matches case-insensitively", () => {
    expect(getErrorMessage(new Error("network request failed"))).toBe(FRIENDLY);
  });

  it("matches when a layer re-wraps the message", () => {
    expect(getErrorMessage(new Error("FetchError: Network request failed"))).toBe(FRIENDLY);
  });

  it("matches the Failed to fetch phrasing", () => {
    expect(getErrorMessage(new Error("Failed to fetch"))).toBe(FRIENDLY);
  });

  // Decoy — this is the test that keeps the matcher honest.
  it("does NOT swallow an application error that merely mentions networks", () => {
    const e = new Error("Erro ao carregar network settings do terreiro");
    expect(getErrorMessage(e)).toBe("Erro ao carregar network settings do terreiro");
  });
});

describe("isNetworkError", () => {
  it("is true for fetch failures", () => {
    expect(isNetworkError(new TypeError("Network request failed"))).toBe(true);
  });
  it("is false for application errors", () => {
    expect(isNetworkError(new Error("Coleção não encontrada"))).toBe(false);
  });
  it("is false for null/undefined/strings", () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
    expect(isNetworkError("boom")).toBe(false);
  });
});
