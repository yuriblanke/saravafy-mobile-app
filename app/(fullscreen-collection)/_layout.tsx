import { GestureBlockProvider } from "@/contexts/GestureBlockContext";
import { GestureGateProvider } from "@/contexts/GestureGateContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { getSaravafyBaseColor } from "@/src/theme";
import { Stack } from "expo-router";
import React from "react";

export default function FullscreenCollectionLayout() {
  const { effectiveTheme } = usePreferences();
  const baseColor = getSaravafyBaseColor(effectiveTheme);

  return (
    // Coleção: queremos o topo totalmente "livre" (sem padding/scrim de safe-area)
    // e deixar o header absorver a altura do status bar/notch.
    <SaravafyScreen
      theme={effectiveTheme}
      variant="focus"
      edges={["bottom"]}
      safeAreaScrimEdges={["bottom"]}
    >
      <GestureGateProvider>
        <GestureBlockProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              // CRÍTICO: nunca transparente (evita bleed/overlap de 1 frame)
              contentStyle: { backgroundColor: baseColor },
              // Avoid cross-fade overlap with previous scene.
              animation: "none",
            }}
          />
        </GestureBlockProvider>
      </GestureGateProvider>
    </SaravafyScreen>
  );
}
