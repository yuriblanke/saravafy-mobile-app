import { supabase } from "@/lib/supabase";
import {
  completePontoAudioUpload,
  initPontoAudioUpload,
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

type LatestPontoAudioMetaRow = {
  id: string;
  ponto_id: string;
  interpreter_name: string | null;
  created_at: string | null;
};

function hashIds(ids: readonly string[]): string {
  const sorted = Array.from(new Set(ids.filter(Boolean))).sort();
  const input = sorted.join(",");

  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
}

export type LatestPontoAudioMetaByPontoIdMap = Record<
  string,
  {
    pontoAudioId: string;
    interpreterName: string | null;
    createdAt: string | null;
  }
>;

export function useLatestPontoAudioMetaByPontoIds(
  pontoIds: readonly string[],
  options?: { enabled?: boolean }
) {
  const ids = Array.from(new Set(pontoIds.filter(Boolean)));
  const idsHash = hashIds(ids);
  const enabled = (options?.enabled ?? true) && ids.length > 0;

  return useQuery({
    queryKey: enabled ? queryKeys.pontoAudios.byPontoIdsHash(idsHash) : [],
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ponto_audios")
        .select("id, ponto_id, interpreter_name, created_at")
        .in("ponto_id", ids)
        .eq("is_active", true)
        .eq("upload_status", "uploaded")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = (
        Array.isArray(data) ? data : []
      ) as Partial<LatestPontoAudioMetaRow>[];

      const map: LatestPontoAudioMetaByPontoIdMap = {};
      for (const r of rows) {
        const pontoId = typeof r.ponto_id === "string" ? r.ponto_id : "";
        const id = typeof r.id === "string" ? r.id : "";
        if (!pontoId || !id) continue;
        if (map[pontoId]) continue; // first one is newest due to ordering

        map[pontoId] = {
          pontoAudioId: id,
          interpreterName:
            typeof r.interpreter_name === "string" ? r.interpreter_name : null,
          createdAt: typeof r.created_at === "string" ? r.created_at : null,
        };
      }

      return map;
    },
    placeholderData: (prev) => prev,
  });
}

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
        storage_path:
          typeof r.storage_path === "string" ? r.storage_path : null,
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
      pontoAudioId?: string | null;
      sizeBytes: number;
      durationMs: number;
      contentEtag?: string | null;
      sha256?: string | null;
    }) => {
      return completePontoAudioUpload({
        uploadToken: params.uploadToken,
        pontoAudioId: params.pontoAudioId ?? null,
        sizeBytes: params.sizeBytes,
        durationMs: params.durationMs,
        contentEtag: params.contentEtag ?? null,
        sha256: params.sha256 ?? null,
      });
    },
  });
}
