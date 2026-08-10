const NETWORK_MESSAGE =
  "Sem conexão. Verifique sua internet e tente novamente.";

/**
 * Texto de erro de qualquer forma conhecida, ou `""` quando não há nenhum.
 *
 * Extraído em 2026-08-10 para resolver o `X13`: `isNetworkError` e
 * `getErrorMessage` liam a mensagem de formas diferentes, e a de `isNetworkError`
 * não cobria **string pura** — então `"Network request failed"` chegando como
 * string (o que acontece quando um call site faz `String(e)` antes de chamar)
 * escapava do matcher e vazava verbatim para a tela. Com uma extração só, as duas
 * funções não podem mais divergir.
 */
function extractMessage(e: unknown): string {
  if (typeof e === "string") return e;

  if (e instanceof Error && typeof e.message === "string") return e.message;

  if (e && typeof e === "object") {
    const message = (e as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return "";
}

/**
 * `true` só para as duas formas conhecidas de falha de conectividade.
 *
 * Deliberadamente estreito: nunca casa a palavra "network" sozinha. Um erro de
 * aplicação que mencione a palavra precisa continuar chegando ao usuário com o
 * próprio texto — há um teste decoy fixando exatamente isso.
 */
export function isNetworkError(e: unknown): boolean {
  const hay = extractMessage(e).toLowerCase();

  return (
    hay.includes("network request failed") || hay.includes("failed to fetch")
  );
}

/**
 * Mensagem apresentável para qualquer erro.
 *
 * Contrato (Spec 1 §3.2): falha de conectividade vira texto amigável; caso
 * contrário devolve a mensagem **aparada**; sem mensagem utilizável, cai no
 * `fallback` e, na falta dele, em `String(e)`.
 *
 * O `X1` era a divergência entre essa spec e a implementação, que usava `.trim()`
 * só como teste de não-vazio e devolvia o texto original — com um teste chamado
 * "trims..." que ratificava o não-aparado. Resolvido a favor da spec: apara, e
 * apara nos três formatos, porque um call site não tem como justificar receber
 * aparado de `Error` e não aparado de `{ message }`.
 *
 * Uma mensagem vazia (ou só espaços) agora conta como ausente em **todos** os
 * formatos. Antes, `new Error("")` caía no fallback mas a string `""` não — a
 * inconsistência não tinha defesa.
 */
export function getErrorMessage(e: unknown, fallback?: string): string {
  if (isNetworkError(e)) return NETWORK_MESSAGE;

  const message = extractMessage(e).trim();
  if (message) return message;

  // O `X2` era um ramo morto aqui: `if (e == null && fallback !== undefined)
  // return fallback;`, inteiramente subsumido pela linha abaixo — `??` já devolve
  // o fallback sempre que ele não for `undefined`, inclusive quando for `""`.
  return fallback ?? String(e);
}
