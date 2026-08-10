import {
  PUBLIC_QUERY_KEY_PREFIXES,
  shouldEvictQueryOnLogout,
} from "./logoutCacheEviction";

const TERREIRO_ID = "11111111-1111-1111-1111-111111111111";
const PREV_USER_ID = "22222222-2222-2222-2222-222222222222";

describe("shouldEvictQueryOnLogout", () => {
  describe("nega por padrão", () => {
    it("despeja uma chave que não está na allowlist", () => {
      expect(shouldEvictQueryOnLogout(["algo", "novo", "inventado"])).toBe(true);
    });

    it("despeja uma chave que não é array", () => {
      expect(shouldEvictQueryOnLogout("terreiros")).toBe(true);
      expect(shouldEvictQueryOnLogout(undefined)).toBe(true);
      expect(shouldEvictQueryOnLogout(null)).toBe(true);
    });

    it("despeja uma chave vazia", () => {
      expect(shouldEvictQueryOnLogout([])).toBe(true);
    });
  });

  describe("mantém o que é comprovadamente público", () => {
    it("mantém o catálogo global de entidades", () => {
      expect(shouldEvictQueryOnLogout(["entidades", "catalog"])).toBe(false);
    });

    it("despeja o diretório de terreiros, que é escopado por usuário", () => {
      // Deixou de ser entrada da allowlist com o `X5`: o cache público que ela
      // protegia não é mais lido por ninguém e saiu do registro. A aba Terreiros
      // lê `terreiros.withRole(userId)`.
      expect(shouldEvictQueryOnLogout(["terreiros", "withRole", PREV_USER_ID])).toBe(
        true,
      );
    });
  });

  // O motivo de existir do D1: essas chaves não carregam userId, então o
  // predicado antigo (`queryKey.includes(prevUserId)`) nunca as alcançava.
  describe("D1 — chaves sem userId que vazavam entre usuários", () => {
    it.each([
      ["terreiroMembersCount", ["terreiroMembersCount", TERREIRO_ID]],
      [
        "terreiroMembersList",
        ["terreiroMembersList", TERREIRO_ID, "admin"],
      ],
      [
        "terreiroMembersListInfinite",
        ["terreiroMembersListInfinite", TERREIRO_ID, "admin"],
      ],
      ["terreiro.members", ["terreiro", TERREIRO_ID, "members"]],
      ["terreiro.membersCount", ["terreiro", TERREIRO_ID, "membersCount"]],
    ])("despeja %s", (_label, key) => {
      expect(shouldEvictQueryOnLogout(key)).toBe(true);
    });
  });

  // Mais sensíveis que as do D1: só admin/curador enxerga esses dados, e
  // nenhuma delas carrega userId.
  describe("chaves de dado restrito sem userId", () => {
    it.each([
      ["convites do terreiro", ["terreiro", TERREIRO_ID, "invites"]],
      [
        "pedidos de adesão",
        ["terreiro", TERREIRO_ID, "membershipRequests"],
      ],
      ["fila de curadoria", ["pontosSubmissions", "pending"]],
      [
        "submissão por id",
        ["pontosSubmissions", "byId", "33333333-3333-3333-3333-333333333333"],
      ],
    ])("despeja %s", (_label, key) => {
      expect(shouldEvictQueryOnLogout(key)).toBe(true);
    });

    // Estas são piores ainda: a chave é o e-mail do usuário anterior.
    it.each([
      [
        "convites de curador por e-mail",
        ["curatorInvites", "pendingForInvitee", "alguem@example.com"],
      ],
      [
        "convites de terreiro por e-mail",
        ["terreiroInvites", "pendingForInvitee", "alguem@example.com"],
      ],
    ])("despeja %s", (_label, key) => {
      expect(shouldEvictQueryOnLogout(key)).toBe(true);
    });
  });

  describe("não regride o que o predicado antigo já acertava", () => {
    it.each([
      ["me.profile", ["me", "profile", PREV_USER_ID]],
      ["me.permissions", ["me", "permissions", PREV_USER_ID]],
      ["pontos.feed", ["pontos", "feed", PREV_USER_ID]],
      ["collections.accountable", ["collections", "accountable", PREV_USER_ID]],
      ["globalRoles.isCurator", ["globalRoles", "curator", PREV_USER_ID]],
    ])("continua despejando %s", (_label, key) => {
      expect(shouldEvictQueryOnLogout(key)).toBe(true);
    });
  });

  // Decoys: provam que o match é por prefixo da allowlist sobre a chave, e não
  // por raiz nem por "a chave é prefixo da entrada". Sem isso, `terreiros` na
  // allowlist manteria `terreiros.withRole(userId)` junto.
  describe("semântica do match", () => {
    it("não mantém uma irmã que compartilha só a raiz com uma entrada pública", () => {
      expect(shouldEvictQueryOnLogout(["terreiros", "withRole", PREV_USER_ID])).toBe(
        true,
      );
      expect(
        shouldEvictQueryOnLogout(["terreiros", "editableByUser", PREV_USER_ID]),
      ).toBe(true);
      expect(
        shouldEvictQueryOnLogout([
          "terreiros",
          "collectionsByTerreiro",
          TERREIRO_ID,
        ]),
      ).toBe(true);
    });

    it("não mantém uma chave que é prefixo *da entrada* (match é na direção oposta)", () => {
      expect(shouldEvictQueryOnLogout(["entidades"])).toBe(true);
    });

    it("mantém uma chave que estende uma entrada pública", () => {
      expect(
        shouldEvictQueryOnLogout(["entidades", "catalog", "qualquer-sufixo"]),
      ).toBe(false);
    });

    it("compara por igualdade estrita, não por coerção", () => {
      expect(shouldEvictQueryOnLogout(["entidades", { catalog: true }])).toBe(
        true,
      );
    });
  });

  describe("a allowlist é deliberadamente pequena", () => {
    // Não é estética: cada entrada aqui é uma chave que sobrevive ao logout, e
    // por isso precisa de verificação no fetcher de que o dado independe de
    // quem está logado. Crescer sem essa verificação reabre o D1.
    it("tem exatamente a entrada verificada", () => {
      expect(PUBLIC_QUERY_KEY_PREFIXES).toEqual([["entidades", "catalog"]]);
    });
  });
});
