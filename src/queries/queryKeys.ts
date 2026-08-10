/**
 * Contrato fechado de chaves do React Query (`C1`).
 *
 * Toda chave sai daqui. Literal inline em call site é o mecanismo por trás do `D5`
 * e de metade do §6.2 do `aggregation.md`: a invalidação central não alcança o que
 * não está no registro, e o defeito não aparece na escrita — aparece depois, numa
 * tela que não recarregou.
 *
 * **Namespaces de terreiro (`C2`).** São dois, e a divisão é literal:
 * - `terreiro.*` — sub-recursos de **um** terreiro (`["terreiro", id, <recurso>]`).
 * - `terreiros.*` — consultas sobre **conjuntos** de terreiros (diretório, por
 *   usuário, coleções por terreiro).
 *
 * Existia um terceiro grupo, achatado no topo (`terreiroMembersCount`,
 * `terreiroMembersList`, `terreiroMembersListInfinite`), que descrevia sub-recursos
 * de um terreiro com outro formato de chave. Foi absorvido por `terreiro.*` em
 * 2026-08-10. Isso importa além da estética: chave achatada não compartilha prefixo
 * com as irmãs, então uma invalidação por prefixo de `["terreiro", id]` nunca as
 * alcançava — a mesma raiz do `D1`.
 *
 * **Prefixos.** Quando a intenção é invalidar uma família inteira, use o helper
 * `*Prefix` correspondente em vez de escrever o array curto no call site. O prefixo
 * é parte do contrato tanto quanto a chave completa.
 */
export const queryKeys = {
  terreiro: {
    /** Prefixo de tudo que pertence a um terreiro. */
    all: (terreiroId: string) => ["terreiro", terreiroId] as const,
    members: (terreiroId: string) =>
      ["terreiro", terreiroId, "members"] as const,
    membersCount: (terreiroId: string) =>
      ["terreiro", terreiroId, "membersCount"] as const,
    membersListInfinite: (params: {
      terreiroId: string;
      visibilityTier: "public" | "member" | "admin";
    }) =>
      [
        "terreiro",
        params.terreiroId,
        "membersListInfinite",
        params.visibilityTier,
      ] as const,
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
    membership: (userId: string) => ["me", "membership", userId] as const,
    terreiros: (userId: string) => ["me", "terreiros", userId] as const,
    terreiroAccessIds: (userId: string) =>
      ["me", "terreiroAccessIds", userId] as const,
    editableTerreiros: (userId: string) =>
      ["me", "editableTerreiros", userId] as const,
    managedTerreiros: (userId: string) =>
      ["me", "managedTerreiros", userId] as const,
    permissions: (userId: string) => ["me", "permissions", userId] as const,
    /**
     * Modo curador ligado/desligado. É um **booleano**.
     *
     * Vivia sob `me.profile(userId)` (`C7`), cujo nome prometia um objeto de
     * perfil: a primeira query de perfil de verdade teria sobrescrito o booleano
     * do `CuratorModeContext`, ou vice-versa, sem nada indicando o conflito.
     */
    curatorModeEnabled: (userId: string) =>
      ["me", "curatorModeEnabled", userId] as const,
  },
  pontos: {
    /** Prefixo de tudo que é ponto. Use para invalidação ampla, deliberada. */
    allPrefix: () => ["pontos"] as const,
    /** Catálogo público completo, sem escopo de usuário nem de terreiro. */
    allPublic: () => ["pontos", "all", "public"] as const,
    terreiro: (terreiroId: string) =>
      ["pontos", { scope: "terreiro", terreiroId }] as const,
    customTagsByTerreiro: (params: {
      terreiroId: string;
      pontoIdsHash: string;
    }) =>
      ["pontos", "customTags", params.terreiroId, params.pontoIdsHash] as const,
    // Batch de versões ativas por lote de pontoIds. `scope` diferencia o formato
    // de lote por chamador (ex.: um único ponto vs. resultado de busca) — não é
    // arbitrário, mas fica registrado aqui para não escapar da invalidação central.
    versoesBatch: (scope: string, idsKey: string) =>
      ["pontos", "versoesBatch", scope, idsKey] as const,
  },
  terreiros: {
    withRole: (userId: string) => ["terreiros", "withRole", userId] as const,
    byId: (terreiroId: string) => ["terreiros", "byId", terreiroId] as const,
    editableByUser: (userId: string) =>
      ["terreiros", "editableByUser", userId] as const,
    collectionsByTerreiro: (terreiroId: string) =>
      ["terreiros", "collectionsByTerreiro", terreiroId] as const,
    /** Coleções de **todos** os terreiros em cache. */
    collectionsByTerreiroPrefix: () =>
      ["terreiros", "collectionsByTerreiro"] as const,
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

    terreiro: (terreiroId: string) =>
      ["collections", { scope: "terreiro", terreiroId }] as const,
    byId: (id: string) => ["collection", { id }] as const,

    // Pontos ordenados de uma coleção (somente depende do collectionId)
    pontos: (collectionId: string) =>
      ["collections", "pontos", collectionId] as const,
    /** Pontos de **todas** as coleções em cache. */
    pontosPrefix: () => ["collections", "pontos"] as const,
  },
  entidades: {
    /** Catálogo global (`entidades.is_active`) para pickers. */
    catalog: () => ["entidades", "catalog"] as const,
  },
  globalRoles: {
    isCurator: (userId: string) => ["globalRoles", "curator", userId] as const,
  },
  curatorInvites: {
    pendingForInvitee: (normalizedEmail: string) =>
      ["curatorInvites", "pendingForInvitee", normalizedEmail] as const,
    /** Lista de convites de curador na visão de quem administra. */
    adminList: () => ["curatorInvites", "adminList"] as const,
  },
  terreiroInvites: {
    pendingForInvitee: (normalizedEmail: string) =>
      ["terreiroInvites", "pendingForInvitee", normalizedEmail] as const,
  },
  pontosSubmissions: {
    pending: () => ["pontosSubmissions", "pending"] as const,
    byId: (submissionId: string) =>
      ["pontosSubmissions", "byId", submissionId] as const,
    approvedAudioByPontoId: (pontoId: string) =>
      ["pontosSubmissions", "approvedAudio", pontoId] as const,
    approvedAudioByPontoAndVersao: (pontoId: string, pontoVersaoId: string) =>
      [
        "pontosSubmissions",
        "approvedAudio",
        pontoId,
        pontoVersaoId,
      ] as const,
  },
  offline: {
    terreiroPackage: (terreiroId: string) =>
      ["offline", "terreiroPackage", terreiroId] as const,
    allPackages: () => ["offline", "allPackages"] as const,
  },
  pontoAudios: {
    byPontoId: (pontoId: string) =>
      ["pontoAudios", "byPontoId", pontoId] as const,
    hasAnyUploadedByPontoId: (pontoId: string) =>
      ["pontoAudios", "hasAnyUploadedByPontoId", pontoId] as const,
    byPontoIdsHash: (pontoIdsHash: string) =>
      ["pontoAudios", "byPontoIds", pontoIdsHash] as const,
    /** Metadados de um áudio pelo id do próprio áudio (não do ponto). */
    metaById: (pontoAudioId: string) =>
      ["pontoAudios", "metaById", pontoAudioId] as const,
  },
} as const;
