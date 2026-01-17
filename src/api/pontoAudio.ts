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
  url: string;
  expires_in: number;
  mime_type: string | null;
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

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
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
  body: unknown
): Promise<{
  status: number;
  bodyText: string;
  bodyJson: any | null;
}> {
  const session = await requireSession();

  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) {
    throw new Error("Configuração do Supabase ausente.");
  }

  const url = `${baseUrl}/functions/v1/${name}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });

  const bodyText = await resp.text();
  let bodyJson: any | null = null;
  try {
    bodyJson = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    bodyJson = null;
  }

  return { status: resp.status, bodyText, bodyJson };
}

export async function callFunctionPublic<T>(
  name: string,
  params?: Record<string, string | number | boolean | null | undefined>
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
      Authorization: `Bearer ${anonKey}`,
      Accept: "application/json",
    },
  });

  const text = await resp.text();
  const data = text ? (JSON.parse(text) as any) : null;

  if (!resp.ok) {
    const e = new Error(
      typeof data?.message === "string" && data.message.trim()
        ? data.message
        : `Erro ao chamar ${name}.`
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
}) {
  const payload = {
    ponto_id: params.pontoId,
    interpreter_name: params.interpreterName,
    mime_type: params.mimeType,
  };

  console.log("[audio] init start", {
    pontoId: params.pontoId,
    mimeType: params.mimeType,
  });

  let data: InitUploadResponse;
  try {
    data = await callFunctionAuthed<InitUploadResponse>(
      "ponto-audio-init-upload",
      payload
    );
  } catch (e) {
    console.log("[audio] init error", serializeErrorForLog(e));
    throw e;
  }

  console.log("[audio] init ok", {
    ponto_audio_id: data.ponto_audio_id,
    signedUploadUrl: safeSignedUrlSummary(data?.signed_upload?.signedUrl),
    expires_in:
      typeof data?.expires_in === "number"
        ? data.expires_in
        : typeof data?.signed_upload?.expires_in === "number"
        ? data.signed_upload.expires_in
        : null,
    mime_type:
      typeof data?.mime_type === "string" || data?.mime_type === null
        ? data.mime_type
        : typeof data?.signed_upload?.mime_type === "string" ||
          data?.signed_upload?.mime_type === null
        ? data.signed_upload.mime_type
        : params.mimeType,
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
      `upload attempt ${attempt}`
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
        }
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

    const res = await supabase.functions.invoke(
      "ponto-audio-complete-upload",
      {
        body: payload as any,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

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
          : "Sem permissão para concluir o upload."
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

  throw new Error("Não foi possível concluir o upload (complete não confirmou).");
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
        }
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

export async function getPontoAudioPlaybackUrl(pontoAudioId: string) {
  const data = await callFunctionPublic<PlaybackResponse>(
    "ponto-audio-playback",
    {
      ponto_audio_id: pontoAudioId,
    }
  );

  return {
    url: data.url,
    expiresIn: data.expires_in,
    mimeType: data.mime_type,
  };
}
