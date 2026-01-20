import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance, type ColorSchemeName } from "react-native";

import { colors } from "@/src/theme";

type ThemeMode = "system" | "light" | "dark";
type ThemeVariant = "light" | "dark";

const STORAGE_KEY_THEME_MODE = "@saravafy:themeMode";

function coerceThemeMode(value: unknown): ThemeMode | null {
  if (value === "system" || value === "light" || value === "dark") return value;
  return null;
}

function resolveThemeVariant(
  mode: ThemeMode,
  systemScheme: ColorSchemeName,
): ThemeVariant {
  if (mode === "light" || mode === "dark") return mode;
  return systemScheme === "light" ? "light" : "dark";
}

function hexToAndroidColorInt(hex: string): number | null {
  const raw = typeof hex === "string" ? hex.trim() : "";
  const m = /^#([0-9a-fA-F]{6})$/.exec(raw);
  if (!m) return null;
  return Number.parseInt(`FF${m[1]}`, 16);
}

export function getNotificationAccentColor(variant: ThemeVariant): number {
  const hex = variant === "light" ? colors.brass500 : colors.brass600;
  const parsed = hexToAndroidColorInt(hex);
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
}

export async function getNotificationAccentColorForCurrentTheme(): Promise<number> {
  const systemScheme = Appearance.getColorScheme();

  const stored = await AsyncStorage.getItem(STORAGE_KEY_THEME_MODE).catch(
    () => null,
  );
  const themeMode = coerceThemeMode(stored) ?? "system";

  const variant = resolveThemeVariant(themeMode, systemScheme);
  return getNotificationAccentColor(variant);
}
