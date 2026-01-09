import { GestureBlockProvider } from "@/contexts/GestureBlockContext";
import { GestureGateProvider } from "@/contexts/GestureGateContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { getSaravafyBaseColor } from "@/src/theme";
import { Stack } from "expo-router";
import React from "react";

export default function FullscreenLayout() {
  const { effectiveTheme } = usePreferences();
  const baseColor = getSaravafyBaseColor(effectiveTheme);
  return (
    <SaravafyScreen theme={effectiveTheme} variant="focus">
      <GestureGateProvider>
        <GestureBlockProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              // CRÍTICO: nunca transparente (evita bleed/overlap de 1 frame)
              contentStyle: { backgroundColor: baseColor },
              animation: "fade",
            }}
          />
        </GestureBlockProvider>
      </GestureGateProvider>
    </SaravafyScreen>
  );
}
