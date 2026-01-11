import type { InfoProps } from "@/src/components/AccessRoleInfo";

export type AccessRole = "admin" | "editor" | "member";

export type AccessRoleCopySectionTitle = "Pode:" | "Não pode:" | "São:";

export type AccessRoleCopySection = {
  title: AccessRoleCopySectionTitle;
  items: readonly string[];
};

export type AccessRoleCopy = {
  heading: string;
  sections: readonly AccessRoleCopySection[];
};

export function getAccessRoleLabel(role: AccessRole): string {
  if (role === "admin") return "Admin";
  if (role === "editor") return "Editor";
  return "Membro";
}

export const ACCESS_ROLE_COPY: Record<AccessRole, AccessRoleCopy> = {
  admin: {
    heading: "ADMIN — Administração",
    sections: [
      {
        title: "Pode:",
        items: [
          "Convidar pessoas como Admin, Editor ou Membro",
          "Criar, editar e organizar coleções",
          "Criar e editar tags customizadas (usadas para adicionar o médium que traz a entidade)",
          "Definir se o terreiro é público ou privado",
        ],
      },
    ],
  },
  editor: {
    heading: "EDITOR — Edição",
    sections: [
      {
        title: "Pode:",
        items: [
          "Criar, editar e organizar coleções",
          "Criar e editar tags customizadas (usadas para adicionar o médium que traz a entidade)",
        ],
      },
      {
        title: "Não pode:",
        items: ["Convidar pessoas", "Alterar a visibilidade do terreiro"],
      },
    ],
  },
  member: {
    heading: "MEMBRO",
    sections: [
      {
        title: "São:",
        items: [
          "Pessoas da corrente",
          "Pessoas da assistência",
          "Visitantes do terreiro",
        ],
      },
      {
        title: "Pode:",
        items: ["Acessar os pontos do terreiro"],
      },
    ],
  },
} as const;

export function getAccessRoleCopy(role: AccessRole): AccessRoleCopy {
  return ACCESS_ROLE_COPY[role];
}

const ACCESS_ROLE_INFO_TITLE = "O que esse nível de acesso permite";

export function getAccessRoleInfoProps(role: AccessRole): InfoProps {
  const copy = getAccessRoleCopy(role);
  const roleLabel = getAccessRoleLabel(role);

  return {
    accessibilityLabel: `Ver o que o nível ${roleLabel} permite`,
    title: ACCESS_ROLE_INFO_TITLE,
    heading: copy.heading,
    sections: copy.sections.map((s) => ({
      title: s.title,
      items: s.items,
    })),
  };
}
