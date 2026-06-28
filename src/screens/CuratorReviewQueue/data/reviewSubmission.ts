import { supabase } from "@/lib/supabase";

export type PontoRow = {
  id: string;
  title: string;
  lyrics: string;
  author_name: string | null;
  tags: string[];
  is_public_domain: boolean | null;
  duration_seconds: number | null;
};

export type PontoAudioMetaRow = {
  id: string;
  interpreter_name: string | null;
  duration_ms: number | null;
  size_bytes: number | null;
  mime_type: string | null;
  upload_status: string | null;
  is_active: boolean | null;
};

export async function fetchPontoForReview(
  pontoId: string,
): Promise<PontoRow | null> {
  const res = await supabase
    .from("pontos")
    .select(
      "id, title, author_name, tags, is_public_domain, ponto_versoes!inner(lyrics, is_canonical)",
    )
    .eq("id", pontoId)
    .eq("is_active", true)
    .eq("ponto_versoes.is_canonical", true)
    .maybeSingle();

  if (res.error) throw res.error;
  if (!res.data) return null;

  const row: any = res.data;
  const versoes = Array.isArray(row.ponto_versoes)
    ? row.ponto_versoes
    : row.ponto_versoes
      ? [row.ponto_versoes]
      : [];
  const versao = versoes[0];

  return {
    id: String(row.id ?? ""),
    title: typeof row.title === "string" ? row.title : "",
    lyrics: typeof versao?.lyrics === "string" ? versao.lyrics : "",
    author_name:
      typeof row.author_name === "string" ? row.author_name : null,
    tags: Array.isArray(row.tags)
      ? row.tags.filter((t: any) => typeof t === "string")
      : typeof row.tags === "string"
        ? row.tags
            .split(/[,|]/g)
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [],
    is_public_domain:
      typeof row.is_public_domain === "boolean"
        ? row.is_public_domain
        : null,
    duration_seconds: null,
  };
}

export async function fetchPontoAudioMeta(
  pontoAudioId: string,
): Promise<PontoAudioMetaRow | null> {
  const res = await supabase
    .from("ponto_audios")
    .select(
      "id, interpreter_name, duration_ms, size_bytes, mime_type, upload_status, is_active",
    )
    .eq("id", pontoAudioId)
    .eq("is_active", true)
    .maybeSingle();

  if (res.error) throw res.error;
  if (!res.data) return null;

  const row: any = res.data;
  return {
    id: String(row.id ?? ""),
    interpreter_name:
      typeof row.interpreter_name === "string"
        ? row.interpreter_name
        : null,
    duration_ms:
      typeof row.duration_ms === "number" ? row.duration_ms : null,
    size_bytes: typeof row.size_bytes === "number" ? row.size_bytes : null,
    mime_type: typeof row.mime_type === "string" ? row.mime_type : null,
    upload_status:
      typeof row.upload_status === "string" ? row.upload_status : null,
    is_active: typeof row.is_active === "boolean" ? row.is_active : null,
  };
}

export async function persistPontoAudioDuration(params: {
  pontoAudioId: string;
  durationMs: number;
}): Promise<void> {
  const res = await supabase
    .from("ponto_audios")
    .update({ duration_ms: params.durationMs })
    .eq("id", params.pontoAudioId);

  if (res.error) {
    throw new Error("Não foi possível registrar a duração do áudio.");
  }
}
