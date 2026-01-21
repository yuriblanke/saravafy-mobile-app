export function getInitials(value: string | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "?";

  const parts = raw
    .split(/\s+/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";

  return (first + last).toUpperCase();
}

export function getDisplayName(value: string | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "Você";

  // If it's an email, keep only the local-part.
  const at = raw.indexOf("@");
  if (at > 0) return raw.slice(0, at);

  return raw;
}
