import TrackPlayer, { Event, State } from "react-native-track-player";

import { error as logError, log } from "./debugLog";

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

  log("playbackService: handlers registered");
}
