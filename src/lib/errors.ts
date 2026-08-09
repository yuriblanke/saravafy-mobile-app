const NETWORK_MESSAGE =
  "Sem conexão. Verifique sua internet e tente novamente.";

export function isNetworkError(e: unknown): boolean {
  const raw =
    e instanceof Error
      ? e.message
      : e && typeof e === "object" && typeof (e as { message?: unknown }).message === "string"
        ? ((e as { message: string }).message)
        : "";

  const hay = raw.toLowerCase();
  return hay.includes("network request failed") || hay.includes("failed to fetch");
}

export function getErrorMessage(e: unknown, fallback?: string): string {
  if (isNetworkError(e)) return NETWORK_MESSAGE;

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
