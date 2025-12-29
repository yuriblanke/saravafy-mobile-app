export const queryKeys = {
  me: {
    membership: () => ["me", "membership"] as const,
    terreiros: () => ["me", "terreiros"] as const,
    permissions: () => ["me", "permissions"] as const,
  },
  pontos: {
    terreiro: (terreiroId: string) =>
      ["pontos", { scope: "terreiro", terreiroId }] as const,
  },
  collections: {
    // QueryKey global fixa para todas as coleções visíveis pela usuária
    accountable: () => ["collections", "accountable"] as const,
    // Deprecated: manter por compatibilidade temporária
    available: (params: { userId: string; terreiroId?: string | null }) =>
      [
        "collections",
        {
          scope: "available",
          userId: params.userId,
          terreiroId: params.terreiroId ?? null,
        },
      ] as const,
    terreiro: (terreiroId: string) =>
      ["collections", { scope: "terreiro", terreiroId }] as const,
    byId: (id: string) => ["collection", { id }] as const,
  },
} as const;
