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
