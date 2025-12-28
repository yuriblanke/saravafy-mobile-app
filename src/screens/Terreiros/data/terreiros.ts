import { supabase } from "@/lib/supabase";
// import já existe, não duplicar
import { TerreiroRole } from "@/contexts/PreferencesContext";

type TerreiroContatoRow = {
  terreiro_id?: string;
  city?: string | null;
  state?: string | null;
  phone_whatsapp?: string | null;
  instagram_handle?: string | null;
  is_primary?: boolean | null;
};

type TerreiroMemberRow = {
  user_id?: string | null;
  role?: TerreiroRole | null;
};

export async function fetchTerreirosWithRole(
  userId: string
): Promise<TerreiroListItem[]> {
  const selectWithEverything =
    "id, title, cover_image_url, terreiro_members(role, user_id), terreiros_contatos(terreiro_id, city, state, phone_whatsapp, instagram_handle, is_primary)";
  const selectWithoutCover =
    "id, title, terreiro_members(role, user_id), terreiros_contatos(terreiro_id, city, state, phone_whatsapp, instagram_handle, is_primary)";
  const selectWithoutContato =
    "id, title, cover_image_url, terreiro_members(role, user_id)";
  const selectWithoutContatoOrCover =
    "id, title, terreiro_members(role, user_id)";

  // Busca todos os terreiros (o RLS pode limitar o retorno conforme o usuário)
  let res: any = await supabase
    .from("terreiros")
    .select(selectWithEverything)
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

  // Se não existe relacionamento com terreiros_contatos, buscamos em query separada.
  const missingContatoRelationship =
    res.error &&
    typeof res.error.message === "string" &&
    res.error.message.includes("relationship") &&
    res.error.message.includes("terreiros_contatos");

  if (missingContatoRelationship) {
    res = await supabase
      .from("terreiros")
      .select(
        typeof res.error.message === "string" &&
          res.error.message.includes("cover_image_url")
          ? selectWithoutContatoOrCover
          : selectWithoutContato
      )
      .order("title", { ascending: true });
  }

  if (res.error) {
    throw new Error(res.error.message ?? "Erro ao carregar terreiros");
  }

  const rows = (res.data ?? []) as any[];
  const ids = rows
    .map((t) => (typeof t?.id === "string" ? t.id : ""))
    .filter(Boolean);

  let contatoByTerreiroId: Record<string, TerreiroContatoRow> = {};
  if (missingContatoRelationship && ids.length > 0) {
    const contatoRes = await supabase
      .from("terreiros_contatos")
      .select(
        "terreiro_id, city, state, neighborhood, address, phone_whatsapp, instagram_handle, is_primary"
      )
      .eq("is_primary", true)
      .in("terreiro_id", ids);

    if (!contatoRes.error) {
      for (const c of (contatoRes.data ?? []) as TerreiroContatoRow[]) {
        if (typeof c?.terreiro_id === "string" && c.terreiro_id) {
          contatoByTerreiroId[c.terreiro_id] = c;
        }
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

    let primaryContato: TerreiroContatoRow | undefined;
    if (Array.isArray(t?.terreiros_contatos)) {
      primaryContato = (t.terreiros_contatos as TerreiroContatoRow[]).find(
        (c) => c?.is_primary === true
      );
    }

    const fallbackContato =
      typeof t?.id === "string" ? contatoByTerreiroId[t.id] : undefined;
    const contato = primaryContato ?? fallbackContato;

    return {
      id: t.id,
      name: t.title,
      role,
      city:
        contato && typeof contato.city === "string" && contato.city.trim()
          ? contato.city.trim()
          : undefined,
      state:
        contato && typeof contato.state === "string" && contato.state.trim()
          ? contato.state.trim()
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
      coverImageUrl:
        typeof t?.cover_image_url === "string" && t.cover_image_url.trim()
          ? t.cover_image_url.trim()
          : undefined,
    } satisfies TerreiroListItem;
  });
}

type TerreiroRow = {
  id: string;
  title: string;
  avatar_url?: string | null;
  image_url?: string | null;
};

export type TerreiroListItem = {
  id: string;
  name: string;
  role?: import("@/contexts/PreferencesContext").TerreiroRole;
  city?: string;
  state?: string;
  phoneDigits?: string;
  instagramHandle?: string;
  coverImageUrl?: string;
};

function safeLocaleCompare(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}
