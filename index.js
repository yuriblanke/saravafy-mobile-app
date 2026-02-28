// NOTE: Keep this file as CJS to guarantee execution order.
// With ESM, static imports are hoisted and can cause expo-router to run
// before registerPlaybackService, which breaks Android remote events.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TrackPlayer = require("react-native-track-player").default;

// Best-effort logging for unhandled promise rejections.
// React Native doesn't always surface these in Metro by default.
try {
  if (!globalThis.__SARAVAFY_UNHANDLED_REJECTION_LOGGER__) {
    Object.defineProperty(
      globalThis,
      "__SARAVAFY_UNHANDLED_REJECTION_LOGGER__",
      {
        value: true,
        enumerable: false,
        configurable: false,
        writable: false,
      },
    );

    globalThis.onunhandledrejection = (event) => {
      const reason = event?.reason ?? event;
      const message =
        reason &&
        typeof reason === "object" &&
        typeof reason.message === "string"
          ? reason.message
          : String(reason);
      const stack =
        reason && typeof reason === "object" && typeof reason.stack === "string"
          ? reason.stack
          : null;

      console.error("[UnhandledRejection]", message);
      if (stack) console.error(stack);
    };
  }
} catch (e) {
  // Ignore logger setup failures.
}

// Must be registered at startup for background/remote controls.
console.log("[RNTP] registerPlaybackService (entry)");
TrackPlayer.registerPlaybackService(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("./src/audio/playbackService").default;
});

// Load Expo Router entry AFTER the service registration.
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("expo-router/entry");
