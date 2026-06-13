import { getErrorMessage } from "./errors";

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
