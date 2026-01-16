import { usePreferences } from "@/contexts/PreferencesContext";
import { getSaravafyBaseColor } from "@/src/theme";
import { Stack } from "expo-router";
import React from "react";

export default function TerreirosStackLayout() {
  const { effectiveTheme } = usePreferences();
  const baseBg = getSaravafyBaseColor(effectiveTheme);

  return (
    <Stack
      screenOptions={({ route }) => ({
        headerShown: false,
        // Avoid 1-frame bleed/overlap during transitions.
        contentStyle: { backgroundColor: baseBg },
        animation: "none",
        // Otimização (não requisito): tenta reduzir telas anteriores ainda montadas.
        detachPreviousScreen:
          route.name === "terreiro" || route.name === "collection/[id]",
      })}
    />
  );
}
