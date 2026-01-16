import { supabase } from "@/lib/supabase";

export type InitUploadResponse = {
  ponto_audio_id: string;
  upload_token: string;
  bucket: "ponto-audios";
  path: string;
  signed_upload: {
    signedUrl?: string;
    path?: string;
    token?: string;
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in (error as any)) {
    return String((error as any).message);
  }
  return String(error ?? "Erro");
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

  const data = await callFunctionAuthed<InitUploadResponse>(
    "ponto-audio-init-upload",
    payload
  );

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
  const token =
    typeof params.signedUpload?.token === "string" ? params.signedUpload.token : null;

  // Prefer Supabase helper when token is available.
  if (token) {
    const blob = await (await fetch(params.fileUri)).blob();

    const res = await supabase.storage
      .from(params.bucket)
      .uploadToSignedUrl(params.path, token, blob, {
        contentType: params.mimeType,
      });

    if (res.error) {
      throw new Error(
        typeof res.error.message === "string" && res.error.message.trim()
          ? res.error.message
          : "Não foi possível enviar o áudio."
      );
    }

    return { ok: true as const };
  }

  // Fallback: raw PUT to signedUrl.
  const signedUrl =
    typeof params.signedUpload?.signedUrl === "string"
      ? params.signedUpload.signedUrl
      : null;
  if (!signedUrl) {
    throw new Error("Resposta de upload inválida (signed URL ausente)."
    );
  }

  const blob = await (await fetch(params.fileUri)).blob();
  const resp = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": params.mimeType,
    },
    body: blob,
  });

  if (!resp.ok) {
    throw new Error("Não foi possível enviar o áudio.");
  }

  return { ok: true as const };
}

export async function completePontoAudioUpload(params: {
  uploadToken: string;
  sizeBytes: number;
  durationMs: number;
  contentEtag?: string | null;
  sha256?: string | null;
  maxAttempts?: number;
}) {
  const maxAttempts =
    typeof params.maxAttempts === "number" && params.maxAttempts > 0
      ? Math.trunc(params.maxAttempts)
      : 5;

  const payloadBase = {
    upload_token: params.uploadToken,
    size_bytes: params.sizeBytes,
    duration_ms: params.durationMs,
    content_etag: params.contentEtag ?? null,
    sha256: params.sha256 ?? null,
  };

  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await callFunctionAuthed<CompleteUploadResponse>(
        "ponto-audio-complete-upload",
        payloadBase
      );
      return {
        ok: true as const,
        pontoAudioId: data.ponto_audio_id,
        bucket: data.bucket,
        path: data.path,
        uploadStatus: data.upload_status,
      };
    } catch (e) {
      lastErr = e;
      const status =
        e && typeof e === "object" && "status" in (e as any)
          ? Number((e as any).status)
          : null;

      // Backend returns 409 while the object is not yet visible.
      if (status === 409 && attempt < maxAttempts) {
        const delayMs = 250 * attempt;
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }

      throw e;
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error("Não foi possível concluir o upload.");
}

export async function getPontoAudioPlaybackUrl(pontoAudioId: string) {
  const data = await callFunctionPublic<PlaybackResponse>("ponto-audio-playback", {
    ponto_audio_id: pontoAudioId,
  });

  return {
    url: data.url,
    expiresIn: data.expires_in,
    mimeType: data.mime_type,
  };
}
