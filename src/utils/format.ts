export function getInitials(
  value: string | null | undefined,
  fallback = "?"
): string {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  const base = raw.includes("@") ? raw.split("@")[0] : raw;
  const parts = base
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(" ")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function getDisplayName(
  value: string | undefined,
  fallback = "Você"
): string {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const at = raw.indexOf("@");
  if (at > 0) return raw.slice(0, at);
  return raw;
}

export function formatTimeAgo(isoString: string | null): string {
  if (!isoString) return "";

  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = Math.max(0, now - then);

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "agora";
  if (minutes === 1) return "1 minuto atrás";
  if (minutes < 60) return `${minutes} minutos atrás`;
  if (hours === 1) return "1 hora atrás";
  if (hours < 24) return `${hours} horas atrás`;
  if (days === 1) return "1 dia atrás";
  return `${days} dias atrás`;
}

export function normalizeEmail(value: string): string {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeSearch(value: string): string {
  return String(value ?? "").trim().toLowerCase();
}

export function onlyDigits(value: string): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizePhoneDigits(value: string, maxLength = 11): string {
  return onlyDigits(value).slice(0, maxLength);
}

// Returns the raw handle without @ prefix (callers add @ for display as needed).
export function normalizeInstagramHandle(input: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return "";

  const lower = raw.toLowerCase();
  const looksLikeUrl = lower.includes("instagram.com/");

  let handle = raw;
  if (looksLikeUrl) {
    try {
      const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      const parts = url.pathname.split("/").filter(Boolean);
      handle = parts[0] ?? "";
    } catch {
      // keep handle as-is
    }
  }

  handle = handle.replace(/^@+/, "").trim();
  if (!handle) return "";

  handle = handle.split(/\s+/)[0] ?? handle;
  handle = handle.replace(/[?#].*$/, "");

  return handle;
}

export function getLyricsPreview(lyrics: string, maxLines = 6): string {
  const lines = lyrics
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const preview = lines.slice(0, maxLines).join("\n");
  return lines.length > maxLines ? `${preview}\n…` : preview;
}
