import { supabase } from "@/lib/supabase";

type RpcPayload = Record<string, unknown>;

export async function callRpcWithParamFallback<T>(
  functionName: string,
  payloadWithPrefix: RpcPayload,
): Promise<T> {
  let { data, error } = await supabase.rpc(functionName, payloadWithPrefix);

  const code =
    error && typeof error === "object" && "code" in (error as any)
      ? String((error as any).code)
      : "";

  if (error && code === "PGRST202") {
    const fallbackPayload: RpcPayload = {};
    for (const [key, value] of Object.entries(payloadWithPrefix)) {
      fallbackPayload[key.startsWith("p_") ? key.slice(2) : key] = value;
    }

    const retry = await supabase.rpc(functionName, fallbackPayload);
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    const message =
      typeof error.message === "string" && error.message.trim()
        ? error.message.trim()
        : "Erro ao executar revisão.";
    throw new Error(message);
  }

  return data as T;
}

export type ReviewPontoSubmissionInput = {
  p_submission_id: string;
  p_decision: "approved" | "rejected";
  p_review_note?: string | null;
  p_title?: string | null;
  p_lyrics?: string | null;
  p_tags?: string[] | null;
  p_artist?: string | null;
  p_author_name?: string | null;
  p_interpreter_name?: string | null;
  p_has_author_consent?: boolean | null;
  p_author_contact?: string | null;
};

export function reviewPontoSubmission(input: ReviewPontoSubmissionInput) {
  return callRpcWithParamFallback<unknown>("review_ponto_submission", input);
}

export function approveCorrection(input: {
  p_submission_id: string;
  p_review_note?: string | null;
}) {
  return callRpcWithParamFallback<unknown>(
    "approve_ponto_correction_submission",
    input,
  );
}

export function approveAudioUpload(input: { p_submission_id: string }) {
  return callRpcWithParamFallback<unknown>(
    "approve_audio_upload_submission",
    input,
  );
}

export function rejectAudioUpload(input: {
  p_submission_id: string;
  p_review_note: string;
}) {
  return callRpcWithParamFallback<unknown>(
    "reject_audio_upload_submission",
    input,
  );
}

export async function updatePontoAudioDuration(params: {
  pontoAudioId: string;
  durationMs: number;
}) {
  const pontoAudioId = String(params.pontoAudioId ?? "").trim();
  const durationMs =
    typeof params.durationMs === "number" && Number.isFinite(params.durationMs)
      ? Math.round(params.durationMs)
      : 0;

  if (!pontoAudioId || durationMs <= 0) {
    throw new Error(
      "Não foi possível aprovar porque a duração do áudio não foi registrada.",
    );
  }

  const res = await supabase
    .from("ponto_audios")
    .update({ duration_ms: durationMs })
    .eq("id", pontoAudioId);

  if (res.error) {
    const message =
      typeof res.error.message === "string" && res.error.message.trim()
        ? res.error.message.trim()
        : "Não foi possível aprovar porque a duração do áudio não foi registrada.";
    throw new Error(message);
  }
}

export function mapSubmissionCurationError(error: unknown): string {
  const raw =
    error && typeof error === "object" && "message" in (error as any)
      ? String((error as any).message ?? "")
      : "";

  const code =
    error && typeof error === "object" && "code" in (error as any)
      ? String((error as any).code ?? "")
      : "";

  const lower = raw.toLowerCase();

  if (lower.includes("not_curator")) {
    return "Apenas pessoas guardiãs do acervo podem revisar envios.";
  }

  if (lower.includes("submission_not_found")) {
    return "Envio não encontrado.";
  }

  if (
    lower.includes("submission_not_pending") ||
    lower.includes("invalid_status")
  ) {
    return "Já foi revisado.";
  }

  if (
    lower.includes("missing_review_note") ||
    lower.includes("invalid_review_note") ||
    lower.includes('null value in column "review_note"')
  ) {
    return "Informe um motivo (nota de revisão) para rejeitar.";
  }

  if (lower.includes("missing_title")) {
    return "Informe um título antes de aprovar.";
  }

  if (lower.includes("missing_lyrics")) {
    return "Informe a letra antes de aprovar.";
  }

  if (lower.includes("invalid_decision")) {
    return "Ação inválida.";
  }

  if (lower.includes("missing_author_consent")) {
    return "Consentimento do autor é obrigatório quando autor e intérprete são diferentes.";
  }

  if (lower.includes("invalid_")) {
    return "Dados inválidos para revisão. Revise os campos e tente novamente.";
  }

  if (code === "PGRST202") {
    return "Servidor desatualizado para este fluxo. Atualize e tente novamente.";
  }

  if (
    lower.includes("invalid_activation") ||
    lower.includes("cannot activate ponto_audio")
  ) {
    return "Não foi possível ativar o áudio deste envio. Tente novamente.";
  }

  if (lower.includes("invalid_audio_state")) {
    return "Não é possível aprovar este áudio ainda (upload/processamento pendente).";
  }

  if (
    lower.includes("trg_enforce_audio_duration_on_approval") ||
    (lower.includes("duration_ms") && lower.includes("ponto_audios"))
  ) {
    return "Não foi possível aprovar porque a duração do áudio não foi registrada.";
  }

  if (lower.includes("pontos_submissions_correction_approved_matches_target")) {
    return "Esta correção precisa ser aprovada pelo fluxo de correção. Atualize e tente novamente.";
  }

  if (lower.includes("not_allowed")) {
    return "Apenas pessoas guardiãs do acervo podem revisar envios.";
  }

  return "Não foi possível concluir agora. Tente novamente.";
}
