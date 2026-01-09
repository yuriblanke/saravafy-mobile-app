import { colors } from "./colors";

export type SaravafyTheme = "light" | "dark";

export function getSaravafyBaseColor(theme: SaravafyTheme) {
  return theme === "light" ? colors.paper50 : colors.forest900;
}
