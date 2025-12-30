import type { InfoProps } from "@/src/components/AccessRoleInfo";

export type GlobalRole = "dev_master" | "curator";

type GlobalRoleDef = {
  badgeLabel: string;
  infoTitle: string;
  infoBody: string;
  permissions: string[];
};

export const GLOBAL_ROLE_DEFS: Record<GlobalRole, GlobalRoleDef> = {
  curator: {
    badgeLabel: "Guardiã do Acervo",
    infoTitle: "Guardiã do Acervo",
    infoBody:
      "Esse papel existe para manter a qualidade do acervo, corrigindo letras, títulos e tags.",
    permissions: [
      "Editar qualquer ponto do acervo",
      "Corrigir letras e títulos",
      "Adicionar e remover tags do acervo",
      "Atuar sobre submissions conforme política",
    ],
  },
  dev_master: {
    badgeLabel: "Dev Master",
    infoTitle: "Dev Master",
    infoBody: "Esse papel possui acesso total à plataforma.",
    permissions: [],
  },
} as const;

export function getGlobalRoleDef(role: GlobalRole): GlobalRoleDef {
  return GLOBAL_ROLE_DEFS[role];
}

export function getGlobalRoleBadgeLabel(role: GlobalRole): string {
  return getGlobalRoleDef(role).badgeLabel;
}

export function getGlobalRoleInfoProps(role: GlobalRole): InfoProps {
  const def = getGlobalRoleDef(role);

  return {
    accessibilityLabel: `Ver o que o papel ${def.infoTitle} permite`,
    title: def.infoTitle,
    body: def.infoBody,
    sections: def.permissions.length
      ? [{ title: "Permissões", items: def.permissions }]
      : [],
  };
}
