import { useAuth } from "@/contexts/AuthContext";
import { GestureBlockProvider } from "@/contexts/GestureBlockContext";
import { GestureGateProvider } from "@/contexts/GestureGateContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useRootPagerOptional } from "@/contexts/RootPagerContext";
import {
  TabControllerProvider,
  useTabController,
} from "@/contexts/TabControllerContext";
import { SaravafyBackgroundLayers } from "@/src/components/SaravafyBackgroundLayers";
import { SaravafyLayoutMetricsProvider } from "@/src/contexts/SaravafyLayoutMetricsContext";
import { useRealtimeTerreiroScope } from "@/src/hooks/useRealtimeTerreiroScope";
import { useMyTerreiroIdsQuery } from "@/src/queries/me";
import { colors } from "@/src/theme";
import {
  Stack,
  useGlobalSearchParams,
  usePathname,
  useSegments,
} from "expo-router";
import React, { useMemo } from "react";
import {
  BackHandler,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";

function AndroidBackBehavior() {
  const pathname = usePathname();
  const tabController = useTabController();
  const segments = useSegments() as string[];

  const isInTabs = segments.includes("(tabs)");
  const activeTab: "pontos" | "terreiros" = segments.includes("(terreiros)")
    ? "terreiros"
    : "pontos";
  const isOnTabRoot =
    isInTabs &&
    (segments.length === 3 ||
      // fallback defensivo para diferenças de segmentação
      (segments.length > 0 &&
        (segments[segments.length - 1] === "(pontos)" ||
          segments[segments.length - 1] === "(terreiros)")));

  React.useEffect(() => {
    if (Platform.OS !== "android") return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      // Determinístico: no RootPager, se estiver em Terreiros,
      // o back físico volta para Pontos (Home).
      if (pathname === "/" && isOnTabRoot && activeTab === "terreiros") {
        if (__DEV__) {
          console.log("[AndroidBack] RootPager terreiros -> pontos");
        }
        tabController.goToTab("pontos");
        return true;
      }

      // Default: deixa o React Navigation/Expo Router lidar.
      return false;
    });

    return () => sub.remove();
  }, [activeTab, isOnTabRoot, pathname, tabController]);

  return null;
}

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
 * - contentStyle backgroundColor opaco no Stack para impedir transparência/overlap entre cenas
 */
export default function AppLayout() {
  const { effectiveTheme, selectedTerreiroFilterId } = usePreferences();
  const { user } = useAuth();
  const segments = useSegments() as string[];
  const pathname = usePathname();
  const rootPager = useRootPagerOptional();

  const isInTabs = segments.includes("(tabs)");
  const leaf = segments[segments.length - 1];
  const isTabRootLeaf =
    leaf === "(pontos)" ||
    leaf === "(terreiros)" ||
    // fallback defensivo para algumas segmentações
    leaf === "(tabs)" ||
    leaf === "index";

  // CADA scene desenha seu próprio fundo Saravafy (full-screen).
  // O layout global deve ficar sem "mega background".
  const isInTerreirosFlow = segments.includes("(terreiros)");

  const globalParams = useGlobalSearchParams<{
    terreiroId?: string;
  }>();

  const isTerreiroRoute = segments.includes("terreiro");
  const routeTerreiroId =
    isTerreiroRoute && typeof globalParams?.terreiroId === "string"
      ? globalParams.terreiroId
      : null;

  const scopeTerreiroId = routeTerreiroId ?? selectedTerreiroFilterId ?? null;

  const myUserId = user?.id ?? null;
  const myTerreirosQuery = useMyTerreiroIdsQuery(myUserId);
  const myTerreiroIds = myTerreirosQuery.data ?? [];

  useRealtimeTerreiroScope({
    scopeTerreiroId,
    myTerreiroIds,
    myUserId,
  });

  const isHeaderSuspended = useMemo(() => {
    // Mantém o componente montado para preservar o estado das Preferências,
    // mas suspende a UI (header + sheets) em telas full-screen/imersivas.
    const leaf = segments[segments.length - 1];
    return (
      leaf === "player" ||
      leaf === "edit" ||
      leaf === "preferences" ||
      leaf === "terreiro-members" ||
      leaf === "terreiro-members-list" ||
      leaf === "terreiro-member-profile" ||
      leaf === "access-manager" ||
      leaf === "terreiro-editor" ||
      segments.includes("review-submissions") ||
      // Player continua imersivo.
      (typeof pathname === "string" &&
        (pathname.startsWith("/player") ||
          pathname.startsWith("/preferences") ||
          pathname.startsWith("/terreiro-members") ||
          pathname.startsWith("/terreiro-members-list") ||
          pathname.startsWith("/terreiro-member-profile") ||
          pathname.startsWith("/access-manager") ||
          pathname.startsWith("/review-submissions")))
    );
  }, [pathname, segments]);

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={effectiveTheme === "light" ? "dark-content" : "light-content"}
        translucent={Platform.OS === "android"}
        backgroundColor={Platform.OS === "android" ? "transparent" : undefined}
      />

      <GestureGateProvider>
        <GestureBlockProvider>
          <TabControllerProvider>
            <AndroidBackBehavior />
            <SaravafyLayoutMetricsProvider>
              <View style={styles.stackWrap}>
                {/* Fundo Saravafy centralizado para todas as telas */}
                <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
                  <SaravafyBackgroundLayers theme={effectiveTheme} variant="tabs" />
                </View>
                
                <Stack
                  screenOptions={{
                    headerShown: false,
                    // Transparente: o fundo vem do layout acima.
                    contentStyle: { backgroundColor: "transparent" },
                    animation: "none",
                  }}
                >
                  {/* Tabs reais (Pontos ↔ Terreiros) com swipe + stacks por aba */}
                  <Stack.Screen name="(tabs)" />

                  {/* Player fora das tabs (swipe interno do player tem prioridade) */}
                  <Stack.Screen name="player" />

                  {/* Deep links / utilitários */}
                  <Stack.Screen name="l/[tipo]/[id]" />

                  {/* Full screens administrativas */}
                  <Stack.Screen
                    name="preferences"
                    options={{
                      contentStyle: {
                        backgroundColor:
                          effectiveTheme === "light"
                            ? colors.paper50
                            : colors.forest900,
                      },
                    }}
                  />
                  <Stack.Screen
                    name="terreiro-members"
                    options={{
                      contentStyle: {
                        backgroundColor:
                          effectiveTheme === "light"
                            ? colors.paper50
                            : colors.forest900,
                      },
                    }}
                  />
                  <Stack.Screen
                    name="terreiro-members-list"
                    options={{
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
                      contentStyle: {
                        backgroundColor:
                          effectiveTheme === "light"
                            ? colors.paper50
                            : colors.forest900,
                      },
                    }}
                  />

                  {/* Modais */}
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
                    name="review-submissions/[submissionId]"
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
                    name="ponto-audio-upload"
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
                    name="terreiro-member-profile"
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
            </SaravafyLayoutMetricsProvider>
          </TabControllerProvider>
        </GestureBlockProvider>
      </GestureGateProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "transparent",
  },
  stackWrap: {
    flex: 1,
  },
});
