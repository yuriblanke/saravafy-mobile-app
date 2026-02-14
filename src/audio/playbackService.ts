import TrackPlayer, { Event } from "react-native-track-player";

function hhmmss() {
  try {
    return new Date().toISOString().slice(11, 19);
  } catch {
    return "";
  }
}

async function withTempNowPlayingArtist(tempArtist: string, ttlMs = 2500) {
  if (!__DEV__) return;
  try {
    const [activeIndex, active] = await Promise.all([
      TrackPlayer.getActiveTrackIndex().catch(() => undefined),
      TrackPlayer.getActiveTrack().catch(() => undefined),
    ]);

    const prevArtist =
      typeof (active as any)?.artist === "string" ? (active as any).artist : "";

    if (typeof activeIndex === "number" && Number.isFinite(activeIndex)) {
      await TrackPlayer.updateMetadataForTrack(activeIndex, {
        artist: tempArtist,
      } as any).catch(() => null);

      setTimeout(() => {
        void TrackPlayer.updateMetadataForTrack(activeIndex, {
          artist: prevArtist,
        } as any).catch(() => null);
      }, ttlMs);
      return;
    }

    // Fallback if we can't resolve a track index.
    await TrackPlayer.updateNowPlayingMetadata({ artist: tempArtist }).catch(
      () => null,
    );
    setTimeout(() => {
      void TrackPlayer.updateNowPlayingMetadata({ artist: prevArtist }).catch(
        () => null,
      );
    }, ttlMs);
  } catch {
    // ignore
  }
}

export default async function playbackService() {
  const g = globalThis as any;
  const prevSubs = Array.isArray(g.__saravafy_rntp_remote_controls_subs)
    ? (g.__saravafy_rntp_remote_controls_subs as any[])
    : null;

  if (prevSubs) {
    for (const sub of prevSubs) {
      try {
        sub?.remove?.();
      } catch {
        // ignore
      }
    }
  }

  const subs: any[] = [];
  g.__saravafy_rntp_remote_controls_subs = subs;

  console.log("[RNTP] playbackService up (remote controls enabled)");

  let lastRemoteActionAt = 0;
  const shouldIgnore = () => {
    const now = Date.now();
    if (now - lastRemoteActionAt < 600) return true;
    lastRemoteActionAt = now;
    return false;
  };

  const maybeToggleEvent =
    (Event as any).RemoteTogglePlayPause ?? (Event as any).RemotePlayPause;

  const toggleEvent =
    typeof maybeToggleEvent === "string" && maybeToggleEvent.length > 0
      ? maybeToggleEvent
      : null;

  console.log("[RNTP][REMOTE] strategy", {
    toggleEvent,
    fallback: toggleEvent ? null : "RemotePlay/RemotePause",
  });

  const markRemote = async (action: string) => {
    if (!__DEV__) return;
    try {
      const stamp = hhmmss();
      const msg = stamp ? `REMOTE ${action} @ ${stamp}` : `REMOTE ${action}`;
      await withTempNowPlayingArtist(msg);
    } catch {
      // ignore
    }
  };

  // Visual ping: confirm service boot + chosen strategy.
  if (__DEV__) {
    const stamp = hhmmss();
    const strategy = toggleEvent ? "toggle" : "play/pause";
    const msg = stamp
      ? `SERVICE UP (${strategy}) @ ${stamp}`
      : `SERVICE UP (${strategy})`;
    void withTempNowPlayingArtist(msg);
  }

  // Some Android/notification implementations can emit BOTH a toggle event and
  // the discrete play/pause events for a single tap. If we register both, we'll
  // toggle twice (pause then immediately play, or vice-versa).
  // So we pick ONE strategy:
  // - Prefer toggleEvent if available
  // - Otherwise use RemotePlay/RemotePause
  if (toggleEvent) {
    subs.push(
      TrackPlayer.addEventListener(toggleEvent as any, async () => {
        console.log("[RNTP][REMOTE] toggle received", { event: toggleEvent });
        if (shouldIgnore()) {
          console.log("[RNTP][REMOTE] toggle ignored (debounce)");
          return;
        }
        try {
          const playWhenReady = await TrackPlayer.getPlayWhenReady();
          console.log("[RNTP][REMOTE] toggle handling", { playWhenReady });
          if (playWhenReady) {
            await markRemote("pause");
            await TrackPlayer.pause();
            console.log("[RNTP][REMOTE] action", { action: "pause" });
          } else {
            await markRemote("play");
            await TrackPlayer.play();
            console.log("[RNTP][REMOTE] action", { action: "play" });
          }
        } catch (error) {
          console.error("[RNTP] RemoteTogglePlayPause error", error);
        }
      }),
    );
  } else {
    subs.push(
      TrackPlayer.addEventListener(Event.RemotePlay, async () => {
        console.log("[RNTP][REMOTE] RemotePlay received");
        if (shouldIgnore()) {
          console.log("[RNTP][REMOTE] RemotePlay ignored (debounce)");
          return;
        }
        try {
          await markRemote("play");
          await TrackPlayer.play();
          console.log("[RNTP][REMOTE] action", { action: "play" });
        } catch (error) {
          console.error("[RNTP] RemotePlay error", error);
        }
      }),
    );

    subs.push(
      TrackPlayer.addEventListener(Event.RemotePause, async () => {
        console.log("[RNTP][REMOTE] RemotePause received");
        if (shouldIgnore()) {
          console.log("[RNTP][REMOTE] RemotePause ignored (debounce)");
          return;
        }
        try {
          await markRemote("pause");
          await TrackPlayer.pause();
          console.log("[RNTP][REMOTE] action", { action: "pause" });
        } catch (error) {
          console.error("[RNTP] RemotePause error", error);
        }
      }),
    );
  }
}
