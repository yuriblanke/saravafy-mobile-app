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
import { BackHandler, Platform, View } from "react-native";

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
 * - backgroundColor: "transparent" no Stack para deixar o SaravafyScreen aparecer
 */
export default function AppLayout() {
  const { effectiveTheme, selectedTerreiroFilterId } = usePreferences();
  const { user } = useAuth();
  const segments = useSegments() as string[];
  const rootPager = useRootPagerOptional();

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
      leaf === "access-manager"
    );
  }, [segments]);

  return (
    <SaravafyScreen variant={effectiveTheme}>
      <GestureGateProvider>
        <GestureBlockProvider>
          <TabControllerProvider>
            <AndroidBackBehavior />
            <AppHeaderWithPreferences suspended={isHeaderSuspended} />

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
          </TabControllerProvider>
        </GestureBlockProvider>
      </GestureGateProvider>
    </SaravafyScreen>
  );
}
