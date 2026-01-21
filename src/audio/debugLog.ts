type LogFn = (...args: any[]) => void;

type DebugApi = {
  getSessionId: () => string;
  log: LogFn;
  warn: LogFn;
  error: LogFn;
};

const PREFIX = "[RNTP-NOTIF]";
const SESSION_KEY = "__RNTP_NOTIF_SESSION_ID__";

type GlobalWithSession = typeof globalThis & { [SESSION_KEY]?: string };

function nowIso() {
  return new Date().toISOString();
}

export function getSessionId(): string {
  const g = globalThis as GlobalWithSession;
  if (typeof g[SESSION_KEY] === "string" && g[SESSION_KEY])
    return g[SESSION_KEY];

  const id = Math.random().toString(16).slice(2);
  g[SESSION_KEY] = id;
  return id;
}

function makeLog(kind: "log" | "warn" | "error"): LogFn {
  return (...args: any[]) => {
    if (!__DEV__) return;
    const id = getSessionId();
    // Keep the prefix as a standalone token for easy grep.
    // Example: [RNTP-NOTIF] 2026-01-20T12:34:56.789Z [abc123] msg
    (console as any)[kind](`${PREFIX} ${nowIso()} [${id}]`, ...args);
  };
}

export const log = makeLog("log");
export const warn = makeLog("warn");
export const error = makeLog("error");

const api: DebugApi = { getSessionId, log, warn, error };
export default api;
