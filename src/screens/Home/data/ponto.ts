import { supabase } from "@/lib/supabase";

export type Ponto = {
  id: string;
  title: string;
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
  const { data, error } = await supabase.from(PONTOS_TABLE).select("*");

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    tags: coerceTags(row.tags),
    lyrics: row.lyrics,
  }));
}
