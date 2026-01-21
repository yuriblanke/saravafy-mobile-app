export type TerreiroRole = "admin" | "curimba" | "member";

// Raw role values that may still appear for backward compatibility.
export type TerreiroRoleRaw = TerreiroRole | "editor" | (string & {});

export function normalizeTerreiroRole(role: unknown): TerreiroRole | null {
  const r = typeof role === "string" ? role.trim().toLowerCase() : "";
  if (!r) return null;
  if (r === "editor") return "curimba";
  if (r === "admin" || r === "curimba" || r === "member") return r;
  return null;
}

export function formatTerreiroRoleLabel(role: unknown): string {
  const normalized = normalizeTerreiroRole(role);
  if (normalized === "admin") return "Admin";
  if (normalized === "curimba") return "Curimba";
  if (normalized === "member") return "Membro";
  return "";
}

export type TerreiroMemberKind = "corrente" | "assistencia";

export function normalizeTerreiroMemberKind(
  kind: unknown
): TerreiroMemberKind | null {
  const k = typeof kind === "string" ? kind.trim().toLowerCase() : "";
  if (k === "corrente" || k === "assistencia") return k;
  return null;
}

export function formatTerreiroMemberKindLabel(kind: unknown): string {
  const normalized = normalizeTerreiroMemberKind(kind);
  if (normalized === "corrente") return "Corrente";
  if (normalized === "assistencia") return "Assistência";
  return "";
}
