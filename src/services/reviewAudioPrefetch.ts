import { Audio, type AVPlaybackStatus } from "expo-av";

import { getReviewPlaybackUrlEnsured } from "@/src/api/pontoAudio";

type PrefetchedReviewAudioEntry = {
  submissionId: string;
  url: string;
  expiresAtMs: number;
  sound: Audio.Sound;
};

const loadedBySubmissionId = new Map<string, PrefetchedReviewAudioEntry>();
const inFlightBySubmissionId = new Map<
  string,
  Promise<PrefetchedReviewAudioEntry>
>();

const cancelledBySubmissionId = new Set<string>();

function logDev(tag: string, payload: Record<string, unknown>) {
  if (!__DEV__) return;
  console.log(tag, payload);
}

async function unloadSoundSafe(sound: Audio.Sound) {
  try {
    await sound.stopAsync();
  } catch {
    // ignore
  }
  try {
    await sound.unloadAsync();
  } catch {
    // ignore
  }
}

async function ensurePrefetchedReviewAudioInternal(
  submissionId: string,
): Promise<PrefetchedReviewAudioEntry> {
  const sid = String(submissionId ?? "").trim();
  if (!sid) throw new Error("submissionId inválido.");

  const loaded = loadedBySubmissionId.get(sid);
  if (loaded) {
    logDev("[PERF][AUDIO_PREFETCH][SKIP_ALREADY_LOADED]", {
      submission_id: sid,
    });
    return loaded;
  }

  const inflight = inFlightBySubmissionId.get(sid);
  if (inflight) {
    logDev("[PERF][AUDIO_PREFETCH][INFLIGHT_REUSE]", {
      submission_id: sid,
    });
    return inflight;
  }

  const promise = (async () => {
    logDev("[PERF][AUDIO_PREFETCH][START]", { submission_id: sid });

    const urlStartMs = Date.now();
    const playback = await getReviewPlaybackUrlEnsured(sid);
    const urlMs = Date.now() - urlStartMs;

    logDev("[PERF][AUDIO_PREFETCH][URL_OK]", {
      submission_id: sid,
      ms: urlMs,
    });

    const url = playback.url;
    const expiresAtMs = playback.expiresAtMs;

    logDev("[PERF][AUDIO_PREFETCH][LOAD_START]", { submission_id: sid });

    const loadStartMs = Date.now();
    let sound: Audio.Sound | null = null;
    try {
      const created = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: false, progressUpdateIntervalMillis: 250 },
      );

      sound = created.sound;

      const loadMs = Date.now() - loadStartMs;
      logDev("[PERF][AUDIO_PREFETCH][LOAD_OK]", {
        submission_id: sid,
        ms: loadMs,
      });

      const entry: PrefetchedReviewAudioEntry = {
        submissionId: sid,
        url,
        expiresAtMs,
        sound,
      };

      if (cancelledBySubmissionId.has(sid)) {
        cancelledBySubmissionId.delete(sid);
        await unloadSoundSafe(sound);
        throw new Error("prefetch_cancelled");
      }

      loadedBySubmissionId.set(sid, entry);
      return entry;
    } catch (e) {
      if (sound) {
        await unloadSoundSafe(sound);
      }
      throw e;
    } finally {
      inFlightBySubmissionId.delete(sid);
    }
  })();

  inFlightBySubmissionId.set(sid, promise);
  return promise;
}

export function prefetchReviewFirstItemAudio(submissionId: string) {
  const sid = String(submissionId ?? "").trim();
  if (!sid) return;

  void ensurePrefetchedReviewAudioInternal(sid).catch(() => {
    // best-effort: errors handled by normal playback fallback
  });
}

export async function consumePrefetchedReviewFirstItemSound(params: {
  submissionId: string;
  onStatus?: ((status: AVPlaybackStatus) => void) | null;
}) {
  const sid = String(params.submissionId ?? "").trim();
  if (!sid) return null;

  const loaded = loadedBySubmissionId.get(sid);
  if (loaded) {
    loadedBySubmissionId.delete(sid);
    try {
      loaded.sound.setOnPlaybackStatusUpdate(params.onStatus ?? null);
    } catch {
      // ignore
    }
    return loaded;
  }

  const inflight = inFlightBySubmissionId.get(sid);
  if (inflight) {
    logDev("[PERF][AUDIO_PREFETCH][INFLIGHT_REUSE]", {
      submission_id: sid,
    });
    try {
      const entry = await inflight;
      if (!loadedBySubmissionId.has(sid)) {
        // It might have been consumed/unloaded while awaiting.
        return null;
      }
      loadedBySubmissionId.delete(sid);
      try {
        entry.sound.setOnPlaybackStatusUpdate(params.onStatus ?? null);
      } catch {
        // ignore
      }
      return entry;
    } catch {
      return null;
    }
  }

  return null;
}

export async function unloadPrefetchedReviewFirstItemAudio(
  submissionId: string,
) {
  const sid = String(submissionId ?? "").trim();
  if (!sid) return;

  cancelledBySubmissionId.add(sid);

  const loaded = loadedBySubmissionId.get(sid);
  if (!loaded) return;

  loadedBySubmissionId.delete(sid);

  logDev("[PERF][AUDIO][UNLOAD]", { submission_id: sid });
  await unloadSoundSafe(loaded.sound);
}
