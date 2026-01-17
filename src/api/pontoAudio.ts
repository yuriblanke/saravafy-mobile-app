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
  const backoffsMs = [400, 900, 1600, 2500];
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await completePontoAudioUpload(params);
      console.log("[audio] complete attempt", { attempt, status: 200 });
      return res;
    } catch (e) {
      const status =
        e && typeof e === "object" && "status" in (e as any)
          ? Number((e as any).status)
          : null;
      const bodyRaw =
        e && typeof e === "object" && "body" in (e as any)
          ? (e as any).body
          : null;

      let body: any = null;
      if (bodyRaw && typeof bodyRaw === "object") {
        body = bodyRaw;
      } else if (typeof bodyRaw === "string") {
        try {
          body = JSON.parse(bodyRaw);
        } catch {
          body = null;
        }
      }

      console.log("[audio] complete attempt", { attempt, status });

      const retryable =
        body && typeof body === "object" && !Array.isArray(body)
          ? (body as any).retryable === true
          : false;

      if (status === 409 && retryable && attempt < maxAttempts) {
        const waitMs = backoffsMs[attempt - 1] ?? backoffsMs[backoffsMs.length - 1];
        console.log("[audio] complete retrying", { attempt, waitMs });
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      throw e;
    }
  }

  throw new Error("Não foi possível concluir o upload (complete não confirmou).");
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
