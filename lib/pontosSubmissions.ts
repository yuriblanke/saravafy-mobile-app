import { supabase } from "@/lib/supabase";

export type CreatePontoSubmissionInput = {
  title: string;
  lyrics: string;
  tags?: string[];
  author_name?: string | null;
  interpreter_name?: string | null;
  has_author_consent?: boolean | null;
};

export type SubmitPontoCorrectionInput = {
  target_ponto_id: string;
  title: string;
  lyrics: string;
  tags?: string[];
  artist?: string | null;
  issue_details?: string | null;
};

export type PontoSubmissionRow = {
  id: string;
  created_at?: string;
  created_by?: string;
  title: string;
  lyrics: string;
  tags: string[];
  status?: string;
};

function toNullIfEmpty(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  return v ? v : null;
}

function normalizeTags(tags: unknown): string[] {
  const arr = Array.isArray(tags) ? tags : [];
  const parts = arr
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];

  for (const tag of parts) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }

  return out;
}

export function parseTagsInput(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createPontoSubmission(input: CreatePontoSubmissionInput) {
  const payload = {
    title: typeof input.title === "string" ? input.title.trim() : "",
    lyrics: typeof input.lyrics === "string" ? input.lyrics.trim() : "",
    tags: normalizeTags(input.tags ?? []),
    author_name: toNullIfEmpty(input.author_name),
    interpreter_name: toNullIfEmpty(input.interpreter_name),
    has_author_consent:
      typeof input.has_author_consent === "boolean" ? input.has_author_consent : null,
  };

  const { data, error } = await supabase
    .from("pontos_submissions")
    .insert(payload)
    .select("id, created_at, created_by, title, lyrics, tags, status")
    .single();

  if (error) throw error;

  return data as PontoSubmissionRow;
}

export async function submitPontoCorrection(input: SubmitPontoCorrectionInput) {
  const targetId = typeof input.target_ponto_id === "string" ? input.target_ponto_id.trim() : "";
  if (!targetId) throw new Error("Ponto inválido para correção.");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;

  const submitterEmail =
    typeof user?.email === "string" && user.email.trim() ? user.email.trim() : null;

  const payload: any = {
    kind: "correction",
    target_ponto_id: targetId,
    submitter_email: submitterEmail,
    issue_details: toNullIfEmpty(input.issue_details),
    title: typeof input.title === "string" ? input.title.trim() : "",
    lyrics: typeof input.lyrics === "string" ? input.lyrics.trim() : "",
    tags: normalizeTags(input.tags ?? []),
    artist: toNullIfEmpty(input.artist),
  };

  const { data, error } = await supabase
    .from("pontos_submissions")
    .insert(payload)
    .select("id, created_at, created_by, title, lyrics, tags, status")
    .single();

  if (error) throw error;

  return data as PontoSubmissionRow;
}
