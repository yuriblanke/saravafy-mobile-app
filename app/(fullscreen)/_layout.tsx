import { GestureBlockProvider } from "@/contexts/GestureBlockContext";
import { GestureGateProvider } from "@/contexts/GestureGateContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { Stack } from "expo-router";
import React from "react";

export default function FullscreenLayout() {
  const { effectiveTheme } = usePreferences();
  return (
    <SaravafyScreen theme={effectiveTheme} variant="focus">
      <GestureGateProvider>
        <GestureBlockProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "transparent" },
              animation: "fade",
            }}
          />
        </GestureBlockProvider>
      </GestureGateProvider>
    </SaravafyScreen>
  );
}
