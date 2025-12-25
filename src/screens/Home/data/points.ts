import { supabase } from "@/lib/supabase";

export type Point = {
  id: string;
  title: string;
  tags: string[];
  lyrics: string;
};

const POINTS_TABLE = "pontos";

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

type PointRow = {
  id: string;
  title: string;
  lyrics: string;
  tags?: unknown;
  is_active?: boolean;
  restricted?: boolean;
  created_at?: string;
};

export async function fetchAllPoints(): Promise<Point[]> {
  const { data, error } = await supabase
    .from(POINTS_TABLE)
    .select("id,title,lyrics,tags,is_active,restricted,created_at")
    .eq("is_active", true)
    .eq("restricted", false)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: PointRow) => {
    const baseTags = coerceTags(row.tags);

    return {
      id: String(row.id),
      title: String(row.title),
      tags: baseTags,
      lyrics: String(row.lyrics ?? ""),
    };
  });
}
