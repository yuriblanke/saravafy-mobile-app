import { supabase } from "@/lib/supabase";
import * as FileSystemLegacy from "expo-file-system/legacy";

type UploadFlowStage = "init" | "upload" | "complete";

type InitUploadPayload = {
  ponto_id: string;
  interpreter_name: string;
  mime_type: string;
  interpreter_consent: true;
};

type InitUploadResponse = {
  ponto_audio_id?: string;
  upload_token?: string;
  submission_id?: string | null;
  signed_upload?: {
    url?: string;
    signedUrl?: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};

type CompleteUploadPayload = {
  submission_id: string;
  upload_token: string;
  size_bytes: number;
  duration_ms: number | null;
  content_etag: string | null;
  sha256: string | null;
};

type CompleteUploadResponse = {
  ok?: boolean;
  [k: string]: unknown;
};

export type PontoExistingAudioUploadPhase =
  | "idle"
  | "initLoading"
  | "uploading"
  | "completing"
  | "success"
  | "error";

export type UploadAudioForExistingPontoInput = {
  pontoId: string;
  interpreterName: string;
  interpreterConsent: boolean;
  fileUri: string;
  mimeType: string;
  sizeBytes: number;
  durationMs?: number | null;
  sha256?: string | null;
  onPhaseChange?: (phase: PontoExistingAudioUploadPhase) => void;
};

export type UploadAudioForExistingPontoResult = {
  pontoAudioId: string;
  submissionId: string;
  uploadToken: string;
  contentEtag: string | null;
};

class UploadFlowError extends Error {
  stage: UploadFlowStage;
  status: number | null;
  requestId: string | null;
  code: string | null;

  constructor(params: {
    message: string;
    stage: UploadFlowStage;
    status?: number | null;
    requestId?: string | null;
    code?: string | null;
  }) {
    super(params.message);
    this.name = "UploadFlowError";
    this.stage = params.stage;
    this.status = typeof params.status === "number" ? params.status : null;
    this.requestId =
      typeof params.requestId === "string" && params.requestId.trim()
        ? params.requestId.trim()
        : null;
    this.code =
      typeof params.code === "string" && params.code.trim()
        ? params.code.trim()
        : null;
  }
}

class AuthRequiredError extends Error {
  code = "AUTH_REQUIRED" as const;

  constructor(message = "Você precisa estar logada para enviar áudio.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseJson(text: string): any | null {
  try {
    return text ? (JSON.parse(text) as any) : null;
  } catch {
    return null;
  }
}

function extractRequestIdFromPayload(payload: any): string | null {
  const candidates = [
    payload?.requestId,
    payload?.request_id,
    payload?.error?.requestId,
    payload?.error?.request_id,
    payload?.details?.requestId,
    payload?.details?.request_id,
  ];
  for (const candidate of candidates) {
    const value = normalizeText(candidate);
    if (value) return value;
  }
  return null;
}

function extractErrorMessage(payload: any, fallback: string): string {
  const direct = normalizeText(payload?.message);
  if (direct) return direct;

  const err = payload?.error;
  if (typeof err === "string" && err.trim()) return err.trim();
  if (err && typeof err === "object") {
    const msg = normalizeText((err as any)?.message);
    if (msg) return msg;
  }

  const details = payload?.details;
  if (typeof details === "string" && details.trim()) return details.trim();
  if (details && typeof details === "object") {
    const msg = normalizeText((details as any)?.message);
    if (msg) return msg;
  }

  return fallback;
}

function appendRequestId(message: string, requestId: string | null): string {
  if (!requestId) return message;
  return `${message} (requestId: ${requestId})`;
}

function getBaseEdgeUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!baseUrl || !baseUrl.trim()) {
    throw new Error("Configuração do Supabase ausente.");
  }
  return `${baseUrl.replace(/\/$/, "")}/functions/v1`;
}

async function callEdgeJson<T>(params: {
  path: string;
  accessToken: string;
  body: unknown;
  stage: UploadFlowStage;
}): Promise<T> {
  const baseEdgeUrl = getBaseEdgeUrl();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${params.accessToken}`,
  };

  if (typeof anonKey === "string" && anonKey.trim()) {
    headers.apikey = anonKey;
  }

  const response = await fetch(`${baseEdgeUrl}/${params.path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(params.body ?? {}),
  });

  const bodyText = await response.text();
  const bodyJson = parseJson(bodyText);

  const requestIdFromHeader =
    response.headers.get("request-id") ??
    response.headers.get("x-request-id") ??
    response.headers.get("sb-request-id") ??
    response.headers.get("x-sb-request-id") ??
    null;

  const requestId =
    normalizeText(requestIdFromHeader) ||
    extractRequestIdFromPayload(bodyJson) ||
    null;

  if (!response.ok) {
    const fallbackMessage = `Falha ao processar ${params.stage} do upload (HTTP ${response.status}).`;
    const baseMessage = extractErrorMessage(bodyJson, fallbackMessage);
    const message = appendRequestId(baseMessage, requestId);

    throw new UploadFlowError({
      message,
      stage: params.stage,
      status: response.status,
      requestId,
    });
  }

  return (bodyJson ?? {}) as T;
}

function getSignedUploadUrl(signedUpload: unknown): string {
  if (!signedUpload || typeof signedUpload !== "object") return "";
  const url = normalizeText((signedUpload as any).url);
  if (url) return url;
  const signedUrl = normalizeText((signedUpload as any).signedUrl);
  if (signedUrl) return signedUrl;
  return "";
}

function extractHeaderCaseInsensitive(
  headers: Record<string, string> | undefined,
  key: string,
): string | null {
  if (!headers) return null;
  const target = key.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === target) {
      const value = normalizeText(v);
      if (value) return value;
    }
  }
  return null;
}

async function resolvePendingSubmissionId(params: {
  pontoAudioId: string;
  createdBy: string;
}): Promise<string | null> {
  const query = await supabase
    .from("pontos_submissions")
    .select("id, created_at")
    .eq("ponto_audio_id", params.pontoAudioId)
    .eq("created_by", params.createdBy)
    .eq("kind", "audio_upload")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (query.error) {
    throw new Error(
      `Não foi possível resolver a submissão pendente: ${query.error.message}`,
    );
  }

  const id = normalizeText((query.data as any)?.id);
  return id || null;
}

export function isAuthRequiredForUpload(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof AuthRequiredError) return true;

  const anyError = error as any;
  if (typeof anyError?.code === "string" && anyError.code === "AUTH_REQUIRED") {
    return true;
  }
  if (typeof anyError?.status === "number" && anyError.status === 401) {
    return true;
  }

  const message = normalizeText(anyError?.message).toLowerCase();
  return (
    message.includes("não autoriz") ||
    message.includes("nao autoriz") ||
    message.includes("precisa estar logad")
  );
}

export async function uploadAudioForExistingPonto(
  input: UploadAudioForExistingPontoInput,
): Promise<UploadAudioForExistingPontoResult> {
  try {
    const pontoId = normalizeText(input.pontoId);
    const interpreterName = normalizeText(input.interpreterName);
    const fileUri = normalizeText(input.fileUri);
    const mimeType = normalizeText(input.mimeType).toLowerCase();

    if (!pontoId) throw new Error("Ponto inválido para upload.");
    if (!interpreterName) throw new Error("Preencha o nome do intérprete.");
    if (input.interpreterConsent !== true) {
      throw new Error("É necessário consentimento para enviar.");
    }
    if (!fileUri) throw new Error("Selecione um arquivo de áudio.");
    if (!mimeType || !mimeType.startsWith("audio/")) {
      throw new Error("O arquivo selecionado não parece ser um áudio válido.");
    }

    const sizeBytes =
      typeof input.sizeBytes === "number" && Number.isFinite(input.sizeBytes)
        ? Math.max(0, Math.trunc(input.sizeBytes))
        : 0;

    if (sizeBytes <= 0) {
      throw new Error("Não foi possível determinar o tamanho do arquivo.");
    }

    const durationMsRaw =
      typeof input.durationMs === "number" && Number.isFinite(input.durationMs)
        ? Math.max(0, Math.trunc(input.durationMs))
        : null;

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const accessToken = normalizeText(sessionData?.session?.access_token);
    const currentUserId = normalizeText(sessionData?.session?.user?.id);
    if (!accessToken || !currentUserId) {
      throw new AuthRequiredError();
    }

    input.onPhaseChange?.("initLoading");

    console.log("[ponto-audio-upload][init][start]", {
      ponto_id: pontoId,
      mime_type: mimeType,
    });

    const initPayload: InitUploadPayload = {
      ponto_id: pontoId,
      interpreter_name: interpreterName,
      mime_type: mimeType,
      interpreter_consent: true,
    };

    const initData = await callEdgeJson<InitUploadResponse>({
      path: "ponto-audio-init-upload",
      accessToken,
      body: initPayload,
      stage: "init",
    });

    const pontoAudioId = normalizeText(initData?.ponto_audio_id);
    const uploadToken = normalizeText(initData?.upload_token);
    const signedUploadUrl = getSignedUploadUrl(initData?.signed_upload);
    const initSubmissionId = normalizeText(initData?.submission_id) || null;

    if (!pontoAudioId || !uploadToken || !signedUploadUrl) {
      throw new Error("Resposta inválida ao iniciar upload de áudio.");
    }

    console.log("[ponto-audio-upload][init][ok]", {
      ponto_audio_id: pontoAudioId,
      has_submission_id: Boolean(initSubmissionId),
    });

    input.onPhaseChange?.("uploading");

    console.log("[ponto-audio-upload][upload][start]", {
      ponto_audio_id: pontoAudioId,
      mime_type: mimeType,
      size_bytes: sizeBytes,
    });

    const uploadRes = await FileSystemLegacy.uploadAsync(
      signedUploadUrl,
      fileUri,
      {
        httpMethod: "PUT",
        uploadType: FileSystemLegacy.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          "Content-Type": mimeType,
        },
      },
    );

    if (uploadRes.status < 200 || uploadRes.status >= 300) {
      const message = `Falha no upload do arquivo (HTTP ${uploadRes.status}).`;
      throw new UploadFlowError({
        message,
        stage: "upload",
        status: uploadRes.status,
        requestId: null,
      });
    }

    const contentEtag =
      extractHeaderCaseInsensitive(uploadRes.headers, "etag") ?? null;

    console.log("[ponto-audio-upload][upload][ok]", {
      ponto_audio_id: pontoAudioId,
      status: uploadRes.status,
      has_content_etag: Boolean(contentEtag),
    });

    const submissionId =
      initSubmissionId ||
      (await resolvePendingSubmissionId({
        pontoAudioId,
        createdBy: currentUserId,
      }));

    if (!submissionId) {
      throw new Error(
        "Não foi possível identificar a submissão pendente do upload. Tente novamente.",
      );
    }

    input.onPhaseChange?.("completing");

    console.log("[ponto-audio-upload][complete][start]", {
      ponto_audio_id: pontoAudioId,
      submission_id: submissionId,
    });

    const completePayload: CompleteUploadPayload = {
      submission_id: submissionId,
      upload_token: uploadToken,
      size_bytes: sizeBytes,
      duration_ms: durationMsRaw,
      content_etag: contentEtag,
      sha256: normalizeText(input.sha256) || null,
    };

    const completeData = await callEdgeJson<CompleteUploadResponse>({
      path: "ponto-audio-complete-upload",
      accessToken,
      body: completePayload,
      stage: "complete",
    });

    console.log("[ponto-audio-upload][complete][ok]", {
      ponto_audio_id: pontoAudioId,
      submission_id: submissionId,
      ok: completeData?.ok ?? null,
    });

    input.onPhaseChange?.("success");

    return {
      pontoAudioId,
      submissionId,
      uploadToken,
      contentEtag,
    };
  } catch (error) {
    const err = error as any;
    const stage =
      err instanceof UploadFlowError
        ? err.stage
        : err instanceof AuthRequiredError
          ? "init"
          : "unknown";
    const requestId =
      err instanceof UploadFlowError
        ? err.requestId
        : normalizeText(err?.requestId) || null;
    const status =
      err instanceof UploadFlowError
        ? err.status
        : typeof err?.status === "number"
          ? err.status
          : null;

    console.log("[ponto-audio-upload][failed]", {
      stage,
      status,
      requestId,
      message:
        err instanceof Error && err.message.trim()
          ? err.message.trim()
          : "Falha no envio de áudio.",
    });

    input.onPhaseChange?.("error");
    throw error;
  }
}
