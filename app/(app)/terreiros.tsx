import { useEffect } from "react";

import { useRootPager } from "@/contexts/RootPagerContext";

// Re-export da tela real de Terreiros
export { default } from "@/src/screens/Terreiros/Terreiros";

// Side effect: garantir que o RootPager aponte para "terreiros" ao entrar nesta rota
export function TerreirosRouteSetup() {
  const rootPager = useRootPager();

  useEffect(() => {
    console.log(
      "[Route] /(app)/terreiros -> screens/Terreiros, setActiveKey=terreiros"
    );
    if (rootPager.activeKey !== "terreiros") {
      rootPager.setActiveKey("terreiros");
    }
  }, [rootPager]);

  return null;
}
