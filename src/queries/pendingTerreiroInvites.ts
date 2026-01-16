import { supabase } from "@/lib/supabase";
import {
  normalizeTerreiroMemberKind,
  normalizeTerreiroRole,
  type TerreiroMemberKind,
  type TerreiroRole,
} from "@/src/domain/terreiroRoles";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "./queryKeys";

export type PendingTerreiroInvite = {
  id: string;
  terreiro_id: string;
  role: TerreiroRole;
  created_at: string;
  terreiro_title?: string | null;
  member_kind?: TerreiroMemberKind | null;
};

function isColumnMissingError(message: string, columnName: string) {
  const m = String(message ?? "");
  const lower = m.toLowerCase();
  const col = columnName.toLowerCase();
  return (
    lower.includes(col) &&
    (lower.includes("does not exist") || lower.includes("column"))
  );
}

export function usePendingTerreiroInvitesForInviteeQuery(params: {
  normalizedEmail: string | null;
  enabled?: boolean;
}) {
  const { normalizedEmail, enabled = true } = params;

  return useQuery({
    queryKey: normalizedEmail
      ? queryKeys.terreiroInvites.pendingForInvitee(normalizedEmail)
      : (["terreiroInvites", "pendingForInvitee", null] as const),
    enabled: !!normalizedEmail && enabled,
    staleTime: 0,
    queryFn: async () => {
      if (!normalizedEmail) return [] as PendingTerreiroInvite[];

      const selectWithTitle =
        "id, terreiro_id, role, created_at, member_kind, terreiro:terreiros(title)";
      const selectWithName =
        "id, terreiro_id, role, created_at, member_kind, terreiro:terreiros(name)";

      const selectWithTitleNoKind =
        "id, terreiro_id, role, created_at, terreiro:terreiros(title)";
      const selectWithNameNoKind =
        "id, terreiro_id, role, created_at, terreiro:terreiros(name)";

      let useName = false;
      let includeMemberKind = true;

      let res: any = await supabase
        .from("terreiro_invites")
        .select(selectWithTitle)
        .eq("status", "pending")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: true });

      if (res.error && isColumnMissingError(res.error.message, "title")) {
        useName = true;
        res = await supabase
          .from("terreiro_invites")
          .select(selectWithName)
          .eq("status", "pending")
          .eq("email", normalizedEmail)
          .order("created_at", { ascending: true });
      }

      if (res.error && isColumnMissingError(res.error.message, "member_kind")) {
        includeMemberKind = false;
        res = await supabase
          .from("terreiro_invites")
          .select(useName ? selectWithNameNoKind : selectWithTitleNoKind)
          .eq("status", "pending")
          .eq("email", normalizedEmail)
          .order("created_at", { ascending: true });

        if (res.error && !useName && isColumnMissingError(res.error.message, "title")) {
          useName = true;
          res = await supabase
            .from("terreiro_invites")
            .select(selectWithNameNoKind)
            .eq("status", "pending")
            .eq("email", normalizedEmail)
            .order("created_at", { ascending: true });
        }
      }

      if (res.error) {
        return [] as PendingTerreiroInvite[];
      }

      const rows: any[] = Array.isArray(res.data) ? res.data : [];

      return rows
        .map((row) => {
          const normalizedRole = normalizeTerreiroRole(row?.role);
          if (!normalizedRole) return null;

          const id = typeof row?.id === "string" ? row.id : String(row?.id ?? "");
          const terreiroId =
            typeof row?.terreiro_id === "string"
              ? row.terreiro_id
              : String(row?.terreiro_id ?? "");
          if (!id || !terreiroId) return null;

          const terreiroTitle =
            typeof row?.terreiro?.title === "string"
              ? row.terreiro.title
              : typeof row?.terreiro?.name === "string"
                ? row.terreiro.name
                : null;

          const memberKind =
            normalizedRole === "member"
              ? normalizeTerreiroMemberKind(
                  includeMemberKind ? row?.member_kind : null
                )
              : null;

          const invite: PendingTerreiroInvite = {
            id,
            terreiro_id: terreiroId,
            role: normalizedRole,
            created_at: String(row?.created_at ?? new Date().toISOString()),
            terreiro_title: terreiroTitle,
            member_kind: memberKind,
          };

          return invite;
        })
        .filter(Boolean) as PendingTerreiroInvite[];
    },
  });
}
