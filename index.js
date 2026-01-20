import TrackPlayer from "react-native-track-player";

// Must be registered at startup for background/remote controls.
TrackPlayer.registerPlaybackService(
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("./src/audio/playbackService").default,
);

import "expo-router/entry";
