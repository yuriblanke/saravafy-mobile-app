import React, { useCallback, useState } from "react";
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { CurimbaExplainerBottomSheet } from "@/src/components/CurimbaExplainerBottomSheet";
import { useGlobalSafeAreaInsets } from "@/src/contexts/GlobalSafeAreaInsetsContext";
import type { MyTerreiroWithRole } from "@/src/queries/me";
import { queryKeys } from "@/src/queries/queryKeys";
import { colors, spacing } from "@/src/theme";
import { setNavCoverVisible, useNavCoverState } from "@/src/utils/navCover";
import { navTrace } from "@/src/utils/navTrace";
import { useQueryClient } from "@tanstack/react-query";

import { CurimbaSection } from "./components/CurimbaSection";
import { LogoutSection } from "./components/LogoutSection";
import { PreferencesHeader } from "./components/PreferencesHeader";
import { ProfileSection } from "./components/ProfileSection";
import { TerreiroActionsSheet } from "./components/TerreiroActionsSheet";
import { TerreirosSection } from "./components/TerreirosSection";
import { ThemeSection } from "./components/ThemeSection";

export default function Preferences() {
  const queryClient = useQueryClient();
  const insets = useGlobalSafeAreaInsets();
  const navCover = useNavCoverState();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const normalizedUserEmail =
    typeof (user as any)?.email === "string"
      ? String((user as any).email)
          .trim()
          .toLowerCase()
      : null;
  const {
    effectiveTheme,
    curimbaOnboardingDismissed,
    setCurimbaOnboardingDismissed,
  } = usePreferences();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        userId
          ? queryClient.invalidateQueries({
              queryKey: queryKeys.preferences.terreiros(userId),
            })
          : Promise.resolve(),
        normalizedUserEmail
          ? queryClient.invalidateQueries({
              queryKey:
                queryKeys.terreiroInvites.pendingForInvitee(
                  normalizedUserEmail,
                ),
            })
          : Promise.resolve(),
        userId
          ? queryClient.invalidateQueries({
              queryKey: queryKeys.globalRoles.isCurator(userId),
            })
          : Promise.resolve(),
      ]);
    } catch (e) {
      if (__DEV__) {
        console.info("[Preferences] onRefresh unhandled", {
          userId,
          normalizedUserEmail,
          error: e instanceof Error ? e.message : String(e),
          raw: e,
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, normalizedUserEmail, queryClient, userId]);

  React.useEffect(() => {
    navTrace("Preferences UI mount");
    return () => navTrace("Preferences UI unmount");
  }, []);

  React.useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let raf3 = 0;

    raf1 = requestAnimationFrame(() => {
      navTrace("Preferences UI rAF 1");
      raf2 = requestAnimationFrame(() => {
        navTrace("Preferences UI rAF 2");
        raf3 = requestAnimationFrame(() => {
          navTrace("Preferences UI rAF 3");
        });
      });
    });

    return () => {
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      if (raf3) cancelAnimationFrame(raf3);
    };
  }, []);

  React.useLayoutEffect(() => {
    navTrace("Preferences UI layoutEffect commit");
  });

  const visualMarkersEnabled =
    __DEV__ &&
    (typeof globalThis.__saravafyDebugVisualMarkersEnabled === "boolean"
      ? globalThis.__saravafyDebugVisualMarkersEnabled
      : false);

  const coverEnabled =
    __DEV__ &&
    visualMarkersEnabled &&
    (typeof globalThis.__saravafyDebugPrefsCoverEnabled === "boolean"
      ? globalThis.__saravafyDebugPrefsCoverEnabled
      : true);
  const coverMs =
    __DEV__ && typeof globalThis.__saravafyDebugPrefsCoverMs === "number"
      ? globalThis.__saravafyDebugPrefsCoverMs
      : 500;

  const underlayPeekEnabled =
    __DEV__ &&
    visualMarkersEnabled &&
    (typeof globalThis.__saravafyDebugPrefsUnderlayPeekEnabled === "boolean"
      ? globalThis.__saravafyDebugPrefsUnderlayPeekEnabled
      : true);
  const underlayPeekMs =
    __DEV__ && typeof globalThis.__saravafyDebugPrefsUnderlayPeekMs === "number"
      ? globalThis.__saravafyDebugPrefsUnderlayPeekMs
      : 200;

  const stampEnabled =
    __DEV__ &&
    visualMarkersEnabled &&
    (typeof globalThis.__saravafyDebugPrefsStampEnabled === "boolean"
      ? globalThis.__saravafyDebugPrefsStampEnabled
      : true);
  const stampMs =
    __DEV__ && typeof globalThis.__saravafyDebugPrefsStampMs === "number"
      ? globalThis.__saravafyDebugPrefsStampMs
      : 500;

  const [debugCoverVisible, setDebugCoverVisible] = useState(
    __DEV__ ? coverEnabled : false,
  );
  const [debugUnderlayPeek, setDebugUnderlayPeek] = useState(false);
  const [debugStampVisible, setDebugStampVisible] = useState(
    __DEV__ ? stampEnabled : false,
  );
  const [debugStampHeight, setDebugStampHeight] = useState<number>(() => {
    if (!__DEV__) return 0;
    const h = globalThis.__saravafyDebugTabsHeaderHeight;
    return typeof h === "number" && Number.isFinite(h) && h > 0 ? h : 120;
  });

  React.useEffect(() => {
    if (!__DEV__) return;
    if (!visualMarkersEnabled) {
      setDebugStampVisible(false);
      return;
    }
    if (!stampEnabled) {
      setDebugStampVisible(false);
      navTrace("Preferences DEBUG stamp disabled");
      return;
    }

    // Captura a altura real do header verde (TabsHeader) se ela já tiver sido medida.
    // Como o Preferences pode montar antes do TabsHeader registrar onLayout, fazemos
    // um pequeno polling por alguns frames.
    let raf = 0;
    let remaining = 12;
    let lastLoggedHeight: number | null = null;
    const pump = () => {
      const h = globalThis.__saravafyDebugTabsHeaderHeight;
      if (typeof h === "number" && Number.isFinite(h) && h > 0) {
        setDebugStampHeight(h);
        if (lastLoggedHeight !== h) {
          lastLoggedHeight = h;
          navTrace("Preferences DEBUG stamp height update", { height: h });
        }
      }
      remaining -= 1;
      if (remaining > 0) raf = requestAnimationFrame(pump);
    };
    raf = requestAnimationFrame(pump);

    setDebugStampVisible(true);
    navTrace("Preferences DEBUG stamp show", {
      stampMs,
      initialHeight: debugStampHeight,
    });
    const t = setTimeout(() => {
      setDebugStampVisible(false);
      navTrace("Preferences DEBUG stamp hide");
    }, stampMs);
    return () => {
      clearTimeout(t);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [stampEnabled, stampMs]);

  React.useEffect(() => {
    if (!__DEV__) return;

    if (!visualMarkersEnabled) {
      setDebugCoverVisible(false);
      return;
    }

    if (!coverEnabled) {
      setDebugCoverVisible(false);
      navTrace("Preferences DEBUG cover disabled");
      return;
    }

    // Experimento: se o ghosting some quando cobrimos a tela nos primeiros ms,
    // então era "underlay revelado" (e não overlay acima do Stack).
    navTrace("Preferences DEBUG cover show");
    const t = setTimeout(() => {
      setDebugCoverVisible(false);
      navTrace("Preferences DEBUG cover hide");

      // Amplificação: logo após o cover sumir, deixamos o fundo do Preferences
      // transparente por alguns ms. Se existe underlay (tabs header) sendo
      // revelado durante o push, isso fica bem mais óbvio visualmente.
      if (underlayPeekEnabled) {
        setDebugUnderlayPeek(true);
        navTrace("Preferences DEBUG underlay peek on");
      }
    }, coverMs);

    const t2 = setTimeout(() => {
      if (underlayPeekEnabled) {
        setDebugUnderlayPeek(false);
        navTrace("Preferences DEBUG underlay peek off");
      }
    }, coverMs + underlayPeekMs);

    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, []);

  const variant: "light" | "dark" = effectiveTheme;
  const baseBgColor = variant === "light" ? colors.paper50 : colors.forest900;
  const screenBgColor =
    __DEV__ && debugUnderlayPeek ? "transparent" : baseBgColor;

  const didLayoutRef = React.useRef(false);
  const didHideCoverRef = React.useRef(false);

  const headerVisibleHeight = 52;
  const headerTotalHeight = headerVisibleHeight + (insets.top ?? 0);

  const maybeHideNavCover = React.useCallback(() => {
    if (didHideCoverRef.current) return;
    if (!navCover.visible) return;
    if (!didLayoutRef.current) return;

    // Só libera o Preferences quando o prewarm terminar.
    if (navCover.ready !== true) return;

    didHideCoverRef.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setNavCoverVisible(false, { reason: "preferences-ready" });
      });
    });
  }, [navCover.ready, navCover.visible]);

  React.useEffect(() => {
    // Se o layout já aconteceu e o prewarm terminar depois, libera aqui.
    maybeHideNavCover();
  }, [maybeHideNavCover]);

  const [terreiroActionsTarget, setTerreiroActionsTarget] =
    useState<MyTerreiroWithRole | null>(null);
  const [isCurimbaExplainerOpen, setIsCurimbaExplainerOpen] = useState(false);

  const openTerreiroActions = useCallback((terreiro: MyTerreiroWithRole) => {
    setTerreiroActionsTarget(terreiro);
  }, []);

  const closeTerreiroActions = useCallback(() => {
    setTerreiroActionsTarget(null);
  }, []);

  const handleEnabledCurimba = useCallback(() => {
    if (curimbaOnboardingDismissed) return;
    setIsCurimbaExplainerOpen(true);
  }, [curimbaOnboardingDismissed]);

  const closeCurimbaExplainer = useCallback(() => {
    setIsCurimbaExplainerOpen(false);
  }, []);

  return (
    <View
      style={[styles.screen, { backgroundColor: screenBgColor }]}
      onLayout={(e) => {
        navTrace("Preferences UI onLayout", {
          layout: e.nativeEvent.layout,
          baseBgColor,
          screenBgColor,
          variant,
        });

        didLayoutRef.current = true;
        maybeHideNavCover();
      }}
    >
      <PreferencesHeader variant={variant} />

      {__DEV__ && visualMarkersEnabled && debugStampVisible ? (
        <View
          pointerEvents="none"
          style={[
            styles.debugStampBar,
            {
              height: debugStampHeight,
            },
          ]}
        >
          <View style={styles.debugStampTopBar} />
          <View style={styles.debugStampBarContent}>
            <Text style={styles.debugStampBarText}>PREFERENCES</Text>
            <Text style={styles.debugStampBarSubtext}>DEBUG STAMP</Text>
          </View>
        </View>
      ) : null}

      {__DEV__ && visualMarkersEnabled ? (
        <Modal
          visible={debugCoverVisible}
          animationType="none"
          transparent={false}
          onRequestClose={() => setDebugCoverVisible(false)}
        >
          <View style={[StyleSheet.absoluteFillObject, styles.debugCover]} />
        </Modal>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerTotalHeight + spacing.lg,
            paddingBottom: (insets.bottom ?? 0) + spacing.xl,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.brass600}
            colors={[colors.brass600]}
          />
        }
      >
        <ProfileSection variant={variant} />
        <TerreirosSection
          variant={variant}
          onOpenActions={openTerreiroActions}
        />
        <ThemeSection variant={variant} />
        <CurimbaSection
          variant={variant}
          onEnabledCurimba={handleEnabledCurimba}
        />
        <LogoutSection variant={variant} />
      </ScrollView>

      <TerreiroActionsSheet
        variant={variant}
        target={terreiroActionsTarget}
        onClose={closeTerreiroActions}
      />

      <CurimbaExplainerBottomSheet
        visible={isCurimbaExplainerOpen}
        variant={variant}
        dontShowAgain={curimbaOnboardingDismissed}
        onChangeDontShowAgain={(next) => setCurimbaOnboardingDismissed(next)}
        onClose={closeCurimbaExplainer}
        context="preferences"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  debugCover: {
    backgroundColor: "#FF00FF",
  },
  debugStampBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: "#001A1A",
    zIndex: 9999,
  },
  debugStampTopBar: {
    height: 14,
    backgroundColor: "#00FFFF",
  },
  debugStampBarContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#001A1A",
  },
  debugStampBarText: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#00FFFF",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  debugStampBarSubtext: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "800",
    color: "#00FFFF",
  },
});
