import { useColorScheme as useSystemColorScheme } from "react-native";

import { usePreferences } from "@/contexts/PreferencesContext";

export function useColorScheme() {
  const system = useSystemColorScheme() ?? "light";
  const { themeMode } = usePreferences();

  if (themeMode === "system") return system;
  return themeMode;
}
