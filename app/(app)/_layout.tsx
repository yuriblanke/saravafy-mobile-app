import { useAuth } from "@/contexts/AuthContext";
import { GestureBlockProvider } from "@/contexts/GestureBlockContext";
import { GestureGateProvider } from "@/contexts/GestureGateContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { RootPagerProvider } from "@/contexts/RootPagerContext";
import { TabControllerProvider } from "@/contexts/TabControllerContext";
import { AppHeaderWithPreferences } from "@/src/components/AppHeaderWithPreferences";
import { AppTabSwipeOverlay } from "@/src/components/AppTabSwipeOverlay";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { useRealtimeTerreiroScope } from "@/src/hooks/useRealtimeTerreiroScope";
import { useMyActiveTerreiroIdsQuery } from "@/src/queries/me";
import { colors } from "@/src/theme";
import { Stack, useSegments } from "expo-router";
import React, { useMemo } from "react";
import { View } from "react-native";

/**
 * AppLayout - Layout principal do grupo (app)
 *
 * RESPONSABILIDADES:
 * - Envolve todas as telas com SaravafyScreen (gradiente/textura de fundo)
 * - Renderiza AppHeaderWithPreferences globalmente (exceto em modais full-screen)
 * - Provê RootPagerContext para controle do swipe Pontos ↔ Terreiros
 * - Define Stack para navegação profunda (/player, /terreiro, /collection, etc.)
 *
 * DECISÕES DE DESIGN:
 * - animation: "none" no Stack para evitar "vazamento" visual do gradiente durante transições
 * - Header global aparece em todas as rotas exceto terreiro-editor e access-manager (modais)
 * - backgroundColor: "transparent" no Stack para deixar o SaravafyScreen aparecer
 */
export default function AppLayout() {
  const { effectiveTheme, activeContext } = usePreferences();
  const { user } = useAuth();
  const segments = useSegments();

  const activeTerreiroId =
    activeContext.kind === "TERREIRO_PAGE" ? activeContext.terreiroId : null;

  const myUserId = user?.id ?? null;
  const myTerreirosQuery = useMyActiveTerreiroIdsQuery(myUserId);
  const myTerreiroIds = myTerreirosQuery.data ?? [];

  useRealtimeTerreiroScope({
    activeTerreiroId,
    myTerreiroIds,
    myUserId,
  });

  const showGlobalHeader = useMemo(() => {
    // segments: ["(app)", "index" | "terreiro" | "player" | "collection" | ...]
    // Mostrar header APENAS em rotas principais (index, terreiro, collection)
    // OCULTAR em:
    // - player (modo imersivo)
    // - terreiro-editor (modal full-screen)
    // - access-manager (modal full-screen)
    const leaf = segments[1];
    return (
      leaf !== "player" &&
      leaf !== "terreiro-editor" &&
      leaf !== "access-manager"
    );
  }, [segments]);

  return (
    <SaravafyScreen variant={effectiveTheme}>
      <GestureGateProvider>
        <GestureBlockProvider>
          <RootPagerProvider>
            <TabControllerProvider>
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

                {/* Overlay global para swipe horizontal entre abas (topo real) */}
                <AppTabSwipeOverlay />
              </View>
            </TabControllerProvider>
          </RootPagerProvider>
        </GestureBlockProvider>
      </GestureGateProvider>
    </SaravafyScreen>
  );
}
