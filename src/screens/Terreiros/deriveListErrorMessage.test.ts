import { deriveListErrorMessage } from "./deriveListErrorMessage";

describe("deriveListErrorMessage", () => {
  it("returns null when there is no error", () => {
    expect(
      deriveListErrorMessage({ isError: false, error: null, rowCount: 0 })
    ).toBeNull();
  });

  it("returns the friendly/fallback message on a cold failure (0 rows)", () => {
    expect(
      deriveListErrorMessage({ isError: true, error: null, rowCount: 0 })
    ).toBe("Ops, seu app parece estar desatualizado.");
  });

  it("returns null when rows are already present, even if the background refetch failed (D11)", () => {
    expect(
      deriveListErrorMessage({
        isError: true,
        error: new Error("boom"),
        rowCount: 12,
      })
    ).toBeNull();
  });

  it("surfaces the network message instead of the fallback when offline with 0 rows (D10)", () => {
    expect(
      deriveListErrorMessage({
        isError: true,
        error: new TypeError("Network request failed"),
        rowCount: 0,
      })
    ).toBe("Sem conexão. Verifique sua internet e tente novamente.");
  });
});
