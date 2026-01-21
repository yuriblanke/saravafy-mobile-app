import TrackPlayer, { Event, State } from "react-native-track-player";

import { log, error as logError } from "./debugLog";

export default async function playbackService() {
  const g = globalThis as any;
  g.__RNTP_NOTIF_PLAYBACK_SERVICE_STARTS__ =
    typeof g.__RNTP_NOTIF_PLAYBACK_SERVICE_STARTS__ === "number"
      ? g.__RNTP_NOTIF_PLAYBACK_SERVICE_STARTS__ + 1
      : 1;

  log("playbackService: up", {
    starts: g.__RNTP_NOTIF_PLAYBACK_SERVICE_STARTS__,
  });

  const maybeToggleEvent =
    (Event as any).RemoteTogglePlayPause ?? (Event as any).RemotePlayPause;

  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    log("event RemotePlay: received");
    try {
      const before = await TrackPlayer.getState();
      log("event RemotePlay: state before", { state: before });
      await TrackPlayer.play();
      const after = await TrackPlayer.getState();
      log("event RemotePlay: play() resolved", { state: after });
    } catch (err) {
      // Important: don't throw; keep service alive.
      logError("event RemotePlay: play() error", err);
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
    // This event is emitted from native regardless of whether RemotePlay/RemotePause are wired.
    log("event PlaybackState: received", {
      state: (event as any)?.state ?? null,
    });
  });

  TrackPlayer.addEventListener(Event.PlaybackPlayWhenReadyChanged, (event) => {
    log("event PlaybackPlayWhenReadyChanged: received", {
      playWhenReady: (event as any)?.playWhenReady ?? null,
    });
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    log("event RemotePause: received");
    try {
      const before = await TrackPlayer.getState();
      log("event RemotePause: state before", { state: before });
      await TrackPlayer.pause();
      const after = await TrackPlayer.getState();
      log("event RemotePause: pause() resolved", { state: after });
    } catch (err) {
      logError("event RemotePause: pause() error", err);
    }
  });

  if (typeof maybeToggleEvent === "string" && maybeToggleEvent.length > 0) {
    TrackPlayer.addEventListener(maybeToggleEvent as any, async () => {
      log("event RemoteTogglePlayPause: received");
      try {
        const state = await TrackPlayer.getState();
        log("event RemoteTogglePlayPause: state before", { state });
        if (state === State.Playing) {
          await TrackPlayer.pause();
        } else {
          await TrackPlayer.play();
        }
        const after = await TrackPlayer.getState();
        log("event RemoteTogglePlayPause: resolved", { state: after });
      } catch (err) {
        logError("event RemoteTogglePlayPause: error", err);
      }
    });
  }

  TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
    const position =
      typeof (event as any)?.position === "number"
        ? (event as any).position
        : 0;
    log("event RemoteSeek: received", { position });
    try {
      await TrackPlayer.seekTo(Math.max(0, position));
      log("event RemoteSeek: seekTo() resolved", { position });
    } catch (err) {
      logError("event RemoteSeek: seekTo() error", err);
    }
  });

  // Extra diagnostics: if Android is dispatching a different remote event than we expect.
  // Keep these as logs-only to avoid changing product behavior.
  TrackPlayer.addEventListener(Event.RemoteSkip, async () => {
    log("event RemoteSkip: received");
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    log("event RemoteNext: received");
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    log("event RemotePrevious: received");
  });

  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    log("event RemoteDuck: received", {
      permanent: (event as any)?.permanent ?? null,
      paused: (event as any)?.paused ?? null,
      ducking: (event as any)?.ducking ?? null,
    });
  });

  log("playbackService: handlers registered");
}
