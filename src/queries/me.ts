import { supabase } from "@/lib/supabase";
import {
  normalizeTerreiroMemberKind,
  normalizeTerreiroRole,
  type TerreiroMemberKind,
} from "@/src/domain/terreiroRoles";
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

export function useMyTerreiroIdsQuery(userId: string | null) {
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

export type TerreiroAccessRole = "admin" | "curimba" | "member";

export function useMyTerreiroAccessIdsQuery(userId: string | null) {
  return useQuery({
    queryKey: userId ? queryKeys.me.terreiroAccessIds(userId) : [],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return [] as string[];

      const allowedRoles = ["admin", "curimba", "editor", "member"] as const;

      let res: any = await supabase
        .from("terreiro_members")
        .select("terreiro_id, status")
        .eq("user_id", userId)
        .in("role", [...allowedRoles])
        .eq("status", "active");

      if (res.error && isColumnMissingError(res.error, "status")) {
        res = await supabase
          .from("terreiro_members")
          .select("terreiro_id")
          .eq("user_id", userId)
          .in("role", [...allowedRoles]);
      }

      if (res.error) {
        const message =
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao carregar terreiros com acesso do usuário.";
        throw new Error(message);
      }

      const rows = (res.data ?? []) as Array<{ terreiro_id?: unknown }>;
      const ids = rows
        .map((r) => (typeof r?.terreiro_id === "string" ? r.terreiro_id : ""))
        .filter(Boolean);

      return Array.from(new Set(ids));
    },
    placeholderData: (prev) => prev,
  });
}

export async function prefetchMyTerreiroAccessIds(
  queryClient: QueryClient,
  userId: string
): Promise<string[]> {
  if (!userId) return [];

  const data = await queryClient.fetchQuery({
    queryKey: queryKeys.me.terreiroAccessIds(userId),
    staleTime: 60_000,
    queryFn: async () => {
      const allowedRoles = ["admin", "curimba", "editor", "member"] as const;

      let res: any = await supabase
        .from("terreiro_members")
        .select("terreiro_id, status")
        .eq("user_id", userId)
        .in("role", [...allowedRoles])
        .eq("status", "active");

      if (res.error && isColumnMissingError(res.error, "status")) {
        res = await supabase
          .from("terreiro_members")
          .select("terreiro_id")
          .eq("user_id", userId)
          .in("role", [...allowedRoles]);
      }

      if (res.error) {
        const message =
          typeof res.error.message === "string" && res.error.message.trim()
            ? res.error.message
            : "Erro ao carregar terreiros com acesso do usuário.";
        throw new Error(message);
      }

      const rows = (res.data ?? []) as Array<{ terreiro_id?: unknown }>;
      const ids = rows
        .map((r) => (typeof r?.terreiro_id === "string" ? r.terreiro_id : ""))
        .filter(Boolean);
      return Array.from(new Set(ids));
    },
  });

  return Array.isArray(data) ? data : [];
}

export type EditableTerreiroRole = "admin" | "curimba";

export type MyEditableTerreiro = {
  id: string;
  title: string;
  cover_image_url: string | null;
  role: EditableTerreiroRole;
};

/**
 * Returned by `useMyManagedTerreirosQuery` — admin-only.
 * `role` is typed as `MyTerreiroRole` (broad) to match the legacy shape
 * from `contexts/PreferencesContext.tsx` for back-compat during migration.
 * Actual values are always `"admin"` in practice (the fetcher filters).
 */
export type ManagedTerreiro = {
  id: string;
  name: string;
  avatarUrl?: string;
  role: MyTerreiroRole;
};

function isTerreiroMembersPolicyRecursionError(error: unknown): boolean {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";

  const m = (message ?? "").toLowerCase();
  return (
    m.includes("infinite recursion detected in policy") &&
    m.includes('relation "terreiro_members"')
  );
}

type _ManagedTerreiroRow = {
  id: string;
  title: string;
  cover_image_url?: string | null;
  avatar_url?: string | null;
  image_url?: string | null;
};

type _ManagedTerreiroMemberRow = {
  terreiro_id: string;
  role: MyTerreiroRole;
};

export async function fetchMyManagedTerreiros(params: {
  userId: string;
}): Promise<ManagedTerreiro[]> {
  const { userId } = params;
  if (!userId) return [] as ManagedTerreiro[];

  const allowedRoles = ["admin"] as const;

  const selectTerreirosAll =
    "id, title, cover_image_url, avatar_url, image_url";
  const selectTerreirosAllWithoutCover = "id, title, avatar_url, image_url";
  const selectTerreirosImageOnly = "id, title, cover_image_url, image_url";
  const selectTerreirosImageOnlyWithoutCover = "id, title, image_url";
  const selectTerreirosWithoutImages = "id, title, cover_image_url";
  const selectTerreirosWithoutImagesWithoutCover = "id, title";

  let members: any = await supabase
    .from("terreiro_members")
    .select("terreiro_id, role")
    .eq("user_id", userId)
    .in("role", [...allowedRoles])
    .eq("status", "active");

  if (
    members.error &&
    typeof members.error.message === "string" &&
    members.error.message.includes("status") &&
    members.error.message.includes("does not exist")
  ) {
    members = await supabase
      .from("terreiro_members")
      .select("terreiro_id, role")
      .eq("user_id", userId)
      .in("role", [...allowedRoles]);
  }

  // RLS recursion fallback: query terreiros by created_by.
  if (members.error && isTerreiroMembersPolicyRecursionError(members.error)) {
    let created: any = await supabase
      .from("terreiros")
      .select(selectTerreirosAll)
      .eq("created_by", userId);

    if (
      created.error &&
      typeof created.error.message === "string" &&
      created.error.message.includes("cover_image_url") &&
      created.error.message.includes("does not exist")
    ) {
      created = await supabase
        .from("terreiros")
        .select(selectTerreirosAllWithoutCover)
        .eq("created_by", userId);
    }

    if (
      created.error &&
      typeof created.error.message === "string" &&
      created.error.message.includes("avatar_url") &&
      created.error.message.includes("does not exist")
    ) {
      created = await supabase
        .from("terreiros")
        .select(
          typeof created.error.message === "string" &&
            created.error.message.includes("cover_image_url")
            ? selectTerreirosImageOnlyWithoutCover
            : selectTerreirosImageOnly,
        )
        .eq("created_by", userId);
    }

    if (
      created.error &&
      typeof created.error.message === "string" &&
      created.error.message.includes("image_url") &&
      created.error.message.includes("does not exist")
    ) {
      created = await supabase
        .from("terreiros")
        .select(
          typeof created.error.message === "string" &&
            created.error.message.includes("cover_image_url")
            ? selectTerreirosWithoutImagesWithoutCover
            : selectTerreirosWithoutImages,
        )
        .eq("created_by", userId);
    }

    if (created.error) {
      throw new Error(
        "Administração indisponível: policy RLS em 'terreiro_members' está em recursão. Ajuste as policies no Supabase.",
      );
    }

    const rows = (created.data ?? []) as unknown as _ManagedTerreiroRow[];
    return rows
      .filter((t) => !!t?.id && !!t?.title)
      .map((t) => {
        const avatarUrl =
          (typeof t.cover_image_url === "string" && t.cover_image_url) ||
          (typeof t.avatar_url === "string" && t.avatar_url) ||
          (typeof t.image_url === "string" && t.image_url) ||
          undefined;

        return {
          id: t.id,
          name: t.title,
          avatarUrl,
          role: "admin" as MyTerreiroRole,
        } satisfies ManagedTerreiro;
      })
      .sort((a, b) => safeLocaleCompare(a.name, b.name));
  }

  if (members.error) {
    throw new Error(
      typeof members.error.message === "string"
        ? members.error.message
        : "Erro ao buscar permissões de terreiros",
    );
  }

  const memberRows = (members.data ?? []) as _ManagedTerreiroMemberRow[];
  const ids = Array.from(
    new Set(memberRows.map((m) => m.terreiro_id).filter(Boolean)),
  );

  if (ids.length === 0) {
    // Fallback: include terreiros the user created (membership may not be present yet).
    let created: any = await supabase
      .from("terreiros")
      .select(selectTerreirosAll)
      .eq("created_by", userId);

    if (
      created.error &&
      typeof created.error.message === "string" &&
      created.error.message.includes("created_by") &&
      created.error.message.includes("does not exist")
    ) {
      return [] as ManagedTerreiro[];
    }

    if (
      created.error &&
      typeof created.error.message === "string" &&
      created.error.message.includes("cover_image_url") &&
      created.error.message.includes("does not exist")
    ) {
      created = await supabase
        .from("terreiros")
        .select(selectTerreirosAllWithoutCover)
        .eq("created_by", userId);
    }

    if (
      created.error &&
      typeof created.error.message === "string" &&
      created.error.message.includes("avatar_url") &&
      created.error.message.includes("does not exist")
    ) {
      created = await supabase
        .from("terreiros")
        .select(
          typeof created.error.message === "string" &&
            created.error.message.includes("cover_image_url")
            ? selectTerreirosImageOnlyWithoutCover
            : selectTerreirosImageOnly,
        )
        .eq("created_by", userId);
    }

    if (
      created.error &&
      typeof created.error.message === "string" &&
      created.error.message.includes("image_url") &&
      created.error.message.includes("does not exist")
    ) {
      created = await supabase
        .from("terreiros")
        .select(
          typeof created.error.message === "string" &&
            created.error.message.includes("cover_image_url")
            ? selectTerreirosWithoutImagesWithoutCover
            : selectTerreirosWithoutImages,
        )
        .eq("created_by", userId);
    }

    if (created.error) {
      return [] as ManagedTerreiro[];
    }

    const createdRows = (created.data ?? []) as _ManagedTerreiroRow[];
    return createdRows
      .filter((t) => t?.id && t?.title)
      .map((t) => {
        const avatarUrl =
          (typeof t.cover_image_url === "string" && t.cover_image_url) ||
          (typeof t.avatar_url === "string" && t.avatar_url) ||
          (typeof t.image_url === "string" && t.image_url) ||
          undefined;

        return {
          id: t.id,
          name: t.title,
          avatarUrl,
          role: "admin" as MyTerreiroRole,
        } satisfies ManagedTerreiro;
      })
      .sort((a, b) => safeLocaleCompare(a.name, b.name));
  }

  let terreiros: any = await supabase
    .from("terreiros")
    .select(selectTerreirosAll)
    .in("id", ids);

  if (
    terreiros.error &&
    typeof terreiros.error.message === "string" &&
    terreiros.error.message.includes("cover_image_url") &&
    terreiros.error.message.includes("does not exist")
  ) {
    terreiros = await supabase
      .from("terreiros")
      .select(selectTerreirosAllWithoutCover)
      .in("id", ids);
  }

  if (
    terreiros.error &&
    typeof terreiros.error.message === "string" &&
    terreiros.error.message.includes("avatar_url") &&
    terreiros.error.message.includes("does not exist")
  ) {
    terreiros = await supabase
      .from("terreiros")
      .select(
        typeof terreiros.error.message === "string" &&
          terreiros.error.message.includes("cover_image_url")
          ? selectTerreirosImageOnlyWithoutCover
          : selectTerreirosImageOnly,
      )
      .in("id", ids);
  }

  if (
    terreiros.error &&
    typeof terreiros.error.message === "string" &&
    terreiros.error.message.includes("image_url") &&
    terreiros.error.message.includes("does not exist")
  ) {
    terreiros = await supabase
      .from("terreiros")
      .select(
        typeof terreiros.error.message === "string" &&
          terreiros.error.message.includes("cover_image_url")
          ? selectTerreirosWithoutImagesWithoutCover
          : selectTerreirosWithoutImages,
      )
      .in("id", ids);
  }

  if (terreiros.error) {
    throw new Error(
      typeof terreiros.error.message === "string"
        ? terreiros.error.message
        : "Erro ao buscar terreiros",
    );
  }

  const roleByTerreiroId = new Map<string, MyTerreiroRole>();
  for (const row of memberRows) {
    const role = row.role;
    if (role !== "admin" && role !== "curimba") continue;
    const prev = roleByTerreiroId.get(row.terreiro_id);
    if (!prev || prev !== "admin") {
      roleByTerreiroId.set(row.terreiro_id, role);
    }
  }

  const terreiroRows = (terreiros.data ?? []) as _ManagedTerreiroRow[];
  const mapped: (ManagedTerreiro | null)[] = terreiroRows.map((t) => {
    const role = roleByTerreiroId.get(t.id);
    if (!role) return null;

    const avatarUrl =
      (typeof t.cover_image_url === "string" && t.cover_image_url) ||
      (typeof t.avatar_url === "string" && t.avatar_url) ||
      (typeof t.image_url === "string" && t.image_url) ||
      undefined;

    return { id: t.id, name: t.title, avatarUrl, role };
  });

  return (mapped.filter((x) => x !== null) as ManagedTerreiro[]).sort(
    (a, b) => safeLocaleCompare(a.name, b.name),
  );
}

export function useMyManagedTerreirosQuery(userId: string | null) {
  return useQuery({
    queryKey: userId ? queryKeys.me.managedTerreiros(userId) : [],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return [] as ManagedTerreiro[];
      return fetchMyManagedTerreiros({ userId });
    },
    placeholderData: (prev) => prev,
  });
}

// NOTE: "follower" is not currently part of the terreiro_members access model
// in the known schema/policies. We intentionally do NOT infer follower here.
export type MyTerreiroRole = "admin" | "curimba" | "member";

export type MyTerreiroWithRole = {
  id: string;
  title: string;
  cover_image_url: string | null;
  role: MyTerreiroRole;
  member_kind: TerreiroMemberKind | null;
};

function safeLocaleCompare(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}

async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  message: string
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), ms);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timer]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

type TerreiroMemberEditableRow = {
  terreiro_id: string;
  role: string;
  status?: string | null;
};

type TerreiroMemberRoleRow = {
  terreiro_id: string;
  role: string;
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
  const allowedRoles = ["admin", "curimba", "editor"] as const;

  // 1) memberships (admin/curimba)
  // Prefer status='active' when the column exists. When it doesn't, we accept all.
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
    const terreiroId =
      typeof row?.terreiro_id === "string" ? row.terreiro_id : "";
    const role = normalizeTerreiroRole(row?.role);
    if (!terreiroId) continue;
    if (role !== "admin" && role !== "curimba") continue;
    // Prefer 'admin' if duplicates happen
    const prev = roleByTerreiroId.get(terreiroId);
    if (!prev || prev === "curimba") {
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

  if (
    terreiros.error &&
    isColumnMissingError(terreiros.error, "cover_image_url")
  ) {
    terreiros = await supabase
      .from("terreiros")
      .select("id, title")
      .in("id", terreiroIds);
  }

  if (terreiros.error) {
    const message =
      typeof terreiros.error.message === "string" &&
      terreiros.error.message.trim()
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

async function fetchMyTerreirosWithRole(params: {
  userId: string;
}): Promise<MyTerreiroWithRole[]> {
  const { userId } = params;
  const allowedRoles = ["admin", "curimba", "editor", "member"] as const;

  // 1) memberships (admin/curimba/member) + status=active
  const selectWithStatusAndKind = "terreiro_id, role, status, member_kind";
  const selectWithStatus = "terreiro_id, role, status";
  const selectWithKind = "terreiro_id, role, member_kind";
  const selectBase = "terreiro_id, role";

  let members: any = await withTimeout(
    supabase
      .from("terreiro_members")
      .select(selectWithStatusAndKind)
      .eq("user_id", userId)
      .in("role", [...allowedRoles])
      .eq("status", "active"),
    15_000,
    "Tempo esgotado ao carregar terreiros do usuário."
  );

  if (members.error && isColumnMissingError(members.error, "member_kind")) {
    members = await withTimeout(
      supabase
        .from("terreiro_members")
        .select(selectWithStatus)
        .eq("user_id", userId)
        .in("role", [...allowedRoles])
        .eq("status", "active"),
      15_000,
      "Tempo esgotado ao carregar terreiros do usuário."
    );
  }

  if (members.error && isColumnMissingError(members.error, "status")) {
    members = await withTimeout(
      supabase
        .from("terreiro_members")
        .select(selectWithKind)
        .eq("user_id", userId)
        .in("role", [...allowedRoles]),
      15_000,
      "Tempo esgotado ao carregar terreiros do usuário."
    );

    if (members.error && isColumnMissingError(members.error, "member_kind")) {
      members = await withTimeout(
        supabase
          .from("terreiro_members")
          .select(selectBase)
          .eq("user_id", userId)
          .in("role", [...allowedRoles]),
        15_000,
        "Tempo esgotado ao carregar terreiros do usuário."
      );
    }
  }

  if (members.error) {
    const message =
      typeof members.error.message === "string" && members.error.message.trim()
        ? members.error.message
        : "Erro ao carregar terreiros do usuário.";
    throw new Error(message);
  }

  const memberRows = (members.data ?? []) as Array<
    TerreiroMemberRoleRow & { member_kind?: unknown }
  >;
  const infoByTerreiroId = new Map<
    string,
    { role: MyTerreiroRole; member_kind: TerreiroMemberKind | null }
  >();
  for (const row of memberRows) {
    const terreiroId =
      typeof row?.terreiro_id === "string" ? row.terreiro_id : "";
    const rawRole = typeof row?.role === "string" ? row.role : "";
    if (!terreiroId) continue;
    const normalized = normalizeTerreiroRole(rawRole);
    if (!normalized) continue;

    const nextKind =
      normalized === "member"
        ? normalizeTerreiroMemberKind(row.member_kind)
        : null;

    // Prefer strongest role if duplicates happen
    const prev = infoByTerreiroId.get(terreiroId);
    const nextRole = normalized as MyTerreiroRole;
    if (!prev) {
      infoByTerreiroId.set(terreiroId, {
        role: nextRole,
        member_kind: nextKind,
      });
      continue;
    }

    if (
      prev.role === "member" &&
      (nextRole === "admin" || nextRole === "curimba")
    ) {
      infoByTerreiroId.set(terreiroId, {
        role: nextRole,
        member_kind: null,
      });
      continue;
    }
    if (prev.role === "curimba" && nextRole === "admin") {
      infoByTerreiroId.set(terreiroId, {
        role: nextRole,
        member_kind: null,
      });
      continue;
    }

    // Same role: keep member_kind if it becomes available.
    if (prev.role === "member" && nextRole === "member" && !prev.member_kind) {
      if (nextKind) {
        infoByTerreiroId.set(terreiroId, {
          role: "member",
          member_kind: nextKind,
        });
      }
    }
  }

  const terreiroIds = Array.from(infoByTerreiroId.keys());
  if (terreiroIds.length === 0) return [];

  // 2) terreiros data (minimal fields for rendering)
  let terreiros: any = await withTimeout(
    supabase
      .from("terreiros")
      .select("id, title, cover_image_url")
      .in("id", terreiroIds),
    15_000,
    "Tempo esgotado ao carregar dados dos terreiros."
  );

  if (
    terreiros.error &&
    isColumnMissingError(terreiros.error, "cover_image_url")
  ) {
    terreiros = await withTimeout(
      supabase.from("terreiros").select("id, title").in("id", terreiroIds),
      15_000,
      "Tempo esgotado ao carregar dados dos terreiros."
    );
  }

  if (terreiros.error) {
    const message =
      typeof terreiros.error.message === "string" &&
      terreiros.error.message.trim()
        ? terreiros.error.message
        : "Erro ao carregar dados dos terreiros.";
    throw new Error(message);
  }

  const terreiroRows = (terreiros.data ?? []) as TerreiroMinimalRow[];

  return terreiroRows
    .map((t) => {
      const id = typeof t?.id === "string" ? t.id : "";
      const title = typeof t?.title === "string" ? t.title : "";
      if (!id || !title) return null;
      const info = infoByTerreiroId.get(id);
      if (!info) return null;

      return {
        id,
        title,
        cover_image_url:
          typeof t.cover_image_url === "string" ? t.cover_image_url : null,
        role: info.role,
        member_kind: info.role === "member" ? info.member_kind : null,
      } satisfies MyTerreiroWithRole;
    })
    .filter((x): x is MyTerreiroWithRole => !!x)
    .sort((a, b) => safeLocaleCompare(a.title, b.title));
}

export function useMyTerreirosWithRoleQuery(userId: string | null) {
  return useQuery({
    queryKey: userId ? queryKeys.preferences.terreiros(userId) : [],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return [] as MyTerreiroWithRole[];
      return fetchMyTerreirosWithRole({ userId });
    },
    placeholderData: (prev) => prev,
  });
}

export async function prefetchPreferencesTerreiros(
  queryClient: QueryClient,
  params: { userId: string }
) {
  const key = queryKeys.preferences.terreiros(params.userId);
  return queryClient.prefetchQuery({
    queryKey: key,
    staleTime: 60_000,
    queryFn: async () => fetchMyTerreirosWithRole({ userId: params.userId }),
  });
}

// Alias semântico: o menu Preferences consome esta lista.
export function usePreferencesTerreirosQuery(userId: string | null) {
  return useMyTerreirosWithRoleQuery(userId);
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
      fetchMyEditableTerreiros({
        userId: params.userId,
        editableTerreiroIds: ids,
      }),
  });
}
