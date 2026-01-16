declare global {
  // eslint-disable-next-line no-var
  var __saravafyNavTraceT0: number | undefined;
}

export function navTrace(event: string, data?: unknown) {
  if (!__DEV__) return;

  const now = Date.now();
  const t0 = globalThis.__saravafyNavTraceT0 ?? now;
  globalThis.__saravafyNavTraceT0 = t0;

  const dt = now - t0;

  // Intencionalmente simples: queremos logs determinísticos no Metro.
  if (typeof data === "undefined") {
    // eslint-disable-next-line no-console
    console.log(`[NavTrace +${dt}ms] ${event}`);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[NavTrace +${dt}ms] ${event}`, data);
}
