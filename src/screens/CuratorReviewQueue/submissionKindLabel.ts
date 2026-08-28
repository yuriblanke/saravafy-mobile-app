/**
 * Rótulo em pt-BR para `PontoSubmissionKind` (src/domain/ponto.ts:45).
 *
 * Extraído de `ReviewQueue.tsx` e `ReviewSubmission.tsx`, que definiam essa
 * mesma função palavra-por-palavra cada um por conta própria. Extração pura,
 * sem contexto/hooks, para que o mapeamento (X4) seja testável sem precisar
 * montar as duas telas inteiras.
 *
 * X4: o enum do banco (`ponto_submission_kind`, docs/schema.md) só tem
 * `new`, `correction`, `issue`, `audio_upload`, `variation` — `"problem"`
 * nunca foi um valor válido. As duas cópias tinham
 * `if (k === "problem") return "Problema";`, um ramo morto; corrigido para
 * `"issue"`.
 */
export function toKindLabel(kind: string | null | undefined) {
  const k = typeof kind === "string" ? kind.trim().toLowerCase() : "";
  if (k === "new") return "Novo";
  if (k === "correction") return "Correção";
  if (k === "issue") return "Problema";
  if (k === "audio_upload") return "Áudio";
  if (k === "variation") return "Variação";
  return "Envio";
}
