import { usePreferences } from "@/contexts/PreferencesContext";
import { AppHeaderWithPreferences } from "@/src/components/AppHeaderWithPreferences";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { Stack, useSegments } from "expo-router";
import React, { useMemo } from "react";
import { View } from "react-native";

export default function AppLayout() {
  const { effectiveTheme } = usePreferences();
  const segments = useSegments();

  const showGlobalHeader = useMemo(() => {
    // segments: ["(app)", "home" | "terreiro" | "collection" | ...]
    const leaf = segments[1];
    return leaf !== "terreiro-editor" && leaf !== "access-manager";
  }, [segments]);

  return (
    <SaravafyScreen variant={effectiveTheme}>
      {showGlobalHeader ? <AppHeaderWithPreferences /> : null}

      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="home" />
          <Stack.Screen name="terreiro" />
          <Stack.Screen name="terreiros" />
          <Stack.Screen
            name="terreiro-editor"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="access-manager"
            options={{ presentation: "modal" }}
          />
        </Stack>
      </View>
    </SaravafyScreen>
  );
}
