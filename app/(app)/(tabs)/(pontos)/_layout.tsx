import { usePreferences } from "@/contexts/PreferencesContext";
import { getSaravafyBaseColor } from "@/src/theme";
import { Stack } from "expo-router";
import React from "react";

export default function PontosStackLayout() {
  const { effectiveTheme } = usePreferences();
  const baseColor = getSaravafyBaseColor(effectiveTheme);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // CRÍTICO: nunca transparente (evita bleed/overlap de 1 frame)
        contentStyle: { backgroundColor: baseColor },
        animation: "none",
      }}
    />
  );
}
