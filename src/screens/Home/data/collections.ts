import { supabase } from "@/lib/supabase";

export type AllowedTerreiro = {
  terreiro_id: string;
  terreiro_title: string;
};

export type AccessibleCollection = {
  id: string;
  title: string | null;
  owner_user_id: string | null;
  owner_terreiro_id: string | null;
  terreiro_title: string | null;
};

function getErrorMessage(e: unknown): string {
  if (e instanceof Error && typeof e.message === "string" && e.message.trim()) {
    return e.message;
  }

  if (e && typeof e === "object") {
    const anyErr = e as any;
    if (typeof anyErr?.message === "string" && anyErr.message.trim()) {
      return anyErr.message;
    }
  }

  return String(e);
}

export async function fetchAllowedTerreiros(userId: string) {
  try {
    const res = await supabase
      .from("terreiro_members")
      .select("terreiro_id, role, status, terreiros:terreiro_id (title)")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role", ["admin", "editor"]);

    if (res.error) {
      throw new Error(
        typeof res.error.message === "string" && res.error.message.trim()
          ? res.error.message
          : "Erro ao carregar terreiros."
      );
    }

    const rows = (res.data ?? []) as any[];
    const mapped: AllowedTerreiro[] = rows
      .map((r) => {
        const terreiroTitle =
          typeof r?.terreiros?.title === "string" ? r.terreiros.title : null;
        if (typeof r?.terreiro_id !== "string" || !r.terreiro_id) return null;
        return {
          terreiro_id: r.terreiro_id,
          terreiro_title: terreiroTitle ?? "Terreiro",
        };
      })
      .filter(Boolean) as AllowedTerreiro[];

    mapped.sort((a, b) => a.terreiro_title.localeCompare(b.terreiro_title));
    return { data: mapped, error: null as string | null };
  } catch (e) {
    return { data: [] as AllowedTerreiro[], error: getErrorMessage(e) };
  }
}

export async function fetchAccessibleCollections(params: {
  userId: string;
  allowedTerreiroIds: string[];
}) {
  const { userId, allowedTerreiroIds } = params;

  try {
    const base = supabase
      .from("collections")
      .select(
        "id, title, owner_user_id, owner_terreiro_id, terreiros:owner_terreiro_id (title)"
      );

    const res =
      allowedTerreiroIds.length > 0
        ? await base.or(
            `owner_user_id.eq.${userId},owner_terreiro_id.in.(${allowedTerreiroIds.join(
              ","
            )})`
          )
        : await base.eq("owner_user_id", userId);

    if (res.error) {
      throw new Error(
        typeof res.error.message === "string" && res.error.message.trim()
          ? res.error.message
          : "Erro ao carregar coleções."
      );
    }

    const rows = (res.data ?? []) as any[];
    const mapped: AccessibleCollection[] = rows
      .map((r) => {
        if (typeof r?.id !== "string" || !r.id) return null;
        const terreiroTitle =
          typeof r?.terreiros?.title === "string" ? r.terreiros.title : null;
        return {
          id: r.id,
          title: typeof r.title === "string" ? r.title : null,
          owner_user_id:
            typeof r.owner_user_id === "string" ? r.owner_user_id : null,
          owner_terreiro_id:
            typeof r.owner_terreiro_id === "string"
              ? r.owner_terreiro_id
              : null,
          terreiro_title: terreiroTitle,
        };
      })
      .filter(Boolean) as AccessibleCollection[];

    // Ordena no client: pessoais primeiro, depois por title
    mapped.sort((a, b) => {
      const aPersonal = a.owner_user_id === userId ? 0 : 1;
      const bPersonal = b.owner_user_id === userId ? 0 : 1;
      if (aPersonal !== bPersonal) return aPersonal - bPersonal;

      const at = (a.title ?? "").toLowerCase();
      const bt = (b.title ?? "").toLowerCase();
      return at.localeCompare(bt);
    });

    return { data: mapped, error: null as string | null };
  } catch (e) {
    return { data: [] as AccessibleCollection[], error: getErrorMessage(e) };
  }
}

export async function createCollection(params: {
  title: string;
  ownerUserId: string | null;
  ownerTerreiroId: string | null;
}) {
  const { title, ownerUserId, ownerTerreiroId } = params;

  const cleanTitle = title.trim().slice(0, 40);
  if (!cleanTitle) {
    return { data: null as { id: string } | null, error: "Título inválido." };
  }

  try {
    const res = await supabase
      .from("collections")
      .insert({
        title: cleanTitle,
        owner_user_id: ownerUserId,
        owner_terreiro_id: ownerTerreiroId,
      })
      .select("id")
      .single();

    if (res.error) {
      throw new Error(
        typeof res.error.message === "string" && res.error.message.trim()
          ? res.error.message
          : "Erro ao criar coleção."
      );
    }

    const id =
      typeof (res.data as any)?.id === "string" ? (res.data as any).id : "";
    if (!id) throw new Error("Erro ao criar coleção.");

    return { data: { id }, error: null as string | null };
  } catch (e) {
    return { data: null as { id: string } | null, error: getErrorMessage(e) };
  }
}
