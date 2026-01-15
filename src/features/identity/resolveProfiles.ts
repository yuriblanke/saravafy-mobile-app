import { supabase } from "@/lib/supabase";

export type PublicProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

function normalizeEmail(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export async function resolveProfiles(params: {
  userIds?: string[];
  emails?: string[];
}): Promise<{
  byId: Record<string, PublicProfile>;
  byEmailLower: Record<string, PublicProfile>;
}> {
  const userIds = Array.from(new Set(params.userIds ?? [])).filter(Boolean);
  const emailsRaw = Array.from(new Set(params.emails ?? [])).filter(Boolean);

  const byId: Record<string, PublicProfile> = {};
  const byEmailLower: Record<string, PublicProfile> = {};

  const upsert = (row: any) => {
    const id = typeof row?.id === "string" ? row.id : "";
    if (!id) return;

    const email = typeof row?.email === "string" ? row.email : null;
    const full_name = typeof row?.full_name === "string" ? row.full_name : null;
    const avatar_url =
      typeof row?.avatar_url === "string" ? row.avatar_url : null;

    const profile: PublicProfile = { id, email, full_name, avatar_url };
    byId[id] = profile;

    const emailLower = email ? normalizeEmail(email) : "";
    if (emailLower) {
      byEmailLower[emailLower] = profile;
    }
  };

  if (userIds.length > 0) {
    const res = await supabase
      .from("profiles")
      .select("id,email,full_name,avatar_url")
      .in("id", userIds);

    if (res.error) {
      throw new Error(
        typeof res.error.message === "string"
          ? res.error.message
          : "Erro ao carregar perfis."
      );
    }

    for (const row of (res.data ?? []) as any[]) {
      upsert(row);
    }
  }

  // Email matching for invites: PostgREST `.in('email')` is case-sensitive.
  // We do two passes (original + lowercased) and match client-side via emailLower.
  if (emailsRaw.length > 0) {
    const emailsLower = Array.from(
      new Set(emailsRaw.map(normalizeEmail))
    ).filter(Boolean);

    const [res1, res2] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,full_name,avatar_url")
        .in("email", emailsRaw),
      emailsLower.length === 0
        ? Promise.resolve({ data: [], error: null } as any)
        : supabase
            .from("profiles")
            .select("id,email,full_name,avatar_url")
            .in("email", emailsLower),
    ]);

    const errors = [res1?.error, res2?.error].filter(Boolean);
    if (errors.length > 0) {
      const first = errors[0];
      throw new Error(
        typeof first?.message === "string"
          ? first.message
          : "Erro ao carregar perfis."
      );
    }

    const rows = [
      ...((res1?.data ?? []) as any[]),
      ...((res2?.data ?? []) as any[]),
    ];
    for (const row of rows) {
      upsert(row);
    }
  }

  return { byId, byEmailLower };
}
