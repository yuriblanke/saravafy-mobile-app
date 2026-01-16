import { usePreferences } from "@/contexts/PreferencesContext";
import { getSaravafyBaseColor } from "@/src/theme";
import { Stack } from "expo-router";
import React from "react";

export default function PontosStackLayout() {
  const { effectiveTheme } = usePreferences();
  const baseBg = getSaravafyBaseColor(effectiveTheme);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Avoid 1-frame bleed/overlap during transitions.
        contentStyle: { backgroundColor: baseBg },
        animation: "none",
      }}
    />
  );
}
