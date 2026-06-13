export function getErrorMessage(e: unknown, fallback?: string): string {
  if (e instanceof Error && typeof e.message === "string" && e.message.trim()) {
    return e.message;
  }

  if (e && typeof e === "object") {
    const anyErr = e as { message?: unknown };
    if (typeof anyErr.message === "string" && anyErr.message.trim()) {
      return anyErr.message;
    }
  }

  if (typeof e === "string") {
    return e;
  }

  if (e == null && fallback !== undefined) {
    return fallback;
  }

  return fallback ?? String(e);
}
