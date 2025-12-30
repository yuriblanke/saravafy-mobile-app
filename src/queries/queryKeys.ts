export const queryKeys = {
  me: {
    membership: (userId: string) => ["me", "membership", userId] as const,
    terreiros: (userId: string) => ["me", "terreiros", userId] as const,
    terreiroAccessIds: (userId: string) =>
      ["me", "terreiroAccessIds", userId] as const,
    editableTerreiros: (userId: string) =>
      ["me", "editableTerreiros", userId] as const,
    permissions: (userId: string) => ["me", "permissions", userId] as const,
  },
  pontos: {
    terreiro: (terreiroId: string) =>
      ["pontos", { scope: "terreiro", terreiroId }] as const,
    feed: (userId: string) => ["pontos", "feed", userId] as const,
  },
  terreiros: {
    exploreInitial: () => ["terreiros", "explore", "initial"] as const,
    withRole: (userId: string) => ["terreiros", "withRole", userId] as const,
    byId: (terreiroId: string) =>
      ["terreiros", "byId", terreiroId] as const,
    editableByUser: (userId: string) =>
      ["terreiros", "editableByUser", userId] as const,
    collectionsByTerreiro: (terreiroId: string) =>
      ["terreiros", "collectionsByTerreiro", terreiroId] as const,
  },
  collections: {
    // QueryKey por usuário para todas as coleções visíveis pela usuária
    accountable: (userId: string) =>
      ["collections", "accountable", userId] as const,

    // Coleções editáveis (escrita) do usuário: depende de memberships admin/editor
    editableByUser: (params: { userId: string; terreiroIdsHash: string }) =>
      [
        "collections",
        "editableByUser",
        params.userId,
        params.terreiroIdsHash,
      ] as const,
    editableByUserPrefix: (userId: string) =>
      ["collections", "editableByUser", userId] as const,

    // Deprecated: manter por compatibilidade temporária
    available: (params: { userId: string; terreiroId?: string | null }) =>
      [
        "collections",
        "available",
        params.userId,
        params.terreiroId ?? null,
      ] as const,
    terreiro: (terreiroId: string) =>
      ["collections", { scope: "terreiro", terreiroId }] as const,
    byId: (id: string) => ["collection", { id }] as const,
  },
} as const;
