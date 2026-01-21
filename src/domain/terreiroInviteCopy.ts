export type TerreiroInviteRole = "admin" | "curimba" | "member";

export function getTerreiroInviteRoleBadgeLabel(role: TerreiroInviteRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "curimba":
      return "Curimba";
    case "member":
      return "Membra / Membro";
    default: {
      const _exhaustive: never = role;
      return String(_exhaustive);
    }
  }
}

export function getTerreiroInviteBodyCopy(role: TerreiroInviteRole): string {
  switch (role) {
    case "member":
      return [
        "Esse convite cria um vínculo entre você e o terreiro no Saravafy.",
        "",
        "Ao aceitar, você passará a aparecer como membro(a) do terreiro dentro do app.",
      ].join("\n");
    case "curimba":
      return [
        "Como curimba, você poderá cuidar do acervo do terreiro no Saravafy.",
        "",
        "Isso inclui criar, editar e organizar pontos e coleções.",
      ].join("\n");
    case "admin":
      return [
        "Como administradora(or), você terá controle sobre o terreiro no app.",
        "",
        "Isso inclui gerenciar conteúdos, membros e convites, além de configurar informações do terreiro.",
      ].join("\n");
    default: {
      const _exhaustive: never = role;
      return String(_exhaustive);
    }
  }
}

export const TERREIRO_INVITE_DECIDE_LATER_TOAST =
  "Você pode aceitar ou recusar este convite a qualquer momento no menu de Preferências.";
