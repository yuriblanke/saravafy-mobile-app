import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
  type Track,
} from "react-native-track-player";

import { error, log, warn } from "./debugLog";
import { getNotificationAccentColorForCurrentTheme } from "./notificationTheme";

let setupPromise: Promise<void> | null = null;
let optionsPromise: Promise<void> | null = null;

let mainRuntimeDebugListenersRegistered = false;

function isNumericKey(key: string): boolean {
  // TS enums emit reverse mappings as numeric string keys (e.g., "0": "Play").
  return String(Number(key)) === key;
}

function capabilityValueToNames(value: number): string[] {
  const names: string[] = [];
  for (const [key, v] of Object.entries(Capability as any)) {
    if (isNumericKey(key)) continue;
    if (typeof v === "number" && v === value) names.push(key);
  }
  return names;
}

function capabilityLabel(cap: any): string {
  if (typeof cap === "string") return cap;
  if (typeof cap === "number") {
    const names = capabilityValueToNames(cap);
    if (names.length === 1) return names[0];
    if (names.length > 1) return `${names.join("|")} (dup:${cap})`;
    return String(cap);
  }
  return String(cap);
}

function describeCapabilities(caps: any): string[] {
  if (!Array.isArray(caps)) return [];
  return caps.map(capabilityLabel);
}

function validateCapabilities(options: {
  capabilities?: any;
  compactCapabilities?: any;
  notificationCapabilities?: any;
}) {
  const caps = Array.isArray(options.capabilities) ? options.capabilities : [];
  const compact = Array.isArray(options.compactCapabilities)
    ? options.compactCapabilities
    : [];
  const notif = Array.isArray(options.notificationCapabilities)
    ? options.notificationCapabilities
    : caps;

  const hasPlay = (list: any[]) => list.includes(Capability.Play);
  const hasPause = (list: any[]) => list.includes(Capability.Pause);

  const missing: string[] = [];
  if (!hasPlay(caps) || !hasPause(caps)) missing.push("capabilities");
  if (!hasPlay(compact) || !hasPause(compact))
    missing.push("compactCapabilities");
  if (!hasPlay(notif) || !hasPause(notif))
    missing.push("notificationCapabilities");

  if (missing.length > 0) {
    warn("capabilities validation: FAIL", {
      missing,
      capabilities: describeCapabilities(caps),
      compactCapabilities: describeCapabilities(compact),
      notificationCapabilities: describeCapabilities(notif),
    });
  } else {
    log("capabilities validation: ok", {
      capabilities: describeCapabilities(caps),
      compactCapabilities: describeCapabilities(compact),
      notificationCapabilities: describeCapabilities(notif),
    });
  }
}

function registerMainRuntimeDebugListenersOnce() {
  if (!__DEV__ || mainRuntimeDebugListenersRegistered) return;
  mainRuntimeDebugListenersRegistered = true;

  log("main runtime: registering debug remote listeners");

  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    log("main runtime: Event.RemotePlay received");
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    log("main runtime: Event.RemotePause received");
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    const position =
      typeof (event as any)?.position === "number"
        ? (event as any).position
        : null;
    log("main runtime: Event.RemoteSeek received", { position });
  });

  TrackPlayer.addEventListener(Event.RemoteSkip, async () => {
    log("main runtime: Event.RemoteSkip received");
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    log("main runtime: Event.RemoteNext received");
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    log("main runtime: Event.RemotePrevious received");
  });

  TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
    log("main runtime: Event.PlaybackState received", {
      state: (event as any)?.state ?? null,
    });
  });

  TrackPlayer.addEventListener(Event.PlaybackPlayWhenReadyChanged, (event) => {
    log("main runtime: Event.PlaybackPlayWhenReadyChanged received", {
      playWhenReady: (event as any)?.playWhenReady ?? null,
    });
  });
}

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
      log("updateOptions: start", {
        callerTag: "trackPlayer.configureTrackPlayerOptions",
      });

      const accentColor = await getNotificationAccentColorForCurrentTheme();

      const maybePlayPause = (Capability as any).PlayPause;
      const playPauseCap =
        typeof maybePlayPause === "number" ? maybePlayPause : null;

      if (__DEV__ && playPauseCap == null) {
        warn("Capability.PlayPause not available in this RNTP build");
      }

      const options = {
        android: {
          appKilledPlaybackBehavior:
            AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        },
        color: accentColor,
        capabilities: [
          Capability.Play,
          Capability.Pause,
          ...(playPauseCap == null ? [] : [playPauseCap]),
          Capability.SeekTo,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          ...(playPauseCap == null ? [] : [playPauseCap]),
          Capability.SeekTo,
        ],
        compactCapabilities:
          playPauseCap == null
            ? [Capability.Play, Capability.Pause]
            : [playPauseCap],
        progressUpdateEventInterval: 1,
      };

      if (__DEV__) {
        log("updateOptions: payload", {
          callerTag: "trackPlayer.configureTrackPlayerOptions",
          android: {
            appKilledPlaybackBehavior: String(
              (options as any)?.android?.appKilledPlaybackBehavior,
            ),
          },
          color: options.color,
          capabilityValues: {
            Play: Capability.Play,
            Pause: Capability.Pause,
            PlayPause: playPauseCap,
            SeekTo: Capability.SeekTo,
          },
          raw: {
            capabilities: options.capabilities,
            compactCapabilities: options.compactCapabilities,
            notificationCapabilities: options.notificationCapabilities,
          },
          capabilities: describeCapabilities(options.capabilities),
          compactCapabilities: describeCapabilities(
            options.compactCapabilities,
          ),
          notificationCapabilities: describeCapabilities(
            options.notificationCapabilities,
          ),
        });
      }

      validateCapabilities(options);

      await TrackPlayer.updateOptions(options);
      log("updateOptions: done", {
        callerTag: "trackPlayer.configureTrackPlayerOptions",
      });

      await TrackPlayer.setRepeatMode(RepeatMode.Off);
    })();
  } else {
    log("updateOptions: already in-flight (skipping)");
  }

  return optionsPromise;
}

export async function setupTrackPlayerOnce() {
  if (!setupPromise) {
    setupPromise = (async () => {
      log("setupPlayer: start", {
        callerTag: "trackPlayer.setupTrackPlayerOnce",
      });
      await TrackPlayer.setupPlayer();
      log("setupPlayer: done", {
        callerTag: "trackPlayer.setupTrackPlayerOnce",
      });

      await configureTrackPlayerOptions();

      registerMainRuntimeDebugListenersOnce();
    })();
  } else {
    log("setupPlayer: already in-flight (skipping)");
  }

  return setupPromise;
}

export async function resetAndLoadTrack(track: SaravafyTrack) {
  await setupTrackPlayerOnce();

  log("resetAndLoadTrack: start", {
    id: String(track?.id ?? ""),
    title: String(track?.title ?? ""),
  });

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

  log("resetAndLoadTrack: done", {
    id: payload.id,
    title: payload.title,
  });
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
  log("play(): start");
  try {
    await TrackPlayer.play();
    log("play(): done");
  } catch (e) {
    error("play(): error", e);
    throw e;
  }
}

export async function pause() {
  await setupTrackPlayerOnce();
  log("pause(): start");
  try {
    await TrackPlayer.pause();
    log("pause(): done");
  } catch (e) {
    error("pause(): error", e);
    throw e;
  }
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
