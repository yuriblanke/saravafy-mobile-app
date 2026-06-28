import { supabase } from "@/lib/supabase";

export type PendingCuratorInviteRow = {
  id: string;
  created_at: string;
};

export async function fetchPendingCuratorInviteForInvitee(
  normalizedEmail: string
): Promise<PendingCuratorInviteRow | null> {
  const res: any = await supabase
    .from("curator_invites")
    .select("id, created_at")
    .eq("status", "pending")
    .eq("email", normalizedEmail)
    .order("created_at", { ascending: true })
    .limit(1);

  if (res.error) return null;

  const row =
    Array.isArray(res.data) && res.data.length ? (res.data[0] as any) : null;
  if (!row?.id) return null;

  return {
    id: String(row.id),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export type CuratorInviteAdminRow = {
  id: string;
  email: string;
  status: string;
  created_at: string;
};

export async function fetchCuratorInvitesAdminList(): Promise<
  CuratorInviteAdminRow[]
> {
  const res: any = await supabase
    .from("curator_invites")
    .select("id, email, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (res.error) {
    throw new Error(
      typeof res.error.message === "string" ? res.error.message : "Erro"
    );
  }

  const rows = Array.isArray(res.data) ? res.data : [];
  return rows
    .map((row: any) => {
      const id = String(row?.id ?? "");
      if (!id) return null;
      return {
        id,
        email: String(row?.email ?? ""),
        status: String(row?.status ?? ""),
        created_at: String(row?.created_at ?? ""),
      };
    })
    .filter(Boolean) as CuratorInviteAdminRow[];
}

export async function rpcCuratorInvite(
  fnName: "accept_curator_invite" | "reject_curator_invite",
  inviteId: string
) {
  return supabase.rpc(fnName, { p_invite_id: inviteId }) as Promise<any>;
}

export async function createCuratorInvite(email: string): Promise<void> {
  const res: any = await supabase.rpc("create_curator_invite", {
    p_email: email,
  });
  if (res?.error) {
    throw new Error(
      typeof res.error.message === "string" ? res.error.message : "Erro ao convidar"
    );
  }
}

export async function cancelCuratorInvite(inviteId: string): Promise<void> {
  const res: any = await supabase.rpc("cancel_curator_invite", {
    p_invite_id: inviteId,
  });
  if (res?.error) {
    throw new Error(
      typeof res.error.message === "string" ? res.error.message : "Erro"
    );
  }
}
