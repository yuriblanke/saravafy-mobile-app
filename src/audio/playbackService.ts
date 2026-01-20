import TrackPlayer, { Event, State } from "react-native-track-player";

export default async function playbackService() {
  const maybeToggleEvent =
    (Event as any).RemoteTogglePlayPause ?? (Event as any).RemotePlayPause;

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    void TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    void TrackPlayer.pause();
  });

  if (typeof maybeToggleEvent === "string" && maybeToggleEvent.length > 0) {
    TrackPlayer.addEventListener(maybeToggleEvent as any, async () => {
      try {
        const state = await TrackPlayer.getState();
        if (state === State.Playing) {
          await TrackPlayer.pause();
        } else {
          await TrackPlayer.play();
        }
      } catch {
        // Best effort; ignore.
      }
    });
  }

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    const position =
      typeof (event as any)?.position === "number"
        ? (event as any).position
        : 0;
    void TrackPlayer.seekTo(Math.max(0, position));
  });
}
