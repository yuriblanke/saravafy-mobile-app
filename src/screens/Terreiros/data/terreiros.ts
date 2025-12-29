import { supabase } from "@/lib/supabase";
// import já existe, não duplicar
import { TerreiroRole } from "@/contexts/PreferencesContext";

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
  role?: TerreiroRole | null;
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

  // Busca todos os terreiros (o RLS pode limitar o retorno conforme o usuário)
  let res: any = await supabase
    .from("terreiros")
    .select(selectWithCover)
    .order("title", { ascending: true });

  if (
    res.error &&
    typeof res.error.message === "string" &&
    res.error.message.includes("cover_image_url") &&
    res.error.message.includes("does not exist")
  ) {
    res = await supabase
      .from("terreiros")
      .select(selectWithoutCover)
      .order("title", { ascending: true });
  }

  // If the `terreiro_members` RLS policy is in recursion, drop the join.
  if (res.error && isTerreiroMembersPolicyRecursionError(res.error)) {
    let noMembers: any = await supabase
      .from("terreiros")
      .select(selectWithCoverNoMembers)
      .order("title", { ascending: true });

    if (
      noMembers.error &&
      typeof noMembers.error.message === "string" &&
      noMembers.error.message.includes("cover_image_url") &&
      noMembers.error.message.includes("does not exist")
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

  return rows.map((t: any) => {
    const members = (t?.terreiro_members ?? []) as TerreiroMemberRow[];
    const match =
      typeof userId === "string" && userId
        ? members.find((m) => m?.user_id === userId)
        : members[0];

    let role: TerreiroRole = "follower";
    const r = match?.role;
    if (r === "admin" || r === "editor" || r === "follower") role = r;

    const contato =
      typeof t?.id === "string" ? contatoByTerreiroId[t.id] : undefined;
    const responsaveis =
      typeof t?.id === "string" ? responsaveisByTerreiroId[t.id] ?? [] : [];

    return {
      id: t.id,
      name: t.title,
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
    } satisfies TerreiroListItem;
  });
}

export type TerreiroListItem = {
  id: string;
  name: string;
  role?: import("@/contexts/PreferencesContext").TerreiroRole;
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
