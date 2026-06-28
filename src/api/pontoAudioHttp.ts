import { getErrorMessage } from "@/src/utils/errors";
import { supabase } from "@/lib/supabase";

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function summarizeBodyForLog(body: unknown) {
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

export function safeSignedUrlSummary(urlOrNull: unknown) {
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

export function serializeErrorForLog(e: unknown) {
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

export async function withTimeout<T>(
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

export async function requireSession() {
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

export async function callFunctionAuthedHttp(
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
      file: "src/api/pontoAudioHttp.ts",
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
      file: "src/api/pontoAudioHttp.ts",
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

export async function callFunctionPublicHttp(
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
      file: "src/api/pontoAudioHttp.ts",
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
      file: "src/api/pontoAudioHttp.ts",
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

export function mapPlaybackError(params: { status: number; rawMessage: string }): {
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
