import { supabase } from "@/lib/supabase";

import {
  callFunctionAuthedHttp,
  callFunctionPublicHttp,
  mapPlaybackError,
  serializeErrorForLog,
  summarizeBodyForLog,
} from "./pontoAudioHttp";

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

async function getPontoAudioPlaybackUrlInternal(
  mode: "public" | "review",
  body:
    | { kind: "approved"; ponto_id: string }
    | { kind: "approved"; ponto_versao_id: string }
    | { kind: "submission"; submission_id: string },
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
      file: "src/api/pontoAudioPlayback.ts",
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
        : 420,
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

export async function getPontoAudioPlaybackUrlPublic(params: {
  pontoId?: string;
  pontoVersaoId?: string;
}) {
  if (!params.pontoId && !params.pontoVersaoId) {
    throw new Error("pontoId ou pontoVersaoId é obrigatório.");
  }
  return getPontoAudioPlaybackUrlInternal("public", {
    kind: "approved",
    ...(params.pontoVersaoId
      ? { ponto_versao_id: params.pontoVersaoId }
      : { ponto_id: params.pontoId! }),
  });
}

export async function getPontoAudioPlaybackUrlReviewBySubmission(
  submissionId: string,
) {
  return getPontoAudioPlaybackUrlInternal("review", {
    kind: "submission",
    submission_id: submissionId,
  });
}

function getCachedReviewPlaybackUrl(submissionId: string) {
  const entry = REVIEW_PLAYBACK_URL_CACHE.get(submissionId);
  if (!entry) {
    if (__DEV__) {
      console.log("[CACHE][MISS]", {
        file: "src/api/pontoAudioPlayback.ts",
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
        file: "src/api/pontoAudioPlayback.ts",
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
      file: "src/api/pontoAudioPlayback.ts",
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
        file: "src/api/pontoAudioPlayback.ts",
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
          : 420;

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
        file: "src/api/pontoAudioPlayback.ts",
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
      file: "src/api/pontoAudioPlayback.ts",
      key: "review_playback_url",
      submission_id: sid,
    });
  }

  void getReviewPlaybackUrlEnsured(sid).then(
    () => {
      if (__DEV__) {
        console.log("[PERF][PREFETCH][END]", {
          file: "src/api/pontoAudioPlayback.ts",
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
          file: "src/api/pontoAudioPlayback.ts",
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
