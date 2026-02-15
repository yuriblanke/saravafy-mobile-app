import { supabase } from "@/lib/supabase";
import { metroError, metroLog } from "@/src/utils/metroLog";

export type CreatePontoSubmissionInput = {
  title: string;
  lyrics: string;
  tags?: string[];
  author_name?: string | null;
  interpreter_name?: string | null;
  // Maps to pontos_submissions.author_consent_granted
  author_consent_granted?: boolean | null;
  // Maps to pontos_submissions.ponto_is_public_domain
  ponto_is_public_domain?: boolean | null;
  // Stored in payload only; does not affect DB constraints.
  has_audio_intent?: boolean | null;
};

export type SubmitPontoCorrectionInput = {
  target_ponto_id: string;
  title: string;
  lyrics: string;
  tags?: string[];
  author_name?: string | null;
  issue_details?: string | null;
};

export type PontoSubmissionRow = {
  id: string;
  created_at?: string;
  created_by?: string;
  title: string;
  author_name?: string | null;
  interpreter_name?: string | null;
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

function extractSubmissionContent(payload: unknown): {
  title: string;
  lyrics: string;
  tags: string[];
} {
  const obj =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as any)
      : null;

  const title = typeof obj?.title === "string" ? obj.title.trim() : "";
  const lyrics = typeof obj?.lyrics === "string" ? obj.lyrics.trim() : "";
  const tags = normalizeTags(obj?.tags);

  return { title, lyrics, tags };
}

export function parseTagsInput(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createPontoSubmission(input: CreatePontoSubmissionInput) {
  metroLog("PontosSubmissions", "createPontoSubmission start", {
    titleLen: typeof input.title === "string" ? input.title.trim().length : 0,
    lyricsLen:
      typeof input.lyrics === "string" ? input.lyrics.trim().length : 0,
    tagsCount: Array.isArray(input.tags) ? input.tags.length : 0,
    hasAuthorName: Boolean(toNullIfEmpty(input.author_name)),
    hasInterpreterName: Boolean(toNullIfEmpty(input.interpreter_name)),
    ponto_is_public_domain:
      typeof input.ponto_is_public_domain === "boolean"
        ? input.ponto_is_public_domain
        : null,
    author_consent_granted:
      typeof input.author_consent_granted === "boolean"
        ? input.author_consent_granted
        : null,
    has_audio_intent:
      typeof input.has_audio_intent === "boolean"
        ? input.has_audio_intent
        : null,
  });

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    metroError("PontosSubmissions", "getSession failed", sessionError);
    throw sessionError;
  }
  if (!sessionData?.session?.access_token) {
    metroLog("PontosSubmissions", "missing access token");
    throw new Error("Você precisa estar logada para enviar para revisão.");
  }

  const payload = {
    title: typeof input.title === "string" ? input.title.trim() : "",
    lyrics: typeof input.lyrics === "string" ? input.lyrics.trim() : "",
    tags: normalizeTags(input.tags ?? []),
    has_audio_intent:
      typeof input.has_audio_intent === "boolean"
        ? input.has_audio_intent
        : null,
  };

  const rowToInsert = {
    kind: "new",
    payload,
    ponto_is_public_domain:
      typeof input.ponto_is_public_domain === "boolean"
        ? input.ponto_is_public_domain
        : true,
    author_name: toNullIfEmpty(input.author_name),
    author_consent_granted:
      typeof input.author_consent_granted === "boolean"
        ? input.author_consent_granted
        : false,
    interpreter_name: toNullIfEmpty(input.interpreter_name),
    // For "new" submissions we don't upload audio in this same row.
    // Keep DB audio fields in their safe defaults.
    has_audio: false,
    interpreter_consent_granted: false,
    terms_version: null,
  };

  const { data, error } = await supabase
    .from("pontos_submissions")
    .insert(rowToInsert)
    .select(
      "id, created_at, created_by, kind, status, ponto_id, payload, ponto_is_public_domain, author_name, author_consent_granted, has_audio, interpreter_name, interpreter_consent_granted, terms_version",
    )
    .single();

  if (error) {
    metroError("PontosSubmissions", "insert pontos_submissions failed", error, {
      kind: rowToInsert.kind,
      ponto_is_public_domain: rowToInsert.ponto_is_public_domain,
      author_consent_granted: rowToInsert.author_consent_granted,
      has_audio_intent: payload.has_audio_intent,
      tagsCount: payload.tags.length,
    });
    throw error;
  }

  metroLog("PontosSubmissions", "createPontoSubmission ok", {
    id: (data as any)?.id,
    status: (data as any)?.status ?? null,
    ponto_id: (data as any)?.ponto_id ?? null,
  });

  const row: any = data ?? {};
  const content = extractSubmissionContent(row.payload);

  return {
    id: String(row.id ?? ""),
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    created_by: typeof row.created_by === "string" ? row.created_by : undefined,
    title: content.title,
    lyrics: content.lyrics,
    tags: content.tags,
    author_name: typeof row.author_name === "string" ? row.author_name : null,
    interpreter_name:
      typeof row.interpreter_name === "string" ? row.interpreter_name : null,
    status: typeof row.status === "string" ? row.status : undefined,
  } satisfies PontoSubmissionRow;
}

export async function submitPontoCorrection(input: SubmitPontoCorrectionInput) {
  const targetId =
    typeof input.target_ponto_id === "string"
      ? input.target_ponto_id.trim()
      : "";
  if (!targetId) throw new Error("Ponto inválido para correção.");

  metroLog("PontosSubmissions", "submitPontoCorrection start", {
    target_ponto_id: targetId,
    titleLen: typeof input.title === "string" ? input.title.trim().length : 0,
    lyricsLen:
      typeof input.lyrics === "string" ? input.lyrics.trim().length : 0,
    tagsCount: Array.isArray(input.tags) ? input.tags.length : 0,
    hasAuthorName: Boolean(toNullIfEmpty(input.author_name)),
    hasIssueDetails: Boolean(toNullIfEmpty(input.issue_details)),
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;

  const submitterEmail =
    typeof user?.email === "string" && user.email.trim()
      ? user.email.trim()
      : null;

  const payload = {
    title: typeof input.title === "string" ? input.title.trim() : "",
    lyrics: typeof input.lyrics === "string" ? input.lyrics.trim() : "",
    tags: normalizeTags(input.tags ?? []),
    submitter_email: submitterEmail,
    issue_details: toNullIfEmpty(input.issue_details),
  };

  const rowToInsert = {
    kind: "correction",
    ponto_id: targetId,
    payload,
    author_name: toNullIfEmpty(input.author_name),
    author_consent_granted: false,
    has_audio: false,
    interpreter_name: null,
    interpreter_consent_granted: false,
    terms_version: null,
  };

  const { data, error } = await supabase
    .from("pontos_submissions")
    .insert(rowToInsert)
    .select("id, created_at, created_by, kind, status, ponto_id, payload")
    .single();

  if (error) {
    metroError("PontosSubmissions", "insert correction failed", error, {
      target_ponto_id: targetId,
    });
    throw error;
  }

  metroLog("PontosSubmissions", "submitPontoCorrection ok", {
    id: (data as any)?.id,
    status: (data as any)?.status ?? null,
  });

  const row: any = data ?? {};
  const content = extractSubmissionContent(row.payload);

  return {
    id: String(row.id ?? ""),
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    created_by: typeof row.created_by === "string" ? row.created_by : undefined,
    title: content.title,
    lyrics: content.lyrics,
    tags: content.tags,
    status: typeof row.status === "string" ? row.status : undefined,
  } satisfies PontoSubmissionRow;
}
