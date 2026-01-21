import TrackPlayer, {
  AppKilledPlaybackBehavior,
  RepeatMode,
  type Track,
} from "react-native-track-player";

import { getNotificationAccentColorForCurrentTheme } from "./notificationTheme";

let setupPromise: Promise<void> | null = null;
let optionsPromise: Promise<void> | null = null;

export type SaravafyTrack = {
  id: string;
  url: string;
  title: string;
  artist?: string | null;
  /** Seconds (RNTP expects seconds). */
  durationSeconds?: number | null;
};

export async function configureTrackPlayerOptions() {
  if (!optionsPromise) {
    optionsPromise = (async () => {
      const accentColor = await getNotificationAccentColorForCurrentTheme();
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior:
            AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        },
        color: accentColor,
        // Notification UI must be informational only (no remote controls).
        // This disables play/pause/seek actions in Android notification & lock screen.
        capabilities: [],
        notificationCapabilities: [],
        compactCapabilities: [],
        progressUpdateEventInterval: 1,
      });

      await TrackPlayer.setRepeatMode(RepeatMode.Off);
    })();
  }

  return optionsPromise;
}

export async function setupTrackPlayerOnce() {
  if (!setupPromise) {
    setupPromise = (async () => {
      await TrackPlayer.setupPlayer();
      await configureTrackPlayerOptions();
    })();
  }

  return setupPromise;
}

export async function resetAndLoadTrack(track: SaravafyTrack) {
  await setupTrackPlayerOnce();

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
    artwork: require("../../assets/images/filler.png"),
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
  await setupTrackPlayerOnce();
  await TrackPlayer.reset();
}

export async function resetAndStop() {
  await setupTrackPlayerOnce();
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
  await setupTrackPlayerOnce();
  await TrackPlayer.play();
}

export async function pause() {
  await setupTrackPlayerOnce();
  await TrackPlayer.pause();
}

export async function stop() {
  await setupTrackPlayerOnce();
  await TrackPlayer.stop();
}

export async function seekTo(seconds: number) {
  await setupTrackPlayerOnce();
  const s =
    typeof seconds === "number" && Number.isFinite(seconds) ? seconds : 0;
  await TrackPlayer.seekTo(Math.max(0, s));
}
