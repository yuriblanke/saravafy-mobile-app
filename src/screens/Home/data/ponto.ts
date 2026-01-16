import { supabase } from "@/lib/supabase";

export type Ponto = {
  id: string;
  title: string;
  tags: string[];
  lyrics: string;
  lyrics_preview_6?: string | null;
  author_name?: string | null;
  is_public_domain?: boolean | null;
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
    .select(
      "id, title, lyrics, tags, lyrics_preview_6, author_name, is_public_domain"
    )
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
    tags: coerceTags(row.tags),
    lyrics: row.lyrics,
    lyrics_preview_6:
      row.lyrics_preview_6 == null ? null : String(row.lyrics_preview_6),
    author_name: typeof row.author_name === "string" ? row.author_name : null,
    is_public_domain:
      typeof row.is_public_domain === "boolean" ? row.is_public_domain : null,
  }));
}
