import { toKindLabel } from "./submissionKindLabel";

/**
 * X4: `PontoSubmissionKind` (src/domain/ponto.ts:48) e o enum do banco
 * (`ponto_submission_kind`, docs/schema.md) usam "issue". ReviewQueue.tsx e
 * ReviewSubmission.tsx tinham `if (k === "problem") ...`, um valor que o
 * enum do Postgres nunca aceitou - os dois ramos eram mortos e a submissao
 * caia no fallback generico "Envio". Corrigido para "issue" (agora extraido
 * para `submissionKindLabel.ts`, compartilhado pelas duas telas). Este teste
 * fixa o rotulo real e documenta que "problem" nao existe mais como caso
 * especial.
 */
describe("toKindLabel", () => {
  it("mapeia o valor real do banco (issue) para Problema", () => {
    expect(toKindLabel("issue")).toBe("Problema");
  });

  it('"problem" nao e um valor do enum do banco e cai no fallback generico', () => {
    expect(toKindLabel("problem")).toBe("Envio");
  });

  it("mapeia os demais valores do enum corretamente", () => {
    expect(toKindLabel("new")).toBe("Novo");
    expect(toKindLabel("correction")).toBe("Correção");
    expect(toKindLabel("audio_upload")).toBe("Áudio");
    expect(toKindLabel("variation")).toBe("Variação");
    expect(toKindLabel(null)).toBe("Envio");
    expect(toKindLabel(undefined)).toBe("Envio");
  });
});
