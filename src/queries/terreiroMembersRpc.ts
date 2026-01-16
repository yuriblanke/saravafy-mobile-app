import { supabase } from "@/lib/supabase";

export type TerreiroMembersVisibilityTier = "public" | "member" | "admin";

export type TerreiroMemberPublic = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type TerreiroMemberMember = TerreiroMemberPublic & {
  role: string | null;
  status: string | null;
};

export type TerreiroMemberAdmin = TerreiroMemberMember & {
  email: string | null;
  email_verified: boolean | null;
};

export type TerreiroMemberAny =
  | TerreiroMemberPublic
  | TerreiroMemberMember
  | TerreiroMemberAdmin;

function getErrorMessage(e: unknown): string {
  if (e instanceof Error && typeof e.message === "string" && e.message.trim()) {
    return e.message;
  }

  if (e && typeof e === "object") {
    const anyErr = e as any;
    if (typeof anyErr?.message === "string" && anyErr.message.trim()) {
      return anyErr.message;
    }
  }

  return String(e);
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asBooleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function parsePublicRow(row: unknown): TerreiroMemberPublic | null {
  if (!row || typeof row !== "object") return null;
  const r = row as any;

  const user_id = typeof r.user_id === "string" ? r.user_id : "";
  if (!user_id) return null;

  return {
    user_id,
    full_name: asStringOrNull(r.full_name),
    avatar_url: asStringOrNull(r.avatar_url),
  };
}

function parseMemberRow(row: unknown): TerreiroMemberMember | null {
  const base = parsePublicRow(row);
  if (!base) return null;
  const r = row as any;

  return {
    ...base,
    role: asStringOrNull(r.role),
    status: asStringOrNull(r.status),
  };
}

function parseAdminRow(row: unknown): TerreiroMemberAdmin | null {
  const base = parseMemberRow(row);
  if (!base) return null;
  const r = row as any;

  return {
    ...base,
    email: asStringOrNull(r.email),
    email_verified: asBooleanOrNull(r.email_verified),
  };
}

export async function fetchTerreiroMembersCount(terreiroId: string) {
  if (!terreiroId) return null as number | null;

  const res = await supabase.rpc("get_terreiro_members_count", {
    p_terreiro_id: terreiroId,
  });

  if (res.error) {
    throw new Error(
      typeof res.error.message === "string" && res.error.message.trim()
        ? res.error.message
        : "Não foi possível carregar a contagem de membros."
    );
  }

  const data: any = res.data;

  if (typeof data === "number" && Number.isFinite(data)) return data;

  if (data && typeof data === "object" && typeof data.count === "number") {
    return data.count;
  }

  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (typeof first === "number" && Number.isFinite(first)) return first;
    if (first && typeof first === "object" && typeof (first as any).count === "number") {
      return (first as any).count;
    }
  }

  return null;
}

export async function fetchTerreiroMembersList(params: {
  terreiroId: string;
  visibilityTier: TerreiroMembersVisibilityTier;
}): Promise<TerreiroMemberAny[]> {
  const { terreiroId, visibilityTier } = params;

  if (!terreiroId) return [];

  const fn =
    visibilityTier === "admin"
      ? "get_terreiro_members_for_admins"
      : visibilityTier === "member"
        ? "get_terreiro_members_for_members"
        : "get_terreiro_members_public";

  const res = await supabase.rpc(fn, { p_terreiro_id: terreiroId });

  if (res.error) {
    throw new Error(getErrorMessage(res.error) || "Não foi possível carregar os membros.");
  }

  const rows = Array.isArray(res.data) ? res.data : [];

  if (visibilityTier === "admin") {
    return rows.map(parseAdminRow).filter(Boolean) as TerreiroMemberAdmin[];
  }

  if (visibilityTier === "member") {
    return rows.map(parseMemberRow).filter(Boolean) as TerreiroMemberMember[];
  }

  return rows.map(parsePublicRow).filter(Boolean) as TerreiroMemberPublic[];
}
