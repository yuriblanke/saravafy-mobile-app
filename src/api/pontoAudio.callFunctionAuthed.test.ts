jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    functions: { invoke: jest.fn() },
  },
}));

import { supabase } from "@/lib/supabase";

import { callFunctionAuthed } from "./pontoAudio";

/**
 * Fix round 1 on Task 7 (S-3a): pontoAudio.ts's local getErrorMessage copy
 * used to fall back to the literal text "Erro" whenever no usable message
 * could be extracted (`return String(error ?? "Erro")`). Swapping it for the
 * canonical extractor without passing a fallback would have shown the raw
 * `String(e)` text instead - "null" for a null/undefined error, or
 * "[object Object]" for a message-less error object, either of which a user
 * could see. `getErrorMessage(anyErr, "Erro")` at pontoAudio.ts:291 restores
 * the exact original fallback text.
 *
 * This exercises the real call site (`callFunctionAuthed`, exported, no
 * screen to mount) with a realistic message-less-but-truthy error shape -
 * the one shape `res.error` can actually take here, since `if (res.error)`
 * already filters out anything falsy (null/undefined included) before
 * `getErrorMessage` is ever called.
 */
describe("callFunctionAuthed error fallback (S-3a fix round 1)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: "token-123" } },
      error: null,
    });
  });

  it('throws with message "Erro" when the invoke error has no usable message', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: {},
    });

    await expect(callFunctionAuthed("some-function", {})).rejects.toThrow(
      "Erro",
    );
  });

  it("still uses the real message when the invoke error has one", async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: "algo falhou" },
    });

    await expect(callFunctionAuthed("some-function", {})).rejects.toThrow(
      "algo falhou",
    );
  });
});
