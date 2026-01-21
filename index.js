// NOTE: Keep this file as CJS to guarantee execution order.
// With ESM, static imports are hoisted and can cause expo-router to run
// before registerPlaybackService, which breaks Android remote events.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TrackPlayer = require("react-native-track-player").default;

// Must be registered at startup for background/remote controls.
console.log("[RNTP] registerPlaybackService (entry)");
TrackPlayer.registerPlaybackService(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("./src/audio/playbackService").default;
});

// Load Expo Router entry AFTER the service registration.
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("expo-router/entry");
