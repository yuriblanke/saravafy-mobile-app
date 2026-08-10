/**
 * Política de despejo de cache no logout (`D1`).
 *
 * O predicado anterior (`app/_layout.tsx`) era `q.queryKey.includes(prevUserId)`:
 * mantinha tudo por padrão e despejava só o que carregasse o id do usuário. Chaves
 * como `["terreiro", terreiroId, "invites"]` ou
 * `["curatorInvites", "pendingForInvitee", email]` não carregam `userId` — logo
 * sobreviviam ao logout e podiam aparecer para o próximo usuário do mesmo aparelho.
 *
 * A direção aqui é a inversa, e é o ponto: **nega por padrão**. Uma chave só
 * sobrevive se estiver explicitamente listada como pública. Isso importa menos pelo
 * que corrige hoje e mais por não apodrecer: uma chave nova nasce sendo despejada,
 * enquanto uma lista de "o que despejar" nasceria vazando a cada chave adicionada e
 * esquecida.
 */

/**
 * Chaves cujo conteúdo é idêntico para um visitante anônimo e para qualquer usuário
 * logado, e que por isso podem atravessar o logout.
 *
 * O match é por **prefixo**: uma entrada aqui cobre a si mesma e tudo abaixo dela.
 *
 * Critério para entrar nesta lista: ler o `queryFn` e confirmar que ele não filtra
 * por `auth.uid()`, por membership, nem por papel. A entrada atual foi verificada
 * em 2026-08-10:
 *
 * - `["entidades", "catalog"]` — `entidadesCatalog.ts` filtra apenas
 *   `is_active = true`. Catálogo global usado por pickers.
 *
 * Não acrescente uma entrada sem fazer essa verificação — cada linha aqui é uma
 * chave que sobrevive à troca de usuário.
 *
 * **Encolheu de duas para uma em 2026-08-10.** `["terreiros","explore","initial"]`
 * era pública e estava corretamente verificada, mas o `X5` mostrou que ninguém lia
 * esse cache: o prefetch de boot o aquecia e nenhuma tela o consumia. Com a chave
 * removida do registro, a entrada aqui protegia algo que não existe mais. A aba
 * Terreiros lê `terreiros.withRole(userId)`, que é escopada por usuário e portanto
 * despejada — como deve ser.
 */
export const PUBLIC_QUERY_KEY_PREFIXES: readonly (readonly unknown[])[] = [
  ["entidades", "catalog"],
] as const;

function matchesPrefix(
  queryKey: readonly unknown[],
  prefix: readonly unknown[],
): boolean {
  // A entrada da allowlist precisa caber dentro da chave. Uma chave mais curta que
  // a entrada (`["terreiros", "explore"]` contra `["terreiros","explore","initial"]`)
  // não é coberta — senão um prefixo curto passaria a manter irmãs não verificadas.
  if (prefix.length > queryKey.length) return false;

  for (let i = 0; i < prefix.length; i += 1) {
    if (!Object.is(queryKey[i], prefix[i])) return false;
  }

  return true;
}

/** `true` se a chave é pública e pode atravessar o logout. */
export function isPublicQueryKey(queryKey: unknown): boolean {
  if (!Array.isArray(queryKey) || queryKey.length === 0) return false;

  return PUBLIC_QUERY_KEY_PREFIXES.some((prefix) =>
    matchesPrefix(queryKey, prefix),
  );
}

/**
 * `true` se a query deve ser cancelada e removida quando o usuário desloga.
 *
 * Chaves malformadas (não-array, vazias) caem no lado seguro: são despejadas.
 */
export function shouldEvictQueryOnLogout(queryKey: unknown): boolean {
  return !isPublicQueryKey(queryKey);
}
