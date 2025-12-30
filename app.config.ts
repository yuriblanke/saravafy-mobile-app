import type { ExpoConfig } from "expo/config";

/**
 * Identidade nativa (build-time)
 * Prioridade:
 * 1) EAS_BUILD_PROFILE (development | preview | production)
 * 2) APP_VARIANT (dev | preview | production)
 * 3) fallback final: production
 */
type CanonicalVariant = "dev" | "preview" | "production";

function variantFromEasBuildProfile(profile: string): CanonicalVariant {
  switch (profile) {
    case "development":
      return "dev";
    case "preview":
      return "preview";
    case "production":
      return "production";
    default:
      throw new Error(
        `[app.config] Invalid EAS_BUILD_PROFILE: "${profile}" (expected: development | preview | production)`
      );
  }
}

function variantFromAppVariant(value: string): CanonicalVariant {
  switch (value) {
    case "dev":
    case "preview":
    case "production":
      return value;
    // Compatibilidade com setups antigos; mantenha mapeamento determinístico.
    case "development":
      return "dev";
    default:
      throw new Error(
        `[app.config] Invalid APP_VARIANT: "${value}" (expected: dev | preview | production)`
      );
  }
}

const APP_VARIANT: CanonicalVariant = process.env.EAS_BUILD_PROFILE
  ? variantFromEasBuildProfile(process.env.EAS_BUILD_PROFILE)
  : process.env.APP_VARIANT
  ? variantFromAppVariant(process.env.APP_VARIANT)
  : "production";

const IS_DEV = APP_VARIANT === "dev";

const IOS_BUNDLE_ID = IS_DEV
  ? "com.yuriblanke.saravafy.dev"
  : "com.yuriblanke.saravafy";

const ANDROID_PACKAGE = IS_DEV
  ? "com.yuriblanke.saravafy.dev"
  : "com.yuriblanke.saravafy";

/**
 * Expo config
 */
const config: ExpoConfig = {
  owner: "yuriblanke",
  name: IS_DEV ? "Saravafy Dev" : "Saravafy",
  slug: "saravafy",
  version: "1.0.0",
  orientation: "portrait",

  scheme: "saravafy",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  icon: "./assets/images/app-icon.png",

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
    associatedDomains: ["applinks:saravafy.com.br"],
  },

  android: {
    package: ANDROID_PACKAGE,
    versionCode: 1,
    icon: "./assets/images/app-icon.png",
    adaptiveIcon: {
      foregroundImage: "./assets/images/pre-adaptative-icon.png",
      backgroundColor: "#18443B",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        category: ["BROWSABLE", "DEFAULT"],
        data: [
          {
            scheme: "https",
            host: "saravafy.com.br",
            pathPrefix: "/l",
          },
        ],
      },
    ],
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
    appVariant: APP_VARIANT, // ← fonte de verdade em runtime
    eas: {
      projectId: "9483283e-1bc6-4a07-8433-ef7bf3db8f12",
    },
  },
};

export default config;
