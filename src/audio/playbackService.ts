import TrackPlayer, { Event, State } from "react-native-track-player";

import { log, error as logError } from "./debugLog";

console.log("[RNTP-SVC] module loaded");

function logRemote(name: string, extra?: unknown) {
  if (extra === undefined) {
    console.log(`RNTP_SVC_REMOTE ${name}`);
  } else {
    console.log(`RNTP_SVC_REMOTE ${name}`, extra);
  }
}

function getEvent(name: string): string | null {
  const v = (Event as any)?.[name];
  return typeof v === "string" && v.length > 0 ? v : null;
}

export default async function playbackService() {
  console.log("[RNTP-SVC] service entry called");

  const g = globalThis as any;
  g.__RNTP_NOTIF_PLAYBACK_SERVICE_STARTS__ =
    typeof g.__RNTP_NOTIF_PLAYBACK_SERVICE_STARTS__ === "number"
      ? g.__RNTP_NOTIF_PLAYBACK_SERVICE_STARTS__ + 1
      : 1;

  log("playbackService: up", {
    starts: g.__RNTP_NOTIF_PLAYBACK_SERVICE_STARTS__,
  });

  const registered = new Set<string>();
  const addListenerIfPresent = (eventName: string, fn: (event: any) => any) => {
    const e = getEvent(eventName);
    if (!e || registered.has(e)) return;
    registered.add(e);
    TrackPlayer.addEventListener(e as any, fn as any);
  };

  const safeGetState = async () => {
    try {
      return await TrackPlayer.getState();
    } catch (err) {
      logError("getState() error", err);
      return null;
    }
  };

  addListenerIfPresent("RemotePlay", async () => {
    logRemote("RemotePlay");
    log("event RemotePlay: received");
    try {
      await TrackPlayer.play();
    } catch (err) {
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

  addListenerIfPresent("RemotePause", async () => {
    logRemote("RemotePause");
    log("event RemotePause: received");
    try {
      await TrackPlayer.pause();
    } catch (err) {
      logError("event RemotePause: pause() error", err);
    }
  });

  addListenerIfPresent("RemoteStop", async () => {
    logRemote("RemoteStop");
    log("event RemoteStop: received");
    try {
      await TrackPlayer.stop();
      log("event RemoteStop: stop() resolved");
    } catch (err) {
      logError("event RemoteStop: stop() error", err);
    }
  });

  const toggle = async (source: string) => {
    logRemote(source);
    try {
      const state = await safeGetState();
      if (state === State.Playing) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    } catch (err) {
      logError(`${source}: toggle error`, err as any);
    }
  };

  // Some devices/OS versions dispatch a single toggle event.
  addListenerIfPresent("RemotePlayPause", async () => {
    await toggle("RemotePlayPause");
  });
  addListenerIfPresent("RemoteTogglePlayPause", async () => {
    await toggle("RemoteTogglePlayPause");
  });

  addListenerIfPresent("RemoteSeek", async (event) => {
    const position =
      typeof (event as any)?.position === "number"
        ? (event as any).position
        : 0;
    logRemote("RemoteSeek", { position });
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
  addListenerIfPresent("RemoteDuck", async (event) => {
    logRemote("RemoteDuck", {
      permanent: (event as any)?.permanent ?? null,
      paused: (event as any)?.paused ?? null,
      ducking: (event as any)?.ducking ?? null,
    });
  });

  addListenerIfPresent("RemoteJumpForward", async (event) => {
    logRemote("RemoteJumpForward", event ?? null);
  });

  addListenerIfPresent("RemoteJumpBackward", async (event) => {
    logRemote("RemoteJumpBackward", event ?? null);
  });

  addListenerIfPresent("RemoteNext", async () => {
    logRemote("RemoteNext");
    log("event RemoteNext: received");
    try {
      await TrackPlayer.skipToNext();
      log("event RemoteNext: skipToNext() resolved");
    } catch (err) {
      logError("event RemoteNext: skipToNext() error", err);
    }
  });

  addListenerIfPresent("RemotePrevious", async () => {
    logRemote("RemotePrevious");
    log("event RemotePrevious: received");
    try {
      await TrackPlayer.skipToPrevious();
      log("event RemotePrevious: skipToPrevious() resolved");
    } catch (err) {
      logError("event RemotePrevious: skipToPrevious() error", err);
    }
  });

  addListenerIfPresent("RemoteSkip", async () => {
    logRemote("RemoteSkip");
  });

  addListenerIfPresent("RemotePlayId", async (event) => {
    logRemote("RemotePlayId", event ?? null);
  });

  log("playbackService: handlers registered");
}
