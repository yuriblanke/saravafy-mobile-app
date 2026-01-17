export const queryKeys = {
  terreiroMembersCount: (terreiroId: string) =>
    ["terreiroMembersCount", terreiroId] as const,
  terreiroMembersList: (params: {
    terreiroId: string;
    visibilityTier: "public" | "member" | "admin";
  }) =>
    ["terreiroMembersList", params.terreiroId, params.visibilityTier] as const,
  terreiroMembersListInfinite: (params: {
    terreiroId: string;
    visibilityTier: "public" | "member" | "admin";
  }) =>
    [
      "terreiroMembersListInfinite",
      params.terreiroId,
      params.visibilityTier,
    ] as const,
  terreiro: {
    members: (terreiroId: string) =>
      ["terreiro", terreiroId, "members"] as const,
    membersCount: (terreiroId: string) =>
      ["terreiro", terreiroId, "membersCount"] as const,
    invites: (terreiroId: string) =>
      ["terreiro", terreiroId, "invites"] as const,
    membershipRequests: (terreiroId: string) =>
      ["terreiro", terreiroId, "membershipRequests"] as const,
  },
  preferences: {
    // Terreiros visíveis no menu Preferences (admin/curimba/member ativos; editor é alias)
    terreiros: (userId: string) =>
      ["preferences", "terreiros", userId] as const,
  },
  me: {
    profile: (userId: string) => ["me", "profile", userId] as const,
    membership: (userId: string) => ["me", "membership", userId] as const,
    terreiros: (userId: string) => ["me", "terreiros", userId] as const,
    terreiroAccessIds: (userId: string) =>
      ["me", "terreiroAccessIds", userId] as const,
    // Deprecated (mantido por compatibilidade): use queryKeys.preferences.terreiros
    terreirosWithRole: (userId: string) =>
      ["preferences", "terreiros", userId] as const,
    editableTerreiros: (userId: string) =>
      ["me", "editableTerreiros", userId] as const,
    permissions: (userId: string) => ["me", "permissions", userId] as const,
  },
  pontos: {
    terreiro: (terreiroId: string) =>
      ["pontos", { scope: "terreiro", terreiroId }] as const,
    feed: (userId: string) => ["pontos", "feed", userId] as const,
    customTagsByTerreiro: (params: {
      terreiroId: string;
      pontoIdsHash: string;
    }) =>
      ["pontos", "customTags", params.terreiroId, params.pontoIdsHash] as const,
  },
  terreiros: {
    exploreInitial: () => ["terreiros", "explore", "initial"] as const,
    withRole: (userId: string) => ["terreiros", "withRole", userId] as const,
    byId: (terreiroId: string) => ["terreiros", "byId", terreiroId] as const,
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

    // Pontos ordenados de uma coleção (somente depende do collectionId)
    pontos: (collectionId: string) =>
      ["collections", "pontos", collectionId] as const,
  },
  globalRoles: {
    isCurator: (userId: string) => ["globalRoles", "curator", userId] as const,
  },
  curatorInvites: {
    pendingForInvitee: (normalizedEmail: string) =>
      ["curatorInvites", "pendingForInvitee", normalizedEmail] as const,
  },
  terreiroInvites: {
    pendingForInvitee: (normalizedEmail: string) =>
      ["terreiroInvites", "pendingForInvitee", normalizedEmail] as const,
  },
  pontosSubmissions: {
    pending: () => ["pontosSubmissions", "pending"] as const,
    byId: (submissionId: string) =>
      ["pontosSubmissions", "byId", submissionId] as const,
  },
  pontoAudios: {
    byPontoId: (pontoId: string) =>
      ["pontoAudios", "byPontoId", pontoId] as const,
    hasAnyUploadedByPontoId: (pontoId: string) =>
      ["pontoAudios", "hasAnyUploadedByPontoId", pontoId] as const,
    byPontoIdsHash: (pontoIdsHash: string) =>
      ["pontoAudios", "byPontoIds", pontoIdsHash] as const,
  },
} as const;
