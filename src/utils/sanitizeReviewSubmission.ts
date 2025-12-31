export function sanitizeOptionalText(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  return v ? v : null;
}

export function sanitizeRequiredText(value: unknown): string {
  const v = typeof value === "string" ? value.trim() : "";
  return v;
}

export function normalizeTagsFromText(value: unknown): string[] {
  const raw = typeof value === "string" ? value : "";
  const parts = raw
    .split(/[,|]/g)
    .map((t) => t.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];

  for (const tag of parts) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }

  return out;
}

export function normalizeTagsArray(value: unknown): string[] {
  const arr = Array.isArray(value) ? value : [];
  const parts = arr
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];

  for (const tag of parts) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }

  return out;
}
