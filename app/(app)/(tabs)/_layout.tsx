import { useRootPagerOptional } from "@/contexts/RootPagerContext";
import { useTabController } from "@/contexts/TabControllerContext";
import { TabsHeaderWithPreferences } from "@/src/components/TabsHeaderWithPreferences";
import { navTrace } from "@/src/utils/navTrace";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  usePathname,
  useRouter,
  useSegments,
  withLayoutContext,
} from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

const { Navigator } = createMaterialTopTabNavigator();
const TopTabs = withLayoutContext(Navigator);

export default function AppTabsLayout() {
  const navigation = useNavigation<any>();
  const rootPager = useRootPagerOptional();
  const tabController = useTabController();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments() as string[];
  const segmentsKey = React.useMemo(() => segments.join("/"), [segments]);

  const routeInfoRef = useRef<{ pathname: string; segments: string }>({
    pathname,
    segments: segmentsKey,
  });

  useEffect(() => {
    routeInfoRef.current = { pathname, segments: segmentsKey };
  }, [pathname, segmentsKey]);

  useFocusEffect(
    useCallback(() => {
      navTrace("(tabs) focus", routeInfoRef.current);
      return () => navTrace("(tabs) blur", routeInfoRef.current);
    }, [])
  );

  useEffect(() => {
    if (!__DEV__) return;

    const parent = navigation.getParent?.();
    navTrace("(tabs) attach parent transition listeners", {
      hasParent: Boolean(parent),
    });

    if (!parent?.addListener) return;

    const subs = [
      parent.addListener("transitionStart", (e: any) => {
        navTrace("(stack parent) transitionStart", e?.data);
      }),
      parent.addListener("transitionEnd", (e: any) => {
        navTrace("(stack parent) transitionEnd", e?.data);
      }),
    ];

    return () => {
      for (const sub of subs) sub?.();
    };
  }, [navigation]);

  useEffect(() => {
    navTrace("(tabs) layout mount", { pathname, segments: segmentsKey });
    return () =>
      navTrace("(tabs) layout unmount", { pathname, segments: segmentsKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    navTrace("(tabs) layout route", { pathname, segments: segmentsKey });
  }, [pathname, segmentsKey]);

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
    <View style={styles.container}>
      <TabsHeaderWithPreferences />

      <TopTabs
        screenOptions={{
          swipeEnabled,
          // Transparente: cada scene desenha seu próprio fundo full-screen.
          sceneStyle: { backgroundColor: "transparent" },
        }}
        tabBar={tabBar}
      >
        <TopTabs.Screen name="(pontos)" options={{ title: "Pontos" }} />
        <TopTabs.Screen name="(terreiros)" options={{ title: "Terreiros" }} />
      </TopTabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
