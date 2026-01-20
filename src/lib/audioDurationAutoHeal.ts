type AutoHealEntry = {
  triedAtMs: number;
};

// Session-only (in-memory) cache to avoid repeating best-effort DB writes.
const DURATION_AUTO_HEAL_TRIED = new Map<string, AutoHealEntry>();

export function hasTriedDurationAutoHeal(pontoAudioId: string) {
  const id = String(pontoAudioId ?? "").trim();
  if (!id) return false;
  return DURATION_AUTO_HEAL_TRIED.has(id);
}

export function markDurationAutoHealTried(pontoAudioId: string) {
  const id = String(pontoAudioId ?? "").trim();
  if (!id) return;
  if (!DURATION_AUTO_HEAL_TRIED.has(id)) {
    DURATION_AUTO_HEAL_TRIED.set(id, { triedAtMs: Date.now() });
  }
}

export function shouldTryDurationAutoHeal(pontoAudioId: string) {
  return !hasTriedDurationAutoHeal(pontoAudioId);
}
