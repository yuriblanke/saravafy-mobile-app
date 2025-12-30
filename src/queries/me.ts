import { supabase } from "@/lib/supabase";
import type { QueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "./queryKeys";

function isColumnMissingError(error: unknown, columnName: string) {
  const msg =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";

  const m = msg.toLowerCase();
  return (
    m.includes(columnName.toLowerCase()) &&
    (m.includes("does not exist") || m.includes("column"))
  );
}

export function useMyActiveTerreiroIdsQuery(userId: string | null) {
  return useQuery({
    queryKey: userId ? queryKeys.me.terreiros(userId) : [],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return [] as string[];

      let res: any = await supabase
        .from("terreiro_members")
        .select("terreiro_id, status")
        .eq("user_id", userId)
        .eq("status", "active");

      if (res.error && isColumnMissingError(res.error, "status")) {
        res = await supabase
          .from("terreiro_members")
          .select("terreiro_id")
          .eq("user_id", userId);
      }

      if (res.error) {
        const message =
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao carregar terreiros do usuário.";
        throw new Error(message);
      }

      const rows = (res.data ?? []) as Array<{ terreiro_id?: unknown }>;
      const ids = rows
        .map((r) => (typeof r?.terreiro_id === "string" ? r.terreiro_id : ""))
        .filter(Boolean);

      return Array.from(new Set(ids));
    },
    // Keep previous data during realtime-driven invalidations.
    placeholderData: (prev) => prev,
  });
}

export type EditableTerreiroRole = "admin" | "editor";

export type MyEditableTerreiro = {
  id: string;
  title: string;
  cover_image_url: string | null;
  role: EditableTerreiroRole;
};

function safeLocaleCompare(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}

type TerreiroMemberEditableRow = {
  terreiro_id: string;
  role: EditableTerreiroRole;
  status?: string | null;
};

type TerreiroMinimalRow = {
  id: string;
  title: string;
  cover_image_url?: string | null;
};

async function fetchMyEditableTerreiros(params: {
  userId: string;
  editableTerreiroIds?: string[];
}): Promise<MyEditableTerreiro[]> {
  const { userId } = params;
  const allowedRoles = ["admin", "editor"] as const;

  // 1) memberships (admin/editor) + status=active when column exists
  let usedStatusFilter = true;
  let members: any;

  if (Array.isArray(params.editableTerreiroIds)) {
    const ids = params.editableTerreiroIds.filter(Boolean);
    if (ids.length === 0) {
      return [];
    }

    members = await supabase
      .from("terreiro_members")
      .select("terreiro_id, role, status")
      .eq("user_id", userId)
      .in("role", [...allowedRoles])
      .in("terreiro_id", ids)
      .eq("status", "active");
  } else {
    members = await supabase
      .from("terreiro_members")
      .select("terreiro_id, role, status")
      .eq("user_id", userId)
      .in("role", [...allowedRoles])
      .eq("status", "active");
  }

  if (members.error && isColumnMissingError(members.error, "status")) {
    usedStatusFilter = false;
    if (Array.isArray(params.editableTerreiroIds)) {
      const ids = params.editableTerreiroIds.filter(Boolean);
      if (ids.length === 0) {
        return [];
      }
      members = await supabase
        .from("terreiro_members")
        .select("terreiro_id, role")
        .eq("user_id", userId)
        .in("role", [...allowedRoles])
        .in("terreiro_id", ids);
    } else {
      members = await supabase
        .from("terreiro_members")
        .select("terreiro_id, role")
        .eq("user_id", userId)
        .in("role", [...allowedRoles]);
    }
  }

  if (members.error) {
    const message =
      typeof members.error.message === "string" && members.error.message.trim()
        ? members.error.message
        : "Erro ao carregar permissões de terreiros.";
    throw new Error(message);
  }

  const memberRows = (members.data ?? []) as TerreiroMemberEditableRow[];
  const roleByTerreiroId = new Map<string, EditableTerreiroRole>();
  for (const row of memberRows) {
    const terreiroId = typeof row?.terreiro_id === "string" ? row.terreiro_id : "";
    const role = row?.role;
    if (!terreiroId) continue;
    if (role !== "admin" && role !== "editor") continue;
    // Prefer 'admin' if duplicates happen
    const prev = roleByTerreiroId.get(terreiroId);
    if (!prev || prev === "editor") {
      roleByTerreiroId.set(terreiroId, role);
    }
  }

  const terreiroIds = Array.from(roleByTerreiroId.keys());
  if (terreiroIds.length === 0) {
    return [];
  }

  // 2) terreiros data (minimal fields for rendering)
  let terreiros: any = await supabase
    .from("terreiros")
    .select("id, title, cover_image_url")
    .in("id", terreiroIds);

  if (terreiros.error && isColumnMissingError(terreiros.error, "cover_image_url")) {
    terreiros = await supabase
      .from("terreiros")
      .select("id, title")
      .in("id", terreiroIds);
  }

  if (terreiros.error) {
    const message =
      typeof terreiros.error.message === "string" && terreiros.error.message.trim()
        ? terreiros.error.message
        : "Erro ao carregar dados dos terreiros.";
    throw new Error(message);
  }

  const terreiroRows = (terreiros.data ?? []) as TerreiroMinimalRow[];

  const merged: MyEditableTerreiro[] = terreiroRows
    .map((t) => {
      const id = typeof t?.id === "string" ? t.id : "";
      const title = typeof t?.title === "string" ? t.title : "";
      if (!id || !title) return null;
      const role = roleByTerreiroId.get(id);
      if (!role) return null;

      return {
        id,
        title,
        cover_image_url:
          typeof t.cover_image_url === "string" ? t.cover_image_url : null,
        role,
      } satisfies MyEditableTerreiro;
    })
    .filter((x): x is MyEditableTerreiro => !!x)
    .sort((a, b) => safeLocaleCompare(a.title, b.title));

  // DEV-only: keep visibility into whether status filter was applied.
  if (__DEV__) {
    // Note: this function is used both in prefetch and in UI query.
    // Keep it lightweight and non-spammy.
    void usedStatusFilter;
  }

  return merged;
}

export function useMyEditableTerreirosQuery(userId: string | null) {
  return useQuery({
    queryKey: userId ? queryKeys.me.editableTerreiros(userId) : [],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return [] as MyEditableTerreiro[];
      return fetchMyEditableTerreiros({ userId });
    },
    placeholderData: (prev) => prev,
  });
}

export async function prefetchMyEditableTerreiros(
  queryClient: QueryClient,
  params: { userId: string; editableTerreiroIds: string[] }
) {
  const key = queryKeys.me.editableTerreiros(params.userId);

  if (!params.userId) {
    queryClient.setQueryData(key, [] as MyEditableTerreiro[]);
    return [] as MyEditableTerreiro[];
  }

  const ids = Array.isArray(params.editableTerreiroIds)
    ? params.editableTerreiroIds.filter(Boolean)
    : [];

  if (ids.length === 0) {
    queryClient.setQueryData(key, [] as MyEditableTerreiro[]);
    return [] as MyEditableTerreiro[];
  }

  return queryClient.fetchQuery({
    queryKey: key,
    staleTime: 60_000,
    queryFn: async () =>
      fetchMyEditableTerreiros({ userId: params.userId, editableTerreiroIds: ids }),
  });
}
