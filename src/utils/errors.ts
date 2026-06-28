export function getErrorMessage(e: unknown): string {
  if (e instanceof Error && typeof e.message === "string" && e.message.trim()) {
    return e.message;
  }
  if (e && typeof e === "object") {
    const anyErr = e as any;
    if (typeof anyErr.message === "string" && anyErr.message.trim()) {
      return anyErr.message;
    }
  }
  return String(e);
}

export function safeJsonForLog(value: unknown, maxLen = 4000): string {
  try {
    const s = JSON.stringify(value);
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  } catch {
    return "<unstringifiable>";
  }
}

export function isColumnMissingError(
  error: unknown,
  columnName: string
): boolean {
  const raw =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";

  const m = raw.toLowerCase();
  const col = columnName.toLowerCase();
  return m.includes(col) && (m.includes("does not exist") || m.includes("column"));
}

export function serializeErrorForLog(error: unknown): Record<string, unknown> {
  const e = error as any;
  return {
    message: typeof e?.message === "string" ? e.message : null,
    details: typeof e?.details === "string" ? e.details : null,
    hint: typeof e?.hint === "string" ? e.hint : null,
    code: typeof e?.code === "string" ? e.code : null,
    status: typeof e?.status === "number" ? e.status : null,
    raw: safeJsonForLog(error),
  };
}
