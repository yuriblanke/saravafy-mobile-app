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
      phoneDigits?: string | null;
      phoneIsWhatsApp?: boolean | null;
      instagramHandle?: string | null;
      role?: "admin" | "curimba" | "member" | "follower";
    };
  }
) {
  const { userId, terreiro } = params;
  if (!userId || !terreiro?.id) return;

  const hasCoverField = Object.prototype.hasOwnProperty.call(
    terreiro,
    "coverImageUrl"
  );

  const hasPhoneDigitsField = Object.prototype.hasOwnProperty.call(
    terreiro,
    "phoneDigits"
  );
  const hasPhoneIsWhatsAppField = Object.prototype.hasOwnProperty.call(
    terreiro,
    "phoneIsWhatsApp"
  );
  const hasInstagramHandleField = Object.prototype.hasOwnProperty.call(
    terreiro,
    "instagramHandle"
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
        ...(hasPhoneDigitsField ? { phoneDigits: terreiro.phoneDigits } : null),
        ...(hasPhoneIsWhatsAppField
          ? { phoneIsWhatsApp: terreiro.phoneIsWhatsApp }
          : null),
        ...(hasInstagramHandleField
          ? { instagramHandle: terreiro.instagramHandle }
          : null),
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
        ...(hasPhoneDigitsField ? { phoneDigits: terreiro.phoneDigits } : null),
        ...(hasPhoneIsWhatsAppField
          ? { phoneIsWhatsApp: terreiro.phoneIsWhatsApp }
          : null),
        ...(hasInstagramHandleField
          ? { instagramHandle: terreiro.instagramHandle }
          : null),
      });
    }

    next.sort((a: any, b: any) =>
      safeLocaleCompare(String(a?.name ?? ""), String(b?.name ?? ""))
    );
    queryClient.setQueryData(key, next);
  }

  // Patch the Preferences list (My terreiros with role) cache.
  // We setQueryData even if it was undefined so new terreiros show immediately
  // while the server state reconciles via invalidate.
  const preferencesKey = queryKeys.preferences.terreiros(userId);
  queryClient.setQueryData(preferencesKey, (prev: any) => {
    const arr = Array.isArray(prev) ? prev : [];
    const next = [...arr];
    const idx = next.findIndex((t: any) => t?.id === terreiro.id);

    const role =
      terreiro.role === "admin" ||
      terreiro.role === "curimba" ||
      terreiro.role === "member"
        ? terreiro.role
        : idx >= 0
        ? next[idx]?.role
        : "admin";

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
        role,
      };
    } else {
      next.push({
        id: terreiro.id,
        title: terreiro.name,
        cover_image_url: cover,
        role,
      });
    }

    next.sort((a: any, b: any) =>
      safeLocaleCompare(String(a?.title ?? ""), String(b?.title ?? ""))
    );
    return next;
  });

  // Patch editable terreiros list (admin/curimba) if present.
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
        ...(hasPhoneDigitsField ? { phoneDigits: terreiro.phoneDigits } : null),
        ...(hasPhoneIsWhatsAppField
          ? { phoneIsWhatsApp: terreiro.phoneIsWhatsApp }
          : null),
        ...(hasInstagramHandleField
          ? { instagramHandle: terreiro.instagramHandle }
          : null),
      };
    } else {
      next.push({
        id: terreiro.id,
        title: terreiro.name,
        cover_image_url: cover,
        ...(hasPhoneDigitsField ? { phoneDigits: terreiro.phoneDigits } : null),
        ...(hasPhoneIsWhatsAppField
          ? { phoneIsWhatsApp: terreiro.phoneIsWhatsApp }
          : null),
        ...(hasInstagramHandleField
          ? { instagramHandle: terreiro.instagramHandle }
          : null),
        role: terreiro.role === "curimba" ? "curimba" : "admin",
      });
    }

    next.sort((a: any, b: any) =>
      safeLocaleCompare(String(a?.title ?? ""), String(b?.title ?? ""))
    );
    queryClient.setQueryData(editableKey, next);
  }
}

export function removeTerreiroFromLists(
  queryClient: QueryClient,
  params: { userId: string; terreiroId: string }
) {
  const { userId, terreiroId } = params;
  if (!userId || !terreiroId) return;

  const removeIfPresent = (key: readonly unknown[]) => {
    const prev = queryClient.getQueryData(key) as any;
    if (!Array.isArray(prev)) return;
    queryClient.setQueryData(key, (arr: any) => {
      const list = Array.isArray(arr) ? arr : [];
      return list.filter((t: any) => String(t?.id ?? "") !== terreiroId);
    });
  };

  removeIfPresent(queryKeys.preferences.terreiros(userId));
  removeIfPresent(queryKeys.terreiros.withRole(userId));
  removeIfPresent(queryKeys.me.editableTerreiros(userId));
}
