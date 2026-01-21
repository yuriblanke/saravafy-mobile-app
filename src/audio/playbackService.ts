import TrackPlayer, { Event, State } from "react-native-track-player";

export default async function playbackService() {
  console.log("[RNTP] playbackService up");

  const maybeToggleEvent =
    (Event as any).RemoteTogglePlayPause ?? (Event as any).RemotePlayPause;

  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log("[RNTP] RemotePlay");
    try {
      await TrackPlayer.play();
    } catch (error) {
      console.error("[RNTP] RemotePlay error", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log("[RNTP] RemotePause");
    try {
      await TrackPlayer.pause();
    } catch (error) {
      console.error("[RNTP] RemotePause error", error);
    }
  });

  if (typeof maybeToggleEvent === "string" && maybeToggleEvent.length > 0) {
    TrackPlayer.addEventListener(maybeToggleEvent as any, async () => {
      console.log("[RNTP] RemoteTogglePlayPause");
      try {
        const state = await TrackPlayer.getState();
        if (state === State.Playing) {
          await TrackPlayer.pause();
        } else {
          await TrackPlayer.play();
        }
      } catch (error) {
        console.error("[RNTP] RemoteTogglePlayPause error", error);
      }
    });
  }

  TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
    const position =
      typeof (event as any)?.position === "number"
        ? (event as any).position
        : 0;
    console.log("[RNTP] RemoteSeek", position);
    try {
      await TrackPlayer.seekTo(Math.max(0, position));
    } catch (error) {
      console.error("[RNTP] RemoteSeek error", error);
    }
  });
}
