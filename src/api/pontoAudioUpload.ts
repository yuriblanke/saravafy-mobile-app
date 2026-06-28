import { supabase } from "@/lib/supabase";
import * as FileSystemLegacy from "expo-file-system/legacy";

import {
  callFunctionAuthed,
  safeSignedUrlSummary,
  serializeErrorForLog,
  sleep,
  summarizeBodyForLog,
  withTimeout,
} from "./pontoAudioHttp";

export type InitUploadResponse = {
  ponto_audio_id: string;
  upload_token: string;
  bucket: "ponto-audios";
  path: string;
  ponto_id: string;
  ponto_versao_id: string;
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

export async function initPontoAudioUpload(params: {
  pontoVersaoId: string;
  interpreterName: string;
  mimeType: string;
  interpreterConsent: boolean;
}) {
  const payload = {
    ponto_versao_id: params.pontoVersaoId,
    interpreter_name: params.interpreterName,
    mime_type: params.mimeType,
    interpreter_consent: params.interpreterConsent,
  };

  console.log("[audio] init start", {
    pontoVersaoId: params.pontoVersaoId,
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
    ponto_id: data.ponto_id,
    ponto_versao_id: data.ponto_versao_id,
    signedUploadUrl: safeSignedUrlSummary(data?.signed_upload?.signedUrl),
  });

  return {
    pontoAudioId: data.ponto_audio_id,
    pontoId: data.ponto_id,
    pontoVersaoId: data.ponto_versao_id,
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
