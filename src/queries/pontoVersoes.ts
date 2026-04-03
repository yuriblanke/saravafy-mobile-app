import { supabase } from "@/lib/supabase";

/** Campos carregados no player (subset do domínio). */
export type PontoVersaoPlayerRow = {
  id: string;
  ponto_id: string;
  versao_num: number;
  is_canonical: boolean;
  title: string | null;
  lyrics: string;
  lyrics_preview_6: string | null;
  is_active: boolean;
};

function sortByVersaoNum(a: PontoVersaoPlayerRow, b: PontoVersaoPlayerRow) {
  return a.versao_num - b.versao_num;
}

/**
 * Uma query por lista de pontos; agrupa por `ponto_id` e ordena por `versao_num`.
 */
export async function fetchActivePontoVersoesByPontoIds(
  pontoIds: string[],
): Promise<Map<string, PontoVersaoPlayerRow[]>> {
  const unique = Array.from(
    new Set(pontoIds.map((id) => String(id ?? "").trim()).filter(Boolean)),
  );
  const map = new Map<string, PontoVersaoPlayerRow[]>();
  if (unique.length === 0) return map;

  const res = await supabase
    .from("ponto_versoes")
    .select(
      "id, ponto_id, versao_num, is_canonical, title, lyrics, lyrics_preview_6, is_active",
    )
    .in("ponto_id", unique)
    .eq("is_active", true)
    .order("versao_num", { ascending: true });

  if (res.error) {
    const anyErr = res.error as any;
    const message =
      typeof anyErr?.message === "string" && anyErr.message.trim()
        ? anyErr.message
        : "Erro ao carregar versões.";
    throw new Error(message);
  }

  const rows = (res.data ?? []) as any[];
  for (const raw of rows) {
    const id = typeof raw?.id === "string" ? raw.id : "";
    const ponto_id = typeof raw?.ponto_id === "string" ? raw.ponto_id : "";
    const versao_num =
      typeof raw?.versao_num === "number" && Number.isFinite(raw.versao_num)
        ? raw.versao_num
        : Number(raw?.versao_num);
    if (!id || !ponto_id || !Number.isFinite(versao_num)) continue;

    const row: PontoVersaoPlayerRow = {
      id,
      ponto_id,
      versao_num,
      is_canonical: raw?.is_canonical === true,
      title: typeof raw?.title === "string" ? raw.title : null,
      lyrics: typeof raw?.lyrics === "string" ? raw.lyrics : "",
      lyrics_preview_6:
        typeof raw?.lyrics_preview_6 === "string"
          ? raw.lyrics_preview_6
          : null,
      is_active: raw?.is_active === true,
    };

    const list = map.get(ponto_id) ?? [];
    list.push(row);
    map.set(ponto_id, list);
  }

  for (const list of map.values()) {
    list.sort(sortByVersaoNum);
  }

  return map;
}
