export function hexToRgba(input: string, alpha: number): string {
  const raw = String(input ?? "").trim();
  if (!raw) return `rgba(0,0,0,${alpha})`;

  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  const norm =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;

  if (norm.length !== 6) return `rgba(0,0,0,${alpha})`;

  const r = parseInt(norm.slice(0, 2), 16);
  const g = parseInt(norm.slice(2, 4), 16);
  const b = parseInt(norm.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return `rgba(0,0,0,${alpha})`;

  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${a})`;
}
