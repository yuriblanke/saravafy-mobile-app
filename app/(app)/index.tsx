import { useRootPager } from "@/contexts/RootPagerContext";
import Home from "@/src/screens/Home/Home";
import Terreiros from "@/src/screens/Terreiros/Terreiros";
import React, { useCallback, useMemo } from "react";
import { useWindowDimensions, View } from "react-native";
import { TabView } from "react-native-tab-view";

export default function RootPager() {
  const ctx = useRootPager();
  const { width } = useWindowDimensions();

  const routes = useMemo(() => {
    return (
      ctx?.routes ??
      ([
        { key: "pontos", title: "Pontos" },
        { key: "terreiros", title: "Terreiros" },
      ] as const)
    );
  }, [ctx?.routes]);

  const renderScene = useCallback(({ route }: { route: { key: string } }) => {
    if (route.key === "pontos") return <Home />;
    if (route.key === "terreiros") return <Terreiros />;
    return <View />;
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <TabView
        navigationState={{ index: ctx?.index ?? 0, routes: routes as any }}
        onIndexChange={(next) => ctx?.setIndex(next)}
        initialLayout={{ width }}
        swipeEnabled
        renderTabBar={() => null}
        renderScene={renderScene as any}
      />
    </View>
  );
}
