import { supabase } from "@/lib/supabase";

export type PontoAudio = {
  id: string;
  bucket: string;
  path: string;
  duration: number | null;
};

export async function fetchUploadedActiveAudioMapByPontoIds(
  pontoIds: string[],
): Promise<Record<string, PontoAudio>> {
  const ids = Array.from(
    new Set(
      (pontoIds ?? []).map((id) => String(id ?? "").trim()).filter(Boolean),
    ),
  );

  if (ids.length === 0) return {};

  const res = await supabase
    .from("ponto_audios")
    .select("id, ponto_id, storage_bucket, storage_path, duration_ms")
    .in("ponto_id", ids)
    .eq("is_active", true)
    .eq("upload_status", "uploaded");

  if (res.error) {
    throw new Error(
      typeof res.error.message === "string" && res.error.message.trim()
        ? res.error.message.trim()
        : "Erro ao carregar áudio dos pontos.",
    );
  }

  const out: Record<string, PontoAudio> = {};

  for (const row of res.data ?? []) {
    const pontoId =
      typeof (row as any)?.ponto_id === "string" ? (row as any).ponto_id : "";
    if (!pontoId) continue;
    if (out[pontoId]) continue;

    const bucket =
      typeof (row as any)?.storage_bucket === "string"
        ? (row as any).storage_bucket
        : "";
    const path =
      typeof (row as any)?.storage_path === "string"
        ? (row as any).storage_path
        : "";

    if (!bucket || !path) continue;

    const durationRaw = (row as any)?.duration_ms;
    const duration =
      typeof durationRaw === "number" && Number.isFinite(durationRaw)
        ? Math.round(durationRaw)
        : null;

    out[pontoId] = {
      id: String((row as any)?.id ?? ""),
      bucket,
      path,
      duration,
    };
  }

  return out;
}
