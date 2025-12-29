import { usePreferences } from "@/contexts/PreferencesContext";
import { RootPagerProvider } from "@/contexts/RootPagerContext";
import { AppHeaderWithPreferences } from "@/src/components/AppHeaderWithPreferences";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { colors } from "@/src/theme";
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
      <RootPagerProvider>
        {showGlobalHeader ? <AppHeaderWithPreferences /> : null}

        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "transparent" },
              // As telas ficam propositalmente sem background sólido para
              // deixar o SaravafyScreen aparecer (gradiente/textura).
              // Com animação de Stack, isso causa um frame onde a tela anterior
              // "vaza" por baixo durante transições. Desabilitamos a animação
              // globalmente para eliminar qualquer sobreposição visual.
              animation: "none",
            }}
          >
            <Stack.Screen name="index" />

            <Stack.Screen name="terreiro" />
            <Stack.Screen name="player" />
            <Stack.Screen name="collection/[id]" />

            <Stack.Screen
              name="terreiro-editor"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
                contentStyle: {
                  backgroundColor:
                    effectiveTheme === "light"
                      ? colors.paper50
                      : colors.forest900,
                },
              }}
            />
            <Stack.Screen
              name="access-manager"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
                contentStyle: {
                  backgroundColor:
                    effectiveTheme === "light"
                      ? colors.paper50
                      : colors.forest900,
                },
              }}
            />
          </Stack>
        </View>
      </RootPagerProvider>
    </SaravafyScreen>
  );
}
