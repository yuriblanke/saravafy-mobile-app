import { GestureBlockProvider } from "@/contexts/GestureBlockContext";
import { GestureGateProvider } from "@/contexts/GestureGateContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { colors } from "@/src/theme";
import { Stack } from "expo-router";
import React from "react";

export default function FullscreenLayout() {
  const { effectiveTheme } = usePreferences();

  const backgroundColor =
    effectiveTheme === "light" ? colors.paper50 : colors.forest900;

  return (
    <GestureGateProvider>
      <GestureBlockProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor },
            animation: "fade",
          }}
        />
      </GestureBlockProvider>
    </GestureGateProvider>
  );
}
