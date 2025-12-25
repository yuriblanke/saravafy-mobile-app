import { Platform } from "react-native";

export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 4 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.34,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 8 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.42,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 16 },
    },
    android: { elevation: 14 },
    default: {},
  }),
} as const;

export type SaravafyShadows = typeof shadows;
