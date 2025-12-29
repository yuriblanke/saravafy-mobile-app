import { useRootPager } from "@/contexts/RootPagerContext";
import Home from "@/src/screens/Home/Home";
import Terreiros from "@/src/screens/Terreiros/Terreiros";
import React, { useCallback, useMemo } from "react";
import { useWindowDimensions, View } from "react-native";
import { TabView } from "react-native-tab-view";
/**
 * RootPager - Navegação raiz do app (swipe horizontal Pontos ↔ Terreiros)
 *
 * ARQUITETURA:
 * - Este é o componente raiz dentro de `/(app)` que implementa swipe horizontal
 *   entre duas páginas: Pontos (Home) e Terreiros
 * - Usa `react-native-tab-view` com `renderTabBar={() => null}` (SEM tab bar visível)
 * - O controle do pager é feito via RootPagerContext (index/activeKey)
 * - AppHeaderWithPreferences controla qual página está ativa (NÃO troca rotas via router)
 * - Rotas profundas (/player, /terreiro, /collection/[id]) são Stack normal sem swipe
 *
 * IMPORTANTE:
 * - NÃO adicionar navegação via router.replace/push entre Pontos ↔ Terreiros
 * - NÃO criar tab bar visível (já existe controle no header)
 * - NÃO modificar a estrutura sem considerar o impacto em AppHeaderWithPreferences
 */ export default function RootPager() {
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
