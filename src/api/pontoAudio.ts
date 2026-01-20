import { supabase } from "@/lib/supabase";
import * as FileSystemLegacy from "expo-file-system/legacy";

export type InitUploadResponse = {
  ponto_audio_id: string;
  upload_token: string;
  bucket: "ponto-audios";
  path: string;
  expires_in?: number;
  mime_type?: string | null;
  signed_upload: {
    signedUrl?: string;
    path?: string;
    token?: string;
    expires_in?: number;
    mime_type?: string | null;
    [k: string]: unknown;
  };
};

export type CompleteUploadResponse = {
  ok: true;
  ponto_audio_id: string;
  bucket: string;
  path: string;
  upload_status: "uploaded";
};

export type PlaybackResponse = {
  // New contract (preferred)
  signed_url: string;
  resolved_url?: string | null;
  resolved_head_status?: number | null;
  expires_in?: number;
  expires_in_seconds?: number;
  mime_type?: string | null;
  // Back-compat (older contract)
  url?: string;
};

const inFlightCompleteByKey = new Map<
  string,
  Promise<{
    ok: true;
    pontoAudioId: string;
    bucket: string;
    path: string;
    uploadStatus: "uploaded";
  }>
>();

const inFlightPostUploadByPontoAudioId = new Map<
  string,
  Promise<{ ok: true; submissionId: string | null }>
>();

type ReviewPlaybackUrlCacheEntry = {
  url: string;
  fetchedAtMs: number;
  expiresAtMs: number;
};

const REVIEW_PLAYBACK_URL_CACHE = new Map<
  string,
  ReviewPlaybackUrlCacheEntry
>();
const inFlightReviewPlaybackBySubmissionId = new Map<
  string,
  Promise<ReviewPlaybackUrlCacheEntry>
>();

const REVIEW_PLAYBACK_EXPIRY_BUFFER_MS = 5_000;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function summarizeBodyForLog(body: unknown) {
  if (body === null || body === undefined) return null;
  if (typeof body === "string") {
    const trimmed = body.trim();
    return trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed;
  }
  if (typeof body === "object") {
    const o: any = body as any;
    return {
      keys: Array.isArray(body) ? null : Object.keys(o).slice(0, 12),
      message: typeof o?.message === "string" ? o.message : null,
      error:
        typeof o?.error === "string"
          ? o.error
          : o?.error && typeof o.error === "object"
            ? JSON.stringify(o.error).slice(0, 220)
            : null,
      details:
        typeof o?.details === "string"
          ? o.details
          : o?.details && typeof o.details === "object"
            ? JSON.stringify(o.details).slice(0, 220)
            : null,
      code: typeof o?.code === "string" ? o.code : null,
      retryable: typeof o?.retryable === "boolean" ? o.retryable : null,
    };
  }
  return String(body);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in (error as any)) {
    return String((error as any).message);
  }
  return String(error ?? "Erro");
}

function maskHeaderValueForLog(key: string, value: unknown) {
  const k = String(key ?? "").toLowerCase();
  if (k === "authorization") {
    if (typeof value === "string" && value.trim()) return "Bearer <present>";
    return "<absent>";
  }
  if (k === "apikey") {
    if (typeof value === "string" && value.trim()) return "<present>";
    return "<absent>";
  }
  return value;
}

function maskHeadersForLog(headers: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(headers ?? {})) {
    out[k] = maskHeaderValueForLog(k, v);
  }
  return out;
}

function safeJsonStringifyForLog(value: unknown, maxLen = 2000) {
  try {
    const s = JSON.stringify(value);
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  } catch {
    return "<unstringifiable>";
  }
}

function safeSignedUrlSummary(urlOrNull: unknown) {
  if (typeof urlOrNull !== "string" || !urlOrNull.trim()) return null;
  try {
    const u = new URL(urlOrNull);
    return {
      host: u.host,
      pathname: u.pathname,
      hasQuery: Boolean(u.search && u.search.length > 1),
      queryLength: u.search ? u.search.length : 0,
    };
  } catch {
    return {
      host: "<invalid>",
      pathname: "<invalid>",
      hasQuery: null,
      queryLength: null,
    };
  }
}

function serializeErrorForLog(e: unknown) {
  const asAny = e as any;
  let json: string | null = null;
  try {
    if (e && typeof e === "object") {
      json = JSON.stringify(e, Object.getOwnPropertyNames(e));
    }
  } catch {
    json = null;
  }

  return {
    asString: String(e),
    message: typeof asAny?.message === "string" ? asAny.message : null,
    status: typeof asAny?.status === "number" ? asAny.status : null,
    name: typeof asAny?.name === "string" ? asAny.name : null,
    json,
  };
}

export async function getPontoAudioDurationMs(pontoAudioId: string) {
  const id = String(pontoAudioId ?? "").trim();
  if (!id) return null;

  const res = await supabase
    .from("ponto_audios")
    .select("duration_ms")
    .eq("id", id)
    .maybeSingle();

  if (res.error) {
    if (__DEV__) {
      console.log("[PLAYBACK][DURATION_FETCH_ERR]", {
        ponto_audio_id: id,
        message: res.error.message,
      });
    }
    return null;
  }

  const raw = (res.data as any)?.duration_ms;
  const num =
    typeof raw === "number" && Number.isFinite(raw)
      ? raw
      : typeof raw === "string" && raw.trim()
        ? Number(raw)
        : null;

  return typeof num === "number" && Number.isFinite(num) ? num : null;
}

export async function tryPersistPontoAudioDurationMs(params: {
  pontoAudioId: string;
  durationMs: number;
}) {
  const id = String(params.pontoAudioId ?? "").trim();
  const durationMs =
    typeof params.durationMs === "number" && Number.isFinite(params.durationMs)
      ? Math.round(params.durationMs)
      : 0;

  if (!id) return { ok: false as const, status: null };
  if (durationMs <= 0) return { ok: false as const, status: null };

  const res = await supabase
    .from("ponto_audios")
    .update({ duration_ms: durationMs })
    .eq("id", id)
    .or("duration_ms.is.null,duration_ms.lte.0")
    .select("id")
    .maybeSingle();

  if (res.error) {
    if (__DEV__) {
      console.log("[PLAYBACK][DURATION_PERSIST_ERR]", {
        ponto_audio_id: id,
        message: res.error.message,
      });
    }
    return { ok: false as const, status: null };
  }

  return { ok: true as const, status: 200 };
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`[audio] ${label} timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function requireSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const session = data?.session ?? null;
  if (!session?.access_token) {
    throw new Error("Você precisa estar logada para concluir.");
  }
  return session;
}

export async function callFunctionAuthed<T>(name: string, body: unknown) {
  await requireSession();

  const res = await supabase.functions.invoke(name, {
    body: body as any,
  });

  if (res.error) {
    const anyErr: any = res.error;
    const status =
      typeof anyErr?.status === "number" ? (anyErr.status as number) : null;

    const msg =
      typeof anyErr?.message === "string" && anyErr.message.trim()
        ? anyErr.message
        : getErrorMessage(anyErr);

    const e = new Error(msg);
    (e as any).status = status;
    throw e;
  }

  return res.data as T;
}

async function callFunctionAuthedHttp(
  name: string,
  body: unknown,
): Promise<{
  status: number;
  bodyText: string;
  bodyJson: any | null;
  sbRequestId: string | null;
}> {
  const session = await requireSession();

  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) {
    throw new Error("Configuração do Supabase ausente.");
  }

  const url = new URL(`${baseUrl}/functions/v1/${name}`);

  const requestHeaders = {
    apikey: anonKey,
    Authorization: `Bearer ${session.access_token}`,
    "content-type": "application/json",
    accept: "application/json",
  };

  if (__DEV__) {
    console.log("[PLAYBACK][REQUEST]", {
      file: "src/api/pontoAudio.ts",
      fn: "callFunctionAuthedHttp",
      mode: "fetch",
      context: "review",
      url: url.toString(),
      method: "POST",
      headers: maskHeadersForLog(requestHeaders),
      hasAuthToken: Boolean(session?.access_token),
      body,
      bodyText: safeJsonStringifyForLog(body),
    });
  }

  const isPlaybackEdge = name === "ponto-audio-playback-url";
  const t0 = isPlaybackEdge ? performance.now() : 0;
  if (__DEV__ && isPlaybackEdge) {
    console.log("[PERF][PLAYBACK][EDGE_START]", { mode: "review" });
  }

  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(body ?? {}),
  });

  if (__DEV__ && isPlaybackEdge) {
    const t1 = performance.now();
    console.log("[PERF][PLAYBACK][EDGE_END]", {
      mode: "review",
      ms: Math.round(t1 - t0),
      status: resp.status,
    });
  }

  const sbRequestId =
    resp.headers.get("sb-request-id") ??
    resp.headers.get("x-sb-request-id") ??
    resp.headers.get("sb_request_id") ??
    null;

  const bodyText = await resp.text();
  let bodyJson: any | null = null;
  try {
    bodyJson = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    bodyJson = null;
  }

  if (__DEV__) {
    console.log("[PLAYBACK][RESPONSE]", {
      file: "src/api/pontoAudio.ts",
      fn: "callFunctionAuthedHttp",
      context: "review",
      url: url.toString(),
      status: resp.status,
      sbRequestId,
      responseHeaders: {
        "content-type": resp.headers.get("content-type"),
        "content-length": resp.headers.get("content-length"),
      },
      bodyTextPreview: bodyText?.trim?.()
        ? bodyText.trim().slice(0, 2000)
        : null,
      bodyJson: summarizeBodyForLog(bodyJson),
    });
  }

  return { status: resp.status, bodyText, bodyJson, sbRequestId };
}

async function callFunctionPublicHttp(
  name: string,
  body: unknown,
): Promise<{
  status: number;
  bodyText: string;
  bodyJson: any | null;
  sbRequestId: string | null;
}> {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) {
    throw new Error("Configuração do Supabase ausente.");
  }

  const url = new URL(`${baseUrl}/functions/v1/${name}`);

  const requestHeaders = {
    apikey: anonKey,
    // IMPORTANT: public playback must NOT send Authorization.
    "content-type": "application/json",
    accept: "application/json",
  };

  if (__DEV__) {
    console.log("[PLAYBACK][REQUEST]", {
      file: "src/api/pontoAudio.ts",
      fn: "callFunctionPublicHttp",
      mode: "fetch",
      context: "player",
      url: url.toString(),
      method: "POST",
      headers: maskHeadersForLog(requestHeaders),
      hasAuthToken: false,
      body,
      bodyText: safeJsonStringifyForLog(body),
    });
  }

  const isPlaybackEdge = name === "ponto-audio-playback-url";
  const t0 = isPlaybackEdge ? performance.now() : 0;
  if (__DEV__ && isPlaybackEdge) {
    console.log("[PERF][PLAYBACK][EDGE_START]", { mode: "public" });
  }

  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(body ?? {}),
  });

  if (__DEV__ && isPlaybackEdge) {
    const t1 = performance.now();
    console.log("[PERF][PLAYBACK][EDGE_END]", {
      mode: "public",
      ms: Math.round(t1 - t0),
      status: resp.status,
    });
  }

  const sbRequestId =
    resp.headers.get("sb-request-id") ??
    resp.headers.get("x-sb-request-id") ??
    resp.headers.get("sb_request_id") ??
    null;

  const bodyText = await resp.text();
  let bodyJson: any | null = null;
  try {
    bodyJson = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    bodyJson = null;
  }

  if (__DEV__) {
    console.log("[PLAYBACK][RESPONSE]", {
      file: "src/api/pontoAudio.ts",
      fn: "callFunctionPublicHttp",
      context: "player",
      url: url.toString(),
      status: resp.status,
      sbRequestId,
      responseHeaders: {
        "content-type": resp.headers.get("content-type"),
        "content-length": resp.headers.get("content-length"),
      },
      bodyTextPreview: bodyText?.trim?.()
        ? bodyText.trim().slice(0, 2000)
        : null,
      bodyJson: summarizeBodyForLog(bodyJson),
    });
  }

  return { status: resp.status, bodyText, bodyJson, sbRequestId };
}

function mapPlaybackError(params: { status: number; rawMessage: string }): {
  message: string;
  noRetry: boolean;
} {
  const status = params.status;
  const msg = (params.rawMessage ?? "").trim();
  const msgLower = msg.toLowerCase();

  // Storage failure (backend should ideally return 404/409, but some deployments return 500).
  if (
    msgLower.includes("failed to create signed playback url") ||
    msgLower.includes("object not found")
  ) {
    return {
      message: "Áudio indisponível no momento.",
      noRetry: false,
    };
  }

  if (status === 401) {
    return {
      message: "Áudio em revisão. Disponível em breve.",
      noRetry: true,
    };
  }

  if (status === 403) {
    return {
      message: "Só curators podem ouvir antes da aprovação.",
      noRetry: true,
    };
  }

  if (status === 409 || msgLower.includes("not ready")) {
    return {
      message: "Upload em processamento. Tente novamente em instantes.",
      noRetry: false,
    };
  }

  if (status === 404) {
    return {
      message: "Áudio indisponível no momento.",
      noRetry: true,
    };
  }

  return {
    message: msg || `Erro ao chamar ponto-audio-playback-url (HTTP ${status}).`,
    noRetry: false,
  };
}

export async function callFunctionPublic<T>(
  name: string,
  params?: Record<string, string | number | boolean | null | undefined>,
) {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) {
    throw new Error("Configuração do Supabase ausente.");
  }

  const url = new URL(`${baseUrl}/functions/v1/${name}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === null || v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: {
      apikey: anonKey,
      Accept: "application/json",
    },
  });

  const text = await resp.text();
  let data: any | null = null;
  try {
    data = text ? (JSON.parse(text) as any) : null;
  } catch {
    data = null;
  }

  if (!resp.ok) {
    const fallback = (() => {
      const trimmed = text?.trim?.() ? String(text).trim() : "";
      if (trimmed)
        return trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed;
      return null;
    })();

    const e = new Error(
      typeof data?.message === "string" && data.message.trim()
        ? data.message
        : fallback
          ? `Erro ao chamar ${name} (HTTP ${resp.status}): ${fallback}`
          : `Erro ao chamar ${name} (HTTP ${resp.status}).`,
    );
    (e as any).status = resp.status;
    throw e;
  }

  return data as T;
}

export async function initPontoAudioUpload(params: {
  pontoId: string;
  interpreterName: string;
  mimeType: string;
  interpreterConsent: boolean;
}) {
  const payload = {
    ponto_id: params.pontoId,
    interpreter_name: params.interpreterName,
    mime_type: params.mimeType,
    interpreter_consent: params.interpreterConsent,
  };

  console.log("[audio] init start", {
    pontoId: params.pontoId,
    mimeType: params.mimeType,
  });

  let data: InitUploadResponse;
  try {
    data = await callFunctionAuthed<InitUploadResponse>(
      "ponto-audio-init-upload",
      payload,
    );
  } catch (e) {
    console.log("[audio] init error", serializeErrorForLog(e));
    throw e;
  }

  console.log("[audio] init ok", {
    ponto_audio_id: data.ponto_audio_id,
    signedUploadUrl: safeSignedUrlSummary(data?.signed_upload?.signedUrl),
  });

  return {
    pontoAudioId: data.ponto_audio_id,
    uploadToken: data.upload_token,
    bucket: data.bucket,
    path: data.path,
    signedUpload: data.signed_upload,
  };
}

export async function uploadToSignedUpload(params: {
  bucket: string;
  path: string;
  signedUpload: { token?: string; signedUrl?: string; [k: string]: unknown };
  fileUri: string;
  mimeType: string;
}) {
  const signedUrl =
    typeof params.signedUpload?.signedUrl === "string"
      ? params.signedUpload.signedUrl
      : null;

  if (!signedUrl) {
    console.log("[audio] upload error", {
      reason: "signedUrl missing",
      bucket: params.bucket,
      path: params.path,
    });
    throw new Error("Resposta de upload inválida (signed URL ausente).");
  }

  console.log("[audio] upload start", {
    bucket: params.bucket,
    path: params.path,
    fileUri: params.fileUri,
    mimeType: params.mimeType,
    signedUploadUrl: safeSignedUrlSummary(signedUrl),
  });

  const doUploadOnce = async (timeoutMs: number, attempt: number) => {
    console.log("[audio] upload attempt", { attempt, timeoutMs });
    const res = await withTimeout(
      FileSystemLegacy.uploadAsync(signedUrl, params.fileUri, {
        httpMethod: "PUT",
        uploadType: FileSystemLegacy.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          "Content-Type": params.mimeType,
        },
      }),
      timeoutMs,
      `upload attempt ${attempt}`,
    );

    console.log("[audio] upload response", {
      attempt,
      status: res.status,
      headers: res.headers,
      body: res.body,
      mimeType: res.mimeType,
    });

    if (res.status !== 200 && res.status !== 201 && res.status !== 204) {
      throw new Error(`Upload falhou (status ${res.status}).`);
    }

    return res;
  };

  try {
    await doUploadOnce(60_000, 1);
    console.log("[audio] upload ok");
    return { ok: true as const };
  } catch (e1) {
    console.log("[audio] upload error", serializeErrorForLog(e1));
    // Retry once with a larger timeout (diagnostic only).
    try {
      await doUploadOnce(180_000, 2);
      console.log("[audio] upload ok");
      return { ok: true as const };
    } catch (e2) {
      console.log("[audio] upload error", serializeErrorForLog(e2));
      throw e2;
    }
  }
}

export async function completePontoAudioUpload(params: {
  uploadToken: string;
  pontoAudioId?: string | null;
  sizeBytes: number;
  durationMs: number;
  contentEtag?: string | null;
  sha256?: string | null;
}) {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData?.session?.access_token ?? null;
  if (!accessToken) {
    throw new Error("Você precisa estar logada para concluir.");
  }

  console.log("[audio] complete auth header attached", {
    hasToken: true,
    tokenPrefix: accessToken.slice(0, 6),
  });

  const payloadBase = {
    upload_token: params.uploadToken,
    size_bytes: params.sizeBytes,
    duration_ms: params.durationMs,
    content_etag: params.contentEtag ?? null,
    sha256: params.sha256 ?? null,
  };

  const dedupeKey =
    typeof params.pontoAudioId === "string" && params.pontoAudioId.trim()
      ? `ponto_audio_id:${params.pontoAudioId.trim()}`
      : `upload_token:${params.uploadToken}`;

  const existing = inFlightCompleteByKey.get(dedupeKey);
  if (existing) return existing;

  console.log("[audio] calling complete", {
    dedupeKey,
    ponto_audio_id:
      typeof params.pontoAudioId === "string" ? params.pontoAudioId : null,
  });

  const promise = (async () => {
    try {
      const res = await supabase.functions.invoke(
        "ponto-audio-complete-upload",
        {
          body: payloadBase as any,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (res.error) {
        const anyErr: any = res.error;
        const status =
          typeof anyErr?.status === "number" ? (anyErr.status as number) : null;
        const body =
          typeof anyErr?.context?.body !== "undefined"
            ? anyErr.context.body
            : typeof anyErr?.context !== "undefined"
              ? anyErr.context
              : null;

        const msg =
          typeof anyErr?.message === "string" && anyErr.message.trim()
            ? anyErr.message.trim()
            : "Não foi possível concluir o upload.";

        const e = new Error(msg);
        (e as any).status = status;
        (e as any).body = body;
        throw e;
      }

      const data = res.data as CompleteUploadResponse;

      console.log("[audio] complete ok", {
        ponto_audio_id: data.ponto_audio_id,
        bucket: data.bucket,
        path: data.path,
        upload_status: data.upload_status,
      });

      return {
        ok: true as const,
        pontoAudioId: data.ponto_audio_id,
        bucket: data.bucket,
        path: data.path,
        uploadStatus: data.upload_status,
      };
    } catch (e) {
      console.log("[audio] complete error", {
        error: serializeErrorForLog(e),
        status:
          e && typeof e === "object" && "status" in (e as any)
            ? Number((e as any).status)
            : null,
        body:
          e && typeof e === "object" && "body" in (e as any)
            ? (e as any).body
            : null,
      });
      throw e;
    } finally {
      inFlightCompleteByKey.delete(dedupeKey);
    }
  })();

  inFlightCompleteByKey.set(dedupeKey, promise);
  return promise;
}

export async function completeUploadWithRetry(params: {
  uploadToken: string;
  pontoAudioId?: string | null;
  sizeBytes: number;
  durationMs: number;
  contentEtag?: string | null;
  sha256?: string | null;
}) {
  const backoffsMs = [500, 1000, 2000, 4000, 6000];
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const accessToken = sessionData?.session?.access_token ?? null;
    if (!accessToken) {
      const err = new Error("Você precisa estar logada para concluir.");
      (err as any).status = 401;
      throw err;
    }

    const payload = {
      upload_token: params.uploadToken,
      size_bytes: params.sizeBytes,
      duration_ms: params.durationMs,
      content_etag: params.contentEtag ?? null,
      sha256: params.sha256 ?? null,
    };

    const res = await supabase.functions.invoke("ponto-audio-complete-upload", {
      body: payload as any,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.error) {
      console.log("[audio] complete attempt", { attempt, status: 200 });
      return res.data as CompleteUploadResponse;
    }

    const anyErr: any = res.error;
    const status =
      typeof anyErr?.status === "number" ? (anyErr.status as number) : null;
    const bodyRaw =
      typeof anyErr?.context?.body !== "undefined"
        ? anyErr.context.body
        : typeof anyErr?.context !== "undefined"
          ? anyErr.context
          : null;

    console.log("[audio] complete attempt", { attempt, status });

    // Do not retry on auth/permission errors.
    if (status === 401 || status === 403) {
      console.log("[audio] complete failed", {
        status,
        body: summarizeBodyForLog(bodyRaw),
      });
      const e = new Error(
        status === 401
          ? "Não autorizado para concluir o upload."
          : "Sem permissão para concluir o upload.",
      );
      (e as any).status = status;
      (e as any).body = bodyRaw;
      throw e;
    }

    // Eventual consistency: retry only when 409 and body.retryable === true.
    if (status === 409) {
      let bodyJson: any = null;
      if (bodyRaw && typeof bodyRaw === "object") {
        bodyJson = bodyRaw;
      } else if (typeof bodyRaw === "string") {
        try {
          bodyJson = JSON.parse(bodyRaw);
        } catch {
          bodyJson = null;
        }
      }

      const retryable =
        bodyJson &&
        typeof bodyJson === "object" &&
        !Array.isArray(bodyJson) &&
        (bodyJson as any).retryable === true;

      if (retryable && attempt < maxAttempts) {
        const waitMs =
          backoffsMs[attempt - 1] ?? backoffsMs[backoffsMs.length - 1];
        console.log("[audio] complete retrying", { attempt, waitMs });
        await sleep(waitMs);
        continue;
      }

      console.log("[audio] complete failed", {
        status,
        body: summarizeBodyForLog(bodyJson ?? bodyRaw),
      });

      const e = new Error("Não foi possível concluir o upload.");
      (e as any).status = status;
      (e as any).body = bodyRaw;
      throw e;
    }

    console.log("[audio] complete failed", {
      status,
      body: summarizeBodyForLog(bodyRaw),
    });

    const msg =
      typeof anyErr?.message === "string" && anyErr.message.trim()
        ? anyErr.message.trim()
        : "Não foi possível concluir o upload.";
    const e = new Error(msg);
    (e as any).status = status;
    (e as any).body = bodyRaw;
    throw e;
  }

  throw new Error(
    "Não foi possível concluir o upload (complete não confirmou).",
  );
}

export async function finalizeAudioUploadAndCreateSubmission(params: {
  pontoId: string;
  pontoAudioId: string;
  uploadToken: string;
  sizeBytes: number;
  durationMs: number;
  contentEtag?: string | null;
  sha256?: string | null;
}) {
  const pontoAudioId = params.pontoAudioId.trim();
  if (!pontoAudioId) {
    throw new Error("pontoAudioId inválido.");
  }

  const existing = inFlightPostUploadByPontoAudioId.get(pontoAudioId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      try {
        await completeUploadWithRetry({
          uploadToken: params.uploadToken,
          pontoAudioId: params.pontoAudioId,
          sizeBytes: params.sizeBytes,
          durationMs: params.durationMs,
          contentEtag: params.contentEtag ?? null,
          sha256: params.sha256 ?? null,
        });
      } catch (e) {
        console.log("[audio] post-upload failed", {
          etapa: "complete",
          pontoAudioId: params.pontoAudioId,
          status:
            e && typeof e === "object" && "status" in (e as any)
              ? Number((e as any).status)
              : null,
          error: serializeErrorForLog(e),
        });
        throw e;
      }

      const { data, error } = await supabase.rpc(
        "finalize_ponto_audio_and_create_submission",
        {
          p_ponto_audio_id: params.pontoAudioId,
          p_ponto_id: params.pontoId,
        },
      );

      if (error) {
        console.log("[audio] post-upload failed", {
          etapa: "rpc_finalize",
          pontoAudioId: params.pontoAudioId,
          status: (error as any)?.status ?? null,
          error: serializeErrorForLog(error),
        });

        const code = (error as any)?.code ?? null;
        if (code === "42501") {
          throw new Error("Sem permissão para criar a submissão de revisão.");
        }

        const rawMsg =
          typeof (error as any)?.message === "string"
            ? (error as any).message
            : "";
        const msg = rawMsg.trim().toLowerCase();
        if (
          msg &&
          msg.includes("submission") &&
          (msg.includes("not initialized") ||
            msg.includes("not initialised") ||
            msg.includes("does not exist") ||
            msg.includes("não inicial") ||
            msg.includes("nao inicial") ||
            msg.includes("não existe") ||
            msg.includes("nao existe"))
        ) {
          throw new Error(
            "Não foi possível concluir o envio porque a submissão não foi inicializada. Volte e tente enviar novamente.",
          );
        }

        throw error;
      }

      const submissionId =
        typeof data === "string" || typeof data === "number"
          ? String(data)
          : data && typeof data === "object" && "id" in (data as any)
            ? String((data as any).id)
            : null;

      console.log("[audio] post-upload rpc ok", {
        submission_id: submissionId,
        ponto_audio_id: params.pontoAudioId,
      });

      return { ok: true as const, submissionId };
    } finally {
      inFlightPostUploadByPontoAudioId.delete(pontoAudioId);
    }
  })();

  inFlightPostUploadByPontoAudioId.set(pontoAudioId, promise);
  return promise;
}

async function getPontoAudioPlaybackUrlInternal(
  mode: "public" | "review",
  body: { ponto_audio_id?: string; submission_id?: string },
) {
  const name = "ponto-audio-playback-url";

  const res =
    mode === "review"
      ? await callFunctionAuthedHttp(name, body)
      : await callFunctionPublicHttp(name, body);

  if (res.status < 200 || res.status >= 300) {
    const raw = (() => {
      const bj: any = res.bodyJson;
      if (typeof bj?.message === "string" && bj.message.trim())
        return bj.message;

      const errStr =
        typeof bj?.error === "string" && bj.error.trim()
          ? bj.error.trim()
          : null;
      const detailsStr =
        typeof bj?.details === "string" && bj.details.trim()
          ? bj.details.trim()
          : null;
      if (errStr && detailsStr) return `${errStr} (${detailsStr})`;
      if (errStr) return errStr;
      if (detailsStr) return detailsStr;

      if (bj?.error && typeof bj.error === "object") {
        try {
          return JSON.stringify(bj.error);
        } catch {
          // ignore
        }
      }
      if (bj?.details && typeof bj.details === "object") {
        try {
          return JSON.stringify(bj.details);
        } catch {
          // ignore
        }
      }
      return typeof res.bodyText === "string" ? res.bodyText : "";
    })();

    const rawLower = String(raw ?? "").toLowerCase();
    const mapped = mapPlaybackError({ status: res.status, rawMessage: raw });
    const e = new Error(mapped.message);
    (e as any).status = res.status;
    (e as any).noRetry = mapped.noRetry;
    (e as any).sbRequestId = res.sbRequestId;
    (e as any).playbackKind =
      rawLower.includes("failed to create signed playback url") ||
      rawLower.includes("object not found")
        ? "object_not_found"
        : res.status === 409 || rawLower.includes("not ready")
          ? "not_ready"
          : res.status === 401
            ? "unauthorized"
            : res.status === 403
              ? "forbidden"
              : res.status === 404
                ? "not_found"
                : "unknown";

    if (__DEV__) {
      console.log("[audio] playback error", {
        status: res.status,
        sbRequestId: res.sbRequestId,
        request: summarizeBodyForLog(body),
        response: summarizeBodyForLog(res.bodyJson ?? res.bodyText),
        responseTextPreview:
          typeof res.bodyText === "string" && res.bodyText.trim()
            ? res.bodyText.trim().slice(0, 400)
            : null,
      });
    }
    throw e;
  }

  const data = res.bodyJson;

  const expiresRaw =
    data && typeof data === "object" && data
      ? ((data as any).expires_in_seconds ?? (data as any).expires_in)
      : null;

  const expiresInSeconds =
    typeof expiresRaw === "number"
      ? expiresRaw
      : typeof expiresRaw === "string"
        ? Number(expiresRaw)
        : null;

  const signedUrl =
    typeof (data as any)?.signed_url === "string"
      ? String((data as any).signed_url)
      : typeof (data as any)?.url === "string"
        ? String((data as any).url)
        : "";

  const resolvedUrl =
    typeof (data as any)?.resolved_url === "string"
      ? String((data as any).resolved_url)
      : null;

  const resolvedHeadStatusRaw = (data as any)?.resolved_head_status;
  const resolvedHeadStatus =
    typeof resolvedHeadStatusRaw === "number" &&
    Number.isFinite(resolvedHeadStatusRaw)
      ? resolvedHeadStatusRaw
      : typeof resolvedHeadStatusRaw === "string" && resolvedHeadStatusRaw
        ? Number(resolvedHeadStatusRaw)
        : null;

  const usingResolvedUrl = Boolean(resolvedUrl);
  const finalUrl = resolvedUrl ?? signedUrl;

  let urlHost: string | null = null;
  try {
    urlHost = finalUrl ? new URL(finalUrl).host : null;
  } catch {
    urlHost = null;
  }

  if (__DEV__) {
    console.log("[PLAYBACK][URL_SELECTED]", {
      file: "src/api/pontoAudio.ts",
      fn: "getPontoAudioPlaybackUrlInternal",
      mode,
      using_resolved_url: usingResolvedUrl,
      resolved_head_status: resolvedHeadStatus,
      url_host: urlHost,
    });
  }

  return {
    url: finalUrl,
    expiresIn:
      typeof expiresInSeconds === "number" && Number.isFinite(expiresInSeconds)
        ? expiresInSeconds
        : 60,
    mimeType:
      typeof (data as any)?.mime_type === "string"
        ? (data as any).mime_type
        : null,
    signedUrl,
    resolvedUrl,
    resolvedHeadStatus,
    usingResolvedUrl,
    urlHost,
  };
}

export async function getPontoAudioPlaybackUrlPublic(pontoAudioId: string) {
  return getPontoAudioPlaybackUrlInternal("public", {
    ponto_audio_id: pontoAudioId,
  });
}

export async function getPontoAudioPlaybackUrlReview(pontoAudioId: string) {
  return getPontoAudioPlaybackUrlInternal("review", {
    ponto_audio_id: pontoAudioId,
  });
}

export async function getPontoAudioPlaybackUrlReviewBySubmission(
  submissionId: string,
) {
  return getPontoAudioPlaybackUrlInternal("review", {
    submission_id: submissionId,
  });
}

function getCachedReviewPlaybackUrl(submissionId: string) {
  const entry = REVIEW_PLAYBACK_URL_CACHE.get(submissionId);
  if (!entry) {
    if (__DEV__) {
      console.log("[CACHE][MISS]", {
        file: "src/api/pontoAudio.ts",
        key: "review_playback_url",
        submission_id: submissionId,
      });
    }
    return null;
  }

  const now = Date.now();
  const isExpired = now + REVIEW_PLAYBACK_EXPIRY_BUFFER_MS >= entry.expiresAtMs;

  if (isExpired) {
    REVIEW_PLAYBACK_URL_CACHE.delete(submissionId);
    if (__DEV__) {
      console.log("[CACHE][EXPIRED]", {
        file: "src/api/pontoAudio.ts",
        key: "review_playback_url",
        submission_id: submissionId,
        now_ms: now,
        expires_at_ms: entry.expiresAtMs,
        fetched_at_ms: entry.fetchedAtMs,
      });
    }
    return null;
  }

  if (__DEV__) {
    console.log("[CACHE][HIT]", {
      file: "src/api/pontoAudio.ts",
      key: "review_playback_url",
      submission_id: submissionId,
      now_ms: now,
      expires_at_ms: entry.expiresAtMs,
      fetched_at_ms: entry.fetchedAtMs,
    });
  }
  return entry;
}

export async function getReviewPlaybackUrlEnsured(submissionId: string) {
  const sid = String(submissionId ?? "").trim();
  if (!sid) throw new Error("submissionId inválido.");

  const cached = getCachedReviewPlaybackUrl(sid);
  if (cached) return cached;

  const inflight = inFlightReviewPlaybackBySubmissionId.get(sid);
  if (inflight) {
    if (__DEV__) {
      console.log("[CACHE][INFLIGHT_REUSE]", {
        file: "src/api/pontoAudio.ts",
        key: "review_playback_url",
        submission_id: sid,
      });
    }
    return inflight;
  }

  const promise = (async () => {
    try {
      const fetchedAtMs = Date.now();
      const res = await getPontoAudioPlaybackUrlReviewBySubmission(sid);

      const expiresInSeconds =
        typeof res?.expiresIn === "number" && Number.isFinite(res.expiresIn)
          ? res.expiresIn
          : 60;

      const entry: ReviewPlaybackUrlCacheEntry = {
        url: res.url,
        fetchedAtMs,
        expiresAtMs: fetchedAtMs + expiresInSeconds * 1000,
      };

      REVIEW_PLAYBACK_URL_CACHE.set(sid, entry);
      return entry;
    } finally {
      inFlightReviewPlaybackBySubmissionId.delete(sid);
    }
  })();

  inFlightReviewPlaybackBySubmissionId.set(sid, promise);
  return promise;
}

export function prefetchReviewPlaybackUrl(submissionId: string) {
  const sid = String(submissionId ?? "").trim();
  if (!sid) return;

  const cached = getCachedReviewPlaybackUrl(sid);
  if (cached) return;

  const inflight = inFlightReviewPlaybackBySubmissionId.get(sid);
  if (inflight) {
    if (__DEV__) {
      console.log("[CACHE][INFLIGHT_REUSE]", {
        file: "src/api/pontoAudio.ts",
        key: "review_playback_url",
        submission_id: sid,
        via: "prefetch",
      });
    }
    return;
  }

  const start =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : null;

  if (__DEV__) {
    console.log("[PERF][PREFETCH][START]", {
      file: "src/api/pontoAudio.ts",
      key: "review_playback_url",
      submission_id: sid,
    });
  }

  void getReviewPlaybackUrlEnsured(sid).then(
    () => {
      if (__DEV__) {
        console.log("[PERF][PREFETCH][END]", {
          file: "src/api/pontoAudio.ts",
          key: "review_playback_url",
          submission_id: sid,
          ok: true,
          ms:
            start !== null &&
            typeof performance !== "undefined" &&
            typeof performance.now === "function"
              ? Math.round(performance.now() - start)
              : null,
        });
      }
    },
    (e) => {
      if (__DEV__) {
        console.log("[PERF][PREFETCH][END]", {
          file: "src/api/pontoAudio.ts",
          key: "review_playback_url",
          submission_id: sid,
          ok: false,
          ms:
            start !== null &&
            typeof performance !== "undefined" &&
            typeof performance.now === "function"
              ? Math.round(performance.now() - start)
              : null,
          error: serializeErrorForLog(e),
        });
      }
    },
  );
}
