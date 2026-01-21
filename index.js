// NOTE: Keep this file as CJS to guarantee execution order.
// With ESM, static imports are hoisted and can cause expo-router to run
// before registerPlaybackService, which breaks Android remote events.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TrackPlayer = require("react-native-track-player").default;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require("./src/audio/debugLog").default;

// Must be registered at startup for background/remote controls.
const servicePath = "./src/audio/playbackService";

if (
  __DEV__ &&
  globalThis.__RNTP_NOTIF_SERVICE_REGISTERED__ &&
  typeof globalThis.__RNTP_NOTIF_SERVICE_REGISTERED__ === "boolean"
) {
  debug.log("registerPlaybackService: already registered (skipping)", {
    servicePath,
  });
} else {
  if (__DEV__) globalThis.__RNTP_NOTIF_SERVICE_REGISTERED__ = true;

  debug.log("registerPlaybackService: start", { servicePath });
  TrackPlayer.registerPlaybackService(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(servicePath).default;
  });
  debug.log("registerPlaybackService: done", { servicePath });
}

// Load Expo Router entry AFTER the service registration.
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("expo-router/entry");
