import { supabase } from "@/lib/supabase";
import {
  completePontoAudioUpload,
  initPontoAudioUpload,
  type CompleteUploadResponse,
} from "@/src/api/pontoAudio";
import { queryKeys } from "@/src/queries/queryKeys";
import { useMutation, useQuery } from "@tanstack/react-query";

export type PontoAudioRow = {
  id: string;
  ponto_id: string;
  storage_bucket: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  duration_ms: number | null;
  created_at: string | null;
  interpreter_name: string | null;
  upload_status: "pending" | "uploaded" | "failed" | "deleted" | string;
  is_active: boolean | null;
};

export function usePontoAudios(pontoId: string | null | undefined) {
  return useQuery({
    queryKey: pontoId ? queryKeys.pontoAudios.byPontoId(pontoId) : [],
    enabled: typeof pontoId === "string" && pontoId.trim().length > 0,
    queryFn: async () => {
      if (!pontoId) return [] as PontoAudioRow[];

      const { data, error } = await supabase
        .from("ponto_audios")
        .select(
          "id, ponto_id, storage_bucket, storage_path, mime_type, size_bytes, duration_ms, created_at, interpreter_name, upload_status, is_active"
        )
        .eq("ponto_id", pontoId)
        .eq("is_active", true)
        .eq("upload_status", "uploaded")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows: any[] = Array.isArray(data) ? (data as any[]) : [];
      return rows.map((r) => ({
        id: String(r.id),
        ponto_id: String(r.ponto_id),
        storage_bucket:
          typeof r.storage_bucket === "string" ? r.storage_bucket : null,
        storage_path: typeof r.storage_path === "string" ? r.storage_path : null,
        mime_type: typeof r.mime_type === "string" ? r.mime_type : null,
        size_bytes: typeof r.size_bytes === "number" ? r.size_bytes : null,
        duration_ms: typeof r.duration_ms === "number" ? r.duration_ms : null,
        created_at: typeof r.created_at === "string" ? r.created_at : null,
        interpreter_name:
          typeof r.interpreter_name === "string" ? r.interpreter_name : null,
        upload_status:
          typeof r.upload_status === "string" ? r.upload_status : "uploaded",
        is_active: typeof r.is_active === "boolean" ? r.is_active : null,
      })) as PontoAudioRow[];
    },
  });
}

export function useInitPontoAudioUploadMutation() {
  return useMutation({
    mutationFn: initPontoAudioUpload,
  });
}

export function useCompletePontoAudioUploadMutation() {
  return useMutation({
    mutationFn: async (params: {
      uploadToken: string;
      sizeBytes: number;
      durationMs: number;
      contentEtag?: string | null;
      sha256?: string | null;
    }) => {
      return completePontoAudioUpload({
        uploadToken: params.uploadToken,
        sizeBytes: params.sizeBytes,
        durationMs: params.durationMs,
        contentEtag: params.contentEtag ?? null,
        sha256: params.sha256 ?? null,
      });
    },
  });
}
