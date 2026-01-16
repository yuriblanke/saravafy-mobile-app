import { useRootPagerOptional } from "@/contexts/RootPagerContext";
import { useTabController } from "@/contexts/TabControllerContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { getSaravafyBaseColor } from "@/src/theme";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useRouter, withLayoutContext } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";

const { Navigator } = createMaterialTopTabNavigator();
const TopTabs = withLayoutContext(Navigator);

export default function AppTabsLayout() {
  const rootPager = useRootPagerOptional();
  const tabController = useTabController();
  const router = useRouter();
  const { effectiveTheme } = usePreferences();

  const baseBg = getSaravafyBaseColor(effectiveTheme);

  const tabsNavigationRef = useRef<any>(null);

  const swipeEnabled = !(rootPager?.isBottomSheetOpen ?? false);

  const tabBar = useCallback((props: any) => {
    // Captura a navigation do *TopTabs* (não a do Stack pai).
    tabsNavigationRef.current = props?.navigation ?? null;
    return null;
  }, []);

  useEffect(() => {
    tabController.registerGoToTab((tab) => {
      const nav = tabsNavigationRef.current;
      if (nav?.navigate) {
        nav.navigate(tab === "terreiros" ? "(terreiros)" : "(pontos)");
        return;
      }

      // Fallback defensivo (não deveria acontecer em runtime normal).
      router.replace(
        (tab === "terreiros"
          ? "/(app)/(tabs)/(terreiros)"
          : "/(app)/(tabs)/(pontos)") as any
      );
    });

    return () => {
      tabController.registerGoToTab(null);
    };
  }, [router, tabController]);

  return (
    <TopTabs
      screenOptions={{
        swipeEnabled,
        // Avoid 1-frame bleed/overlap: tabs must paint an opaque background.
        sceneStyle: { backgroundColor: baseBg },
      }}
      tabBar={tabBar}
    >
      <TopTabs.Screen name="(pontos)" options={{ title: "Pontos" }} />
      <TopTabs.Screen name="(terreiros)" options={{ title: "Terreiros" }} />
    </TopTabs>
  );
}
