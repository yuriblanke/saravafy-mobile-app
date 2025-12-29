import { useEffect } from "react";

import { useRootPager } from "@/contexts/RootPagerContext";

// Re-export da tela real de Home (Pontos)
export { default } from "@/src/screens/Home/Home";

// Side effect: garantir que o RootPager aponte para "pontos" ao entrar nesta rota
export function HomeRouteSetup() {
  const rootPager = useRootPager();

  useEffect(() => {
    console.log("[Route] /(app)/home -> screens/Home, setActiveKey=pontos");
    if (rootPager.activeKey !== "pontos") {
      rootPager.setActiveKey("pontos");
    }
  }, [rootPager]);

  return null;
}
