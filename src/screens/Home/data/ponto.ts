import { supabase } from "@/lib/supabase";

export type Ponto = {
  id: string;
  title: string;
  artist?: string | null;
  tags: string[];
  lyrics: string;
};

const PONTOS_TABLE = "pontos";

function coerceTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }

  if (typeof value === "string") {
    // suporta tags armazenadas como "a,b,c" ou "a | b | c"
    return value
      .split(/[,|]/g)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  return [];
}

export async function fetchAllPontos(): Promise<Ponto[]> {
  const { data, error } = await supabase
    .from(PONTOS_TABLE)
    .select("id, title, artist, lyrics, tags")
    .eq("is_active", true)
    .eq("restricted", false)
    .order("title", { ascending: true });

  if (error) {
    const anyErr = error as any;
    const message =
      typeof anyErr?.message === "string" && anyErr.message.trim()
        ? anyErr.message
        : "Erro ao carregar pontos.";
    const extra = [anyErr?.code, anyErr?.details, anyErr?.hint]
      .filter((v) => typeof v === "string" && v.trim().length > 0)
      .join(" | ");

    throw new Error(extra ? `${message} (${extra})` : message);
  }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    artist: typeof row.artist === "string" ? row.artist : null,
    tags: coerceTags(row.tags),
    lyrics: row.lyrics,
  }));
}
