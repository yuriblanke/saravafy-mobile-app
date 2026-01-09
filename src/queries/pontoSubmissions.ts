import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "./queryKeys";

export type PendingPontoSubmission = {
  id: string;
  kind?: string | null;
  title: string;
  lyrics: string;
  tags: string[];
  artist?: string | null;
  author_name?: string | null;
  interpreter_name?: string | null;
  submitter_email?: string | null;
  issue_details?: string | null;
  target_ponto_id?: string | null;
  created_at?: string | null;
  created_by?: string | null;
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
      "id, kind, title, artist, author_name, interpreter_name, lyrics, tags, submitter_email, issue_details, target_ponto_id, status, created_at, created_by"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (res.error) {
    throw new Error(toErrorMessage(res.error, "Erro ao carregar envios."));
  }

  return (res.data ?? []).map((row: any) => ({
    id: String(row.id),
    kind: typeof row.kind === "string" ? row.kind : null,
    title: typeof row.title === "string" ? row.title : "",
    lyrics: typeof row.lyrics === "string" ? row.lyrics : "",
    tags: coerceTags(row.tags),
    artist: typeof row.artist === "string" ? row.artist : null,
    author_name: typeof row.author_name === "string" ? row.author_name : null,
    interpreter_name:
      typeof row.interpreter_name === "string" ? row.interpreter_name : null,
    submitter_email:
      typeof row.submitter_email === "string" ? row.submitter_email : null,
    issue_details:
      typeof row.issue_details === "string" ? row.issue_details : null,
    target_ponto_id:
      typeof row.target_ponto_id === "string" ? row.target_ponto_id : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    created_by: typeof row.created_by === "string" ? row.created_by : null,
  }));
}

export async function fetchPontoSubmissionById(
  submissionId: string
): Promise<PendingPontoSubmission | null> {
  if (!submissionId) return null;

  const res = await supabase
    .from("pontos_submissions")
    .select(
      "id, kind, title, artist, author_name, interpreter_name, lyrics, tags, submitter_email, issue_details, target_ponto_id, status, created_at, created_by"
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
    title: typeof row.title === "string" ? row.title : "",
    lyrics: typeof row.lyrics === "string" ? row.lyrics : "",
    tags: coerceTags(row.tags),
    artist: typeof row.artist === "string" ? row.artist : null,
    author_name: typeof row.author_name === "string" ? row.author_name : null,
    interpreter_name:
      typeof row.interpreter_name === "string" ? row.interpreter_name : null,
    submitter_email:
      typeof row.submitter_email === "string" ? row.submitter_email : null,
    issue_details:
      typeof row.issue_details === "string" ? row.issue_details : null,
    target_ponto_id:
      typeof row.target_ponto_id === "string" ? row.target_ponto_id : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    created_by: typeof row.created_by === "string" ? row.created_by : null,
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
    queryKey: submissionId ? queryKeys.pontosSubmissions.byId(submissionId) : [],
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
