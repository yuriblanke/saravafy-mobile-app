import type { ExpoConfig } from "expo/config";

/**
 * Build variant resolution (works locally + EAS)
 * Priority:
 * 1) APP_VARIANT
 * 2) EAS_BUILD_PROFILE
 * 3) production (default)
 */
const PROFILE =
  process.env.APP_VARIANT ?? process.env.EAS_BUILD_PROFILE ?? "production";

const IS_DEV_CLIENT = PROFILE === "dev" || PROFILE === "development";

const IOS_BUNDLE_ID = IS_DEV_CLIENT
  ? "com.yuriblanke.saravafy.dev"
  : "com.yuriblanke.saravafy";

const ANDROID_PACKAGE = IS_DEV_CLIENT
  ? "com.yuriblanke.saravafy.dev"
  : "com.yuriblanke.saravafy";

const config: ExpoConfig = {
  owner: "yuriblanke",
  name: IS_DEV_CLIENT ? "Saravafy Dev" : "Saravafy",
  slug: "saravafy",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/app-icon.png",
  scheme: "saravafy",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  splash: {
    image: "./assets/images/saravafy-splash-full-light.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
    dark: {
      image: "./assets/images/saravafy-splash-full-dark.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: IOS_BUNDLE_ID,
    buildNumber: "1",
  },

  android: {
    versionCode: 1,
    package: ANDROID_PACKAGE,
    icon: "./assets/images/app-icon.png",
    adaptiveIcon: {
      foregroundImage: "./assets/images/pre-adaptative-icon.png",
      backgroundColor: "#18443B",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },

  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/app-icon.png",
  },

  plugins: ["expo-router", "expo-dev-client"],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    router: {},
    eas: {
      projectId: "9483283e-1bc6-4a07-8433-ef7bf3db8f12",
    },
  },
};

export default config;
