import { useAuth } from "@/contexts/AuthContext";
import { GestureBlockProvider } from "@/contexts/GestureBlockContext";
import { GestureGateProvider } from "@/contexts/GestureGateContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useRootPagerOptional } from "@/contexts/RootPagerContext";
import {
  TabControllerProvider,
  useTabController,
} from "@/contexts/TabControllerContext";
import { AppHeaderWithPreferences } from "@/src/components/AppHeaderWithPreferences";
import { SaravafyScreen } from "@/src/components/SaravafyScreen";
import { SaravafyBackgroundLayers } from "@/src/components/SaravafyBackgroundLayers";
import {
  SaravafyLayoutMetricsProvider,
  useSaravafyLayoutMetrics,
} from "@/src/contexts/SaravafyLayoutMetricsContext";
import { useRealtimeTerreiroScope } from "@/src/hooks/useRealtimeTerreiroScope";
import { useMyTerreiroIdsQuery } from "@/src/queries/me";
import { colors, getSaravafyBaseColor } from "@/src/theme";
import {
  Stack,
  useGlobalSearchParams,
  usePathname,
  useSegments,
} from "expo-router";
import React, { useMemo } from "react";
import { BackHandler, Platform, StyleSheet, View } from "react-native";

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

  // Regra: tabs no root das abas; stack nas telas empilhadas.
  // O header global é transparente, então o fundo precisa ser compartilhado
  // entre header e body.
  const backgroundVariant: "tabs" | "stack" =
    isInTabs && isTabRootLeaf ? "tabs" : "stack";

  // Fluxo de Terreiros: o fundo global deve ser "flat" (só baseColor opaco),
  // deixando o fundo Saravafy completo ser responsabilidade das cenas.
  const isInTerreirosFlow = segments.includes("(terreiros)");
  const saravafyVariant: "tabs" | "stack" | "focus" = isInTerreirosFlow
    ? "focus"
    : backgroundVariant;

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
      leaf === "terreiro-editor" ||
      leaf === "access-manager" ||
      // Player continua imersivo.
      (typeof pathname === "string" && pathname.startsWith("/player"))
    );
  }, [pathname, segments]);

  const baseColor = getSaravafyBaseColor(effectiveTheme);

  return (
    <SaravafyScreen theme={effectiveTheme} variant={saravafyVariant}>
      <GestureGateProvider>
        <GestureBlockProvider>
          <TabControllerProvider>
            <AndroidBackBehavior />
            <SaravafyLayoutMetricsProvider>
              <HeaderMeasurer
                suspended={isHeaderSuspended}
                theme={effectiveTheme}
                showTerreirosBackground={isInTerreirosFlow}
                terreirosBackgroundVariant={
                  isInTabs && isTabRootLeaf ? "tabs" : "stack"
                }
              />

              <View style={{ flex: 1 }}>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    // CRÍTICO: cenas opacas desde o primeiro frame (nunca transparente)
                    contentStyle: { backgroundColor: baseColor },
                    animation: "none",
                  }}
                >
                  {/* Tabs reais (Pontos ↔ Terreiros) com swipe + stacks por aba */}
                  <Stack.Screen name="(tabs)" />

                  {/* Player fora das tabs (swipe interno do player tem prioridade) */}
                  <Stack.Screen name="player" />

                  {/* Deep links / utilitários */}
                  <Stack.Screen name="l/[tipo]/[id]" />

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
            </SaravafyLayoutMetricsProvider>
          </TabControllerProvider>
        </GestureBlockProvider>
      </GestureGateProvider>
    </SaravafyScreen>
  );
}

function HeaderMeasurer({
  suspended,
  theme,
  showTerreirosBackground,
  terreirosBackgroundVariant,
}: {
  suspended: boolean;
  theme: "light" | "dark";
  showTerreirosBackground: boolean;
  terreirosBackgroundVariant: "tabs" | "stack";
}) {
  const { setHeaderHeight } = useSaravafyLayoutMetrics();

  return (
    <View
      style={styles.headerWrap}
      onLayout={(e) => {
        setHeaderHeight(e.nativeEvent.layout.height);
      }}
    >
      {showTerreirosBackground ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <SaravafyBackgroundLayers
            theme={theme}
            variant={terreirosBackgroundVariant}
          />
        </View>
      ) : null}

      <AppHeaderWithPreferences suspended={suspended} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    position: "relative",
    zIndex: 10,
    elevation: 10,
    overflow: "hidden",
  },
});
