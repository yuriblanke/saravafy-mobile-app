import { supabase } from "@/lib/supabase";
import { parseEntidadeChipFieldsFromPontoRow } from "@/src/domain/entidade";
import { PONTOS_ENTIDADE_ORIXA_EMBED } from "@/src/queries/pontoEntidadeSelect";

export type Ponto = {
  id: string;
  title: string;
  tags: string[];
  lyrics: string;
  lyrics_preview_6?: string | null;
  author_name?: string | null;
  is_public_domain?: boolean | null;
  entidade_id: string | null;
  entidadeNome: string | null;
  orixaNome: string | null;
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
      `id, title, tags, author_name, is_public_domain, ${PONTOS_ENTIDADE_ORIXA_EMBED}, ponto_versoes!inner(lyrics, lyrics_preview_6)`,
    )
    .eq("is_active", true)
    .eq("restricted", false)
    .eq("ponto_versoes.is_canonical", true)
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
  return (data ?? []).map((row: any) => {
    const versoes = Array.isArray(row.ponto_versoes)
      ? row.ponto_versoes
      : row.ponto_versoes
        ? [row.ponto_versoes]
        : [];
    const versao = versoes[0];
    const chip = parseEntidadeChipFieldsFromPontoRow(row);
    return {
      id: row.id,
      title: row.title,
      tags: coerceTags(row.tags),
      lyrics: typeof versao?.lyrics === "string" ? versao.lyrics : "",
      lyrics_preview_6:
        versao?.lyrics_preview_6 == null
          ? null
          : String(versao.lyrics_preview_6),
      author_name: typeof row.author_name === "string" ? row.author_name : null,
      is_public_domain:
        typeof row.is_public_domain === "boolean" ? row.is_public_domain : null,
      entidade_id: chip.entidade_id,
      entidadeNome: chip.entidadeNome,
      orixaNome: chip.orixaNome,
    };
  });
}
