type AnyRecord = Record<string, unknown>;

function safeJsonStringify(value: unknown, maxLen = 4000): string {
  try {
    const s = JSON.stringify(value);
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  } catch {
    return "<unstringifiable>";
  }
}

export function serializeErrorForLog(error: unknown): AnyRecord {
  const asAny: any = error as any;

  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in asAny
        ? String(asAny.message)
        : typeof error === "string"
          ? error
          : null;

  const name = error instanceof Error ? error.name : typeof asAny?.name === "string" ? asAny.name : null;

  const stack =
    error instanceof Error && typeof error.stack === "string" && error.stack.trim()
      ? error.stack.split("\n").slice(0, 8).join("\n")
      : null;

  const out: AnyRecord = {
    message,
    name,
    stack,
    status: typeof asAny?.status === "number" ? asAny.status : null,
    code: typeof asAny?.code === "string" ? asAny.code : null,
    details:
      typeof asAny?.details === "string"
        ? asAny.details
        : asAny?.details && typeof asAny.details === "object"
          ? safeJsonStringify(asAny.details)
          : null,
    hint: typeof asAny?.hint === "string" ? asAny.hint : null,
    asString: String(error),
  };

  // Keep a shallow snapshot for weird non-Error throwables.
  if (error && typeof error === "object" && !(error instanceof Error)) {
    out.raw = safeJsonStringify(error, 2000);
  }

  return out;
}

export function metroLog(scope: string, event: string, data?: unknown) {
  if (!__DEV__) return;

  const s = String(scope ?? "").trim() || "Log";
  const e = String(event ?? "").trim() || "event";

  // eslint-disable-next-line no-console
  if (typeof data === "undefined") console.log(`[${s}] ${e}`);
  else console.log(`[${s}] ${e}`, data);
}

export function metroError(scope: string, event: string, error: unknown, data?: unknown) {
  if (!__DEV__) return;

  const payload = {
    ...(data && typeof data === "object" ? (data as AnyRecord) : { data }),
    error: serializeErrorForLog(error),
  };

  // eslint-disable-next-line no-console
  console.log(`[${String(scope ?? "Error").trim() || "Error"}] ${String(event ?? "error").trim() || "error"}`, payload);
}
