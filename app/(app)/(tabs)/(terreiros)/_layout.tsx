import { usePreferences } from "@/contexts/PreferencesContext";
import { getSaravafyBaseColor } from "@/src/theme";
import { Stack } from "expo-router";
import React from "react";

export default function TerreirosStackLayout() {
  const { effectiveTheme } = usePreferences();
  const baseColor = getSaravafyBaseColor(effectiveTheme);

  return (
    <Stack
      screenOptions={({ route }) => ({
        headerShown: false,
        // CRÍTICO: cenas opacas desde o primeiro frame (nunca transparente)
        contentStyle: { backgroundColor: baseColor },
        animation: "none",
        // Otimização (não requisito): tenta reduzir telas anteriores ainda montadas.
        detachPreviousScreen:
          route.name === "terreiro" || route.name === "collection/[id]",
      })}
    />
  );
}
