import TrackPlayer, {
  RepeatMode,
  type Track,
} from "react-native-track-player";

let setupPromise: Promise<void> | null = null;

async function isNativeTrackPlayerInitialized(): Promise<boolean> {
  try {
    await TrackPlayer.getState();
    return true;
  } catch {
    return false;
  }
}

export type SaravafyTrack = {
  id: string;
  url: string;
  title: string;
  artist?: string | null;
  /** Seconds (RNTP expects seconds). */
  durationSeconds?: number | null;
};

export async function ensureTrackPlayerReady() {
  if (!setupPromise) {
    setupPromise = (async () => {
      const alreadyInitialized = await isNativeTrackPlayerInitialized();
      
      if (!alreadyInitialized) {
        await TrackPlayer.setupPlayer();
      }

      await TrackPlayer.setRepeatMode(RepeatMode.Off);
    })();
  }

  return setupPromise;
}

// Back-compat: keep older API name used by other modules.
export async function setupTrackPlayerOnce() {
  return ensureTrackPlayerReady();
}

export async function resetAndLoadTrack(track: SaravafyTrack) {
  await ensureTrackPlayerReady();

  const id = String(track.id ?? "").trim();
  const url = String(track.url ?? "").trim();
  const title = String(track.title ?? "").trim();

  if (!id || !url || !title) {
    throw new Error("Track inválida.");
  }

  const duration =
    typeof track.durationSeconds === "number" &&
    Number.isFinite(track.durationSeconds) &&
    track.durationSeconds > 0
      ? track.durationSeconds
      : undefined;

  const payload: Track = {
    id,
    url,
    title,
    artist:
      typeof track.artist === "string" && track.artist.trim()
        ? track.artist.trim()
        : undefined,
    duration,
  };

  await TrackPlayer.reset();
  await TrackPlayer.add([payload]);
}

export async function reset() {
  await ensureTrackPlayerReady();
  await TrackPlayer.reset();
}

export async function resetAndStop() {
  await ensureTrackPlayerReady();
  try {
    await TrackPlayer.stop();
  } catch {
    // ignore
  }
  try {
    await TrackPlayer.reset();
  } catch {
    // ignore
  }
}

export async function play() {
  await ensureTrackPlayerReady();
  await TrackPlayer.play();
}

export async function pause() {
  await ensureTrackPlayerReady();
  await TrackPlayer.pause();
}

export async function stop() {
  await ensureTrackPlayerReady();
  await TrackPlayer.stop();
}

export async function seekTo(seconds: number) {
  await ensureTrackPlayerReady();
  const s =
    typeof seconds === "number" && Number.isFinite(seconds) ? seconds : 0;
  await TrackPlayer.seekTo(Math.max(0, s));
}
