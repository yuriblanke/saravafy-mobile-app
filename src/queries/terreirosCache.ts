import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "./queryKeys";

function safeLocaleCompare(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}

export function invalidateTerreiro(
  queryClient: QueryClient,
  terreiroId: string
) {
  if (!terreiroId) return;

  queryClient.invalidateQueries({
    queryKey: queryKeys.terreiros.byId(terreiroId),
  });

  // Also invalidates collections-by-terreiro since cards depend on ownership.
  queryClient.invalidateQueries({
    queryKey: queryKeys.terreiros.collectionsByTerreiro(terreiroId),
  });
}

export function invalidateTerreiroListsForRoles(
  queryClient: QueryClient,
  userId: string
) {
  if (!userId) return;

  // "Terreiros" screen: list with role admin/editor/member.
  queryClient.invalidateQueries({
    queryKey: queryKeys.terreiros.withRole(userId),
  });

  // Membership-derived lists/filters.
  queryClient.invalidateQueries({
    queryKey: queryKeys.me.terreiroAccessIds(userId),
  });
  queryClient.invalidateQueries({ queryKey: queryKeys.me.terreiros(userId) });
  queryClient.invalidateQueries({
    queryKey: queryKeys.me.editableTerreiros(userId),
  });
  queryClient.invalidateQueries({ queryKey: queryKeys.me.permissions(userId) });
}

export function patchTerreiroInLists(
  queryClient: QueryClient,
  params: {
    userId: string;
    terreiro: {
      id: string;
      name: string;
      coverImageUrl?: string | null;
      role?: "admin" | "editor" | "member" | "follower";
    };
  }
) {
  const { userId, terreiro } = params;
  if (!userId || !terreiro?.id) return;

  const hasCoverField = Object.prototype.hasOwnProperty.call(
    terreiro,
    "coverImageUrl"
  );

  // Patch the main "Terreiros" list cache if present.
  const key = queryKeys.terreiros.withRole(userId);
  const prev = queryClient.getQueryData(key) as any;

  if (Array.isArray(prev)) {
    const next = [...prev];
    const idx = next.findIndex((t: any) => t?.id === terreiro.id);
    if (idx >= 0) {
      next[idx] = {
        ...next[idx],
        name: terreiro.name,
        coverImageUrl: hasCoverField
          ? typeof terreiro.coverImageUrl === "string"
            ? terreiro.coverImageUrl
            : undefined
          : next[idx]?.coverImageUrl,
        role: terreiro.role ?? next[idx]?.role,
      };
    } else {
      next.push({
        id: terreiro.id,
        name: terreiro.name,
        role: terreiro.role ?? "admin",
        coverImageUrl:
          typeof terreiro.coverImageUrl === "string"
            ? terreiro.coverImageUrl
            : undefined,
      });
    }

    next.sort((a: any, b: any) =>
      safeLocaleCompare(String(a?.name ?? ""), String(b?.name ?? ""))
    );
    queryClient.setQueryData(key, next);
  }

  // Patch editable terreiros list (admin/editor) if present.
  const editableKey = queryKeys.me.editableTerreiros(userId);
  const prevEditable = queryClient.getQueryData(editableKey) as any;

  if (Array.isArray(prevEditable)) {
    const next = [...prevEditable];
    const idx = next.findIndex((t: any) => t?.id === terreiro.id);
    const cover = hasCoverField
      ? typeof terreiro.coverImageUrl === "string"
        ? terreiro.coverImageUrl
        : null
      : idx >= 0
      ? next[idx]?.cover_image_url ?? null
      : null;

    if (idx >= 0) {
      next[idx] = {
        ...next[idx],
        title: terreiro.name,
        cover_image_url: cover,
      };
    } else {
      next.push({
        id: terreiro.id,
        title: terreiro.name,
        cover_image_url: cover,
        role: terreiro.role === "editor" ? "editor" : "admin",
      });
    }

    next.sort((a: any, b: any) =>
      safeLocaleCompare(String(a?.title ?? ""), String(b?.title ?? ""))
    );
    queryClient.setQueryData(editableKey, next);
  }
}
