import type { ExpoConfig } from "expo/config";

const IS_DEV_CLIENT = process.env.EAS_BUILD_PROFILE === "development";

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
    bundleIdentifier: IS_DEV_CLIENT
      ? "com.yuriblanke.saravafymobileapp.dev"
      : "com.yuriblanke.saravafymobileapp",
    buildNumber: "1",
  },

  android: {
    versionCode: 1,
    package: IS_DEV_CLIENT
      ? "com.yuriblanke.saravafymobileapp.dev"
      : "com.yuriblanke.saravafymobileapp",
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
      projectId: "65076fb5-99e2-4d89-ae15-5fe91ceb8012",
    },
  },
};

export default config;
