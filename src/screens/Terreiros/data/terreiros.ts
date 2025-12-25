import { supabase } from "@/lib/supabase";
// import já existe, não duplicar
import { TerreiroRole } from "@/contexts/PreferencesContext";

export async function fetchTerreirosWithRole(
  userId: string
): Promise<TerreiroListItem[]> {
  // Busca todos os terreiros
  const res = await supabase
    .from("terreiros")
    .select("id, name, terreiro_members(role)")
    .order("name", { ascending: true });

  if (res.error) {
    throw new Error(res.error.message ?? "Erro ao carregar terreiros");
  }

  return (res.data ?? []).map((t: any) => {
    let role: TerreiroRole = "follower";
    if (Array.isArray(t.terreiro_members) && t.terreiro_members.length > 0) {
      const r = t.terreiro_members[0]?.role;
      if (r === "admin" || r === "editor") role = r;
    }
    return { id: t.id, name: t.name, role };
  });
}

type TerreiroRow = {
  id: string;
  name: string;
  avatar_url?: string | null;
  image_url?: string | null;
};

export type TerreiroListItem = {
  id: string;
  name: string;
  role?: import("@/contexts/PreferencesContext").TerreiroRole;
};

function safeLocaleCompare(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}
