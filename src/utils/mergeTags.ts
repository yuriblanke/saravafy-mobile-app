export function normalizeTag(value: string): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function mergeCustomAndPointTags(
  customTags: readonly string[],
  pointTags: readonly string[]
): { custom: string[]; point: string[] } {
  // UX decision: if a tag exists (normalized) in both custom + point tags,
  // we hide the point tag to avoid duplicate chips; custom takes priority.
  const custom = Array.from(customTags ?? []).filter(Boolean);
  const normalizedCustom = new Set(custom.map(normalizeTag));

  const point = Array.from(pointTags ?? []).filter((t) => {
    const n = normalizeTag(t);
    if (!n) return false;
    return !normalizedCustom.has(n);
  });

  return { custom, point };
}
