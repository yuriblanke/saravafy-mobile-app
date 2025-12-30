import { supabase } from "@/lib/supabase";
import type { QueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "./queryKeys";

export type TerreiroTabRole = "admin" | "editor" | "member" | "follower";

type TerreiroContatoRow = {
  terreiro_id?: string;
  city?: string | null;
  state?: string | null;
  neighborhood?: string | null;
  phone_whatsapp?: string | null;
  phone_is_whatsapp?: boolean | null;
  instagram_handle?: string | null;
  is_primary?: boolean | null;
};

type TerreiroResponsavelRow = {
  terreiro_id?: string;
  name?: string | null;
  is_primary?: boolean | null;
  created_at?: string | null;
};

type TerreiroMemberRow = {
  user_id?: string | null;
  role?: TerreiroTabRole | null;
};

export type TerreiroListItem = {
  id: string;
  name: string;
  role?: TerreiroTabRole;
  about?: string;
  linesOfWork?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  phoneDigits?: string;
  instagramHandle?: string;
  responsaveis?: {
    name: string;
    isPrimary: boolean;
    createdAt: string | null;
  }[];
  coverImageUrl?: string;
};

function isTerreiroMembersPolicyRecursionError(error: unknown) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message ?? ""
      : "";

  const m = message.toLowerCase();
  return (
    m.includes("infinite recursion detected in policy") &&
    m.includes('relation "terreiro_members"')
  );
}

function isColumnMissingError(error: unknown, columnName: string) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";

  return (
    message.includes(columnName) &&
    (message.includes("does not exist") || message.includes("column"))
  );
}

export async function fetchTerreirosWithRole(
  userId: string
): Promise<TerreiroListItem[]> {
  const selectWithCover =
    "id, title, about, lines_of_work, cover_image_url, terreiro_members(role, user_id)";
  const selectWithoutCover =
    "id, title, about, lines_of_work, terreiro_members(role, user_id)";

  const selectWithCoverNoMembers =
    "id, title, about, lines_of_work, cover_image_url";
  const selectWithoutCoverNoMembers = "id, title, about, lines_of_work";

  let res: any = await supabase
    .from("terreiros")
    .select(selectWithCover)
    .order("title", { ascending: true });

  if (res.error && isColumnMissingError(res.error, "cover_image_url")) {
    res = await supabase
      .from("terreiros")
      .select(selectWithoutCover)
      .order("title", { ascending: true });
  }

  if (res.error && isTerreiroMembersPolicyRecursionError(res.error)) {
    let noMembers: any = await supabase
      .from("terreiros")
      .select(selectWithCoverNoMembers)
      .order("title", { ascending: true });

    if (
      noMembers.error &&
      isColumnMissingError(noMembers.error, "cover_image_url")
    ) {
      noMembers = await supabase
        .from("terreiros")
        .select(selectWithoutCoverNoMembers)
        .order("title", { ascending: true });
    }

    res = noMembers;
  }

  if (res.error) {
    throw new Error(res.error.message ?? "Erro ao carregar terreiros");
  }

  const rows = (res.data ?? []) as any[];
  const ids = rows
    .map((t) => (typeof t?.id === "string" ? t.id : ""))
    .filter(Boolean);

  let contatoByTerreiroId: Record<string, TerreiroContatoRow> = {};
  let responsaveisByTerreiroId: Record<string, TerreiroResponsavelRow[]> = {};

  if (ids.length > 0) {
    const [contatoRes, responsaveisRes] = await Promise.all([
      supabase
        .from("terreiros_contatos")
        .select(
          "terreiro_id, city, state, neighborhood, phone_whatsapp, phone_is_whatsapp, instagram_handle, is_primary"
        )
        .in("terreiro_id", ids)
        .eq("is_primary", true),
      supabase
        .from("terreiros_responsaveis")
        .select("terreiro_id, name, is_primary, created_at")
        .in("terreiro_id", ids)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true }),
    ]);

    if (!contatoRes.error) {
      for (const c of (contatoRes.data ?? []) as TerreiroContatoRow[]) {
        if (typeof c?.terreiro_id === "string" && c.terreiro_id) {
          contatoByTerreiroId[c.terreiro_id] = c;
        }
      }
    }

    if (!responsaveisRes.error) {
      for (const r of (responsaveisRes.data ??
        []) as TerreiroResponsavelRow[]) {
        if (typeof r?.terreiro_id !== "string" || !r.terreiro_id) continue;
        if (!responsaveisByTerreiroId[r.terreiro_id]) {
          responsaveisByTerreiroId[r.terreiro_id] = [];
        }
        responsaveisByTerreiroId[r.terreiro_id].push(r);
      }
    }
  }

  const mapped = rows.map((t: any): TerreiroListItem | null => {
    const id = typeof t?.id === "string" ? t.id : "";
    if (!id) return null;

    const members = (t?.terreiro_members ?? []) as TerreiroMemberRow[];
    const match =
      typeof userId === "string" && userId
        ? members.find((m) => m?.user_id === userId)
        : members[0];

    let role: TerreiroTabRole = "follower";
    const r = match?.role;
    if (r === "admin" || r === "editor" || r === "member" || r === "follower") {
      role = r;
    }

    const contato = contatoByTerreiroId[id];
    const responsaveis = responsaveisByTerreiroId[id] ?? [];

    const item: TerreiroListItem = {
      id,
      name: typeof t?.title === "string" ? t.title : "Terreiro",
      role,
      about:
        typeof t?.about === "string" && t.about.trim()
          ? t.about.trim()
          : undefined,
      linesOfWork:
        typeof t?.lines_of_work === "string" && t.lines_of_work.trim()
          ? t.lines_of_work.trim()
          : undefined,
      city:
        contato && typeof contato.city === "string" && contato.city.trim()
          ? contato.city.trim()
          : undefined,
      state:
        contato && typeof contato.state === "string" && contato.state.trim()
          ? contato.state.trim()
          : undefined,
      neighborhood:
        contato &&
        typeof contato.neighborhood === "string" &&
        contato.neighborhood.trim()
          ? contato.neighborhood.trim()
          : undefined,
      phoneDigits:
        contato &&
        typeof contato.phone_whatsapp === "string" &&
        contato.phone_whatsapp.trim()
          ? contato.phone_whatsapp.replace(/\D/g, "")
          : undefined,
      instagramHandle:
        contato &&
        typeof contato.instagram_handle === "string" &&
        contato.instagram_handle.trim()
          ? contato.instagram_handle.trim().replace(/^@+/, "")
          : undefined,
      responsaveis: responsaveis
        .map((rr) => ({
          name:
            typeof rr?.name === "string" && rr.name.trim()
              ? rr.name.trim()
              : "",
          isPrimary: rr?.is_primary === true,
          createdAt:
            typeof rr?.created_at === "string" && rr.created_at.trim()
              ? rr.created_at
              : null,
        }))
        .filter((rr) => rr.name.length > 0),
      coverImageUrl:
        typeof t?.cover_image_url === "string" && t.cover_image_url.trim()
          ? t.cover_image_url.trim()
          : undefined,
    };

    return item;
  });

  return mapped.filter((x): x is TerreiroListItem => x !== null);
}

export function useTerreirosWithRoleQuery(userId: string | null) {
  return useQuery({
    queryKey: userId ? queryKeys.terreiros.withRole(userId) : [],
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      if (!userId) return [] as TerreiroListItem[];
      return fetchTerreirosWithRole(userId);
    },
    placeholderData: (prev) => prev,
  });
}

export async function prefetchTerreirosWithRole(
  queryClient: QueryClient,
  params: { userId: string }
): Promise<TerreiroListItem[]> {
  if (!params.userId) return [];

  return queryClient.fetchQuery({
    queryKey: queryKeys.terreiros.withRole(params.userId),
    staleTime: 30_000,
    queryFn: () => fetchTerreirosWithRole(params.userId),
  });
}
