import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "./queryKeys";

export type PendingPontoSubmission = {
  id: string;
  kind?: string | null;
  status?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  ponto_id?: string | null;
  ponto_title?: string | null;
  ponto_audio_id?: string | null;

  audio_bucket_id?: string | null;
  audio_object_path?: string | null;

  payload?: unknown;

  ponto_is_public_domain?: boolean | null;
  author_name?: string | null;
  author_consent_granted?: boolean | null;
  terms_version?: string | null;

  has_audio?: boolean | null;
  interpreter_name?: string | null;
  interpreter_consent_granted?: boolean | null;
};

function coerceTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }

  if (typeof value === "string") {
    return value
      .split(/[,|]/g)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  return [];
}

export function getSubmissionPayloadObject(
  payload: unknown,
): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  if (Array.isArray(payload)) return {};
  return payload as Record<string, unknown>;
}

export function extractSubmissionContentFromPayload(payload: unknown): {
  title: string;
  lyrics: string;
  tags: string[];
  cover_url: string | null;
  submitter_email: string | null;
  issue_details: string | null;
} {
  const obj = getSubmissionPayloadObject(payload);

  const title = typeof obj.title === "string" ? obj.title : "";
  const lyrics = typeof obj.lyrics === "string" ? obj.lyrics : "";
  const tags = coerceTags(obj.tags);

  const cover_url = typeof obj.cover_url === "string" ? obj.cover_url : null;
  const submitter_email =
    typeof obj.submitter_email === "string" ? obj.submitter_email : null;
  const issue_details =
    typeof obj.issue_details === "string" ? obj.issue_details : null;

  return { title, lyrics, tags, cover_url, submitter_email, issue_details };
}

function toErrorMessage(error: unknown, fallback: string) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as any).message)
      : "";
  return message.trim() ? message.trim() : fallback;
}

export async function fetchPendingPontoSubmissions(): Promise<
  PendingPontoSubmission[]
> {
  const res = await supabase
    .from("pontos_submissions")
    .select(
      "id, kind, status, created_at, created_by, reviewed_at, reviewed_by, ponto_id, pontos:ponto_id (title), ponto_audio_id, audio_bucket_id, audio_object_path, payload, ponto_is_public_domain, author_name, author_consent_granted, terms_version, has_audio, interpreter_name, interpreter_consent_granted",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (res.error) {
    throw new Error(toErrorMessage(res.error, "Erro ao carregar envios."));
  }

  return (res.data ?? []).map((row: any) => ({
    id: String(row.id),
    kind: typeof row.kind === "string" ? row.kind : null,
    status: typeof row.status === "string" ? row.status : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    created_by: typeof row.created_by === "string" ? row.created_by : null,
    reviewed_at: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
    reviewed_by: typeof row.reviewed_by === "string" ? row.reviewed_by : null,
    ponto_id: typeof row.ponto_id === "string" ? row.ponto_id : null,
    ponto_title:
      row?.pontos && typeof row.pontos === "object" && row.pontos
        ? typeof (row.pontos as any).title === "string"
          ? (row.pontos as any).title
          : null
        : null,
    ponto_audio_id:
      typeof row.ponto_audio_id === "string" ? row.ponto_audio_id : null,
    audio_bucket_id:
      typeof row.audio_bucket_id === "string" ? row.audio_bucket_id : null,
    audio_object_path:
      typeof row.audio_object_path === "string" ? row.audio_object_path : null,
    payload: row.payload ?? null,
    ponto_is_public_domain:
      typeof row.ponto_is_public_domain === "boolean"
        ? row.ponto_is_public_domain
        : null,
    author_name: typeof row.author_name === "string" ? row.author_name : null,
    author_consent_granted:
      typeof row.author_consent_granted === "boolean"
        ? row.author_consent_granted
        : null,
    terms_version:
      typeof row.terms_version === "string" ? row.terms_version : null,
    has_audio: typeof row.has_audio === "boolean" ? row.has_audio : null,
    interpreter_name:
      typeof row.interpreter_name === "string" ? row.interpreter_name : null,
    interpreter_consent_granted:
      typeof row.interpreter_consent_granted === "boolean"
        ? row.interpreter_consent_granted
        : null,
  }));
}

export async function fetchPontoSubmissionById(
  submissionId: string,
): Promise<PendingPontoSubmission | null> {
  if (!submissionId) return null;

  const res = await supabase
    .from("pontos_submissions")
    .select(
      "id, kind, status, created_at, created_by, reviewed_at, reviewed_by, ponto_id, pontos:ponto_id (title), ponto_audio_id, audio_bucket_id, audio_object_path, payload, ponto_is_public_domain, author_name, author_consent_granted, terms_version, has_audio, interpreter_name, interpreter_consent_granted",
    )
    .eq("id", submissionId)
    .maybeSingle();

  if (res.error) {
    throw new Error(toErrorMessage(res.error, "Erro ao carregar envio."));
  }

  if (!res.data) return null;

  const row: any = res.data;
  return {
    id: String(row.id),
    kind: typeof row.kind === "string" ? row.kind : null,
    author_name: typeof row.author_name === "string" ? row.author_name : null,
    interpreter_name:
      typeof row.interpreter_name === "string" ? row.interpreter_name : null,
    status: typeof row.status === "string" ? row.status : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    created_by: typeof row.created_by === "string" ? row.created_by : null,
    reviewed_at: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
    reviewed_by: typeof row.reviewed_by === "string" ? row.reviewed_by : null,
    ponto_id: typeof row.ponto_id === "string" ? row.ponto_id : null,
    ponto_title:
      row?.pontos && typeof row.pontos === "object" && row.pontos
        ? typeof (row.pontos as any).title === "string"
          ? (row.pontos as any).title
          : null
        : null,
    ponto_audio_id:
      typeof row.ponto_audio_id === "string" ? row.ponto_audio_id : null,
    audio_bucket_id:
      typeof row.audio_bucket_id === "string" ? row.audio_bucket_id : null,
    audio_object_path:
      typeof row.audio_object_path === "string" ? row.audio_object_path : null,
    payload: row.payload ?? null,
    ponto_is_public_domain:
      typeof row.ponto_is_public_domain === "boolean"
        ? row.ponto_is_public_domain
        : null,
    author_consent_granted:
      typeof row.author_consent_granted === "boolean"
        ? row.author_consent_granted
        : null,
    terms_version:
      typeof row.terms_version === "string" ? row.terms_version : null,
    has_audio: typeof row.has_audio === "boolean" ? row.has_audio : null,
    interpreter_consent_granted:
      typeof row.interpreter_consent_granted === "boolean"
        ? row.interpreter_consent_granted
        : null,
  };
}

export function usePendingPontoSubmissions(params: { enabled: boolean }) {
  const { enabled } = params;

  return useQuery({
    queryKey: queryKeys.pontosSubmissions.pending(),
    enabled,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    queryFn: fetchPendingPontoSubmissions,
    placeholderData: (prev) => prev,
  });
}

export function usePontoSubmissionById(params: {
  submissionId: string | null;
  enabled: boolean;
}) {
  const { submissionId, enabled } = params;

  return useQuery({
    queryKey: submissionId
      ? queryKeys.pontosSubmissions.byId(submissionId)
      : [],
    enabled: enabled && !!submissionId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!submissionId) return null;
      return fetchPontoSubmissionById(submissionId);
    },
    placeholderData: (prev) => prev,
  });
}

export type ApprovedAudioSubmissionResult = {
  approvedPontoAudioId: string | null;
  approvedInterpreterName: string | null;
  hasPendingAudioSubmission: boolean;
};

export async function fetchApprovedPontoAudioSubmission(
  pontoId: string,
): Promise<ApprovedAudioSubmissionResult> {
  if (!pontoId) {
    return {
      approvedPontoAudioId: null,
      approvedInterpreterName: null,
      hasPendingAudioSubmission: false,
    };
  }

  const res = await supabase
    .from("pontos_submissions")
    .select(
      "id, status, ponto_audio_id, interpreter_name, reviewed_at, created_at",
    )
    .eq("ponto_id", pontoId)
    .eq("kind", "audio_upload")
    .in("status", ["approved", "pending"])
    .order("reviewed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (res.error) {
    throw new Error(
      toErrorMessage(res.error, "Erro ao carregar submissões de áudio."),
    );
  }

  const rows = (res.data ?? []) as any[];

  let approvedPontoAudioId: string | null = null;
  let approvedInterpreterName: string | null = null;
  let hasPendingAudioSubmission = false;

  for (const row of rows) {
    const status = typeof row.status === "string" ? row.status : "";
    const pontoAudioId =
      typeof row.ponto_audio_id === "string" ? row.ponto_audio_id : "";
    const interpreterName =
      typeof row.interpreter_name === "string" ? row.interpreter_name : "";

    if (status === "approved" && pontoAudioId) {
      approvedPontoAudioId = pontoAudioId;
      approvedInterpreterName = interpreterName ? interpreterName.trim() : null;
      break;
    }

    if (status === "pending") {
      hasPendingAudioSubmission = true;
    }
  }

  return {
    approvedPontoAudioId,
    approvedInterpreterName,
    hasPendingAudioSubmission,
  };
}

export function useApprovedPontoAudioSubmission(
  pontoId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const enabled = (options?.enabled ?? true) && !!pontoId;

  return useQuery({
    queryKey: pontoId
      ? queryKeys.pontosSubmissions.approvedAudioByPontoId(pontoId)
      : [],
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: () => {
      if (!pontoId) {
        return {
          approvedPontoAudioId: null,
          approvedInterpreterName: null,
          hasPendingAudioSubmission: false,
        };
      }
      return fetchApprovedPontoAudioSubmission(pontoId);
    },
    placeholderData: (prev) => prev,
  });
}
