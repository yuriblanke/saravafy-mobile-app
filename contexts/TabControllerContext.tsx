import {
  useRootPager,
  type RootPagerTabKey,
} from "@/contexts/RootPagerContext";
import { useGlobalSearchParams, usePathname } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

export type TabKey = RootPagerTabKey;

type GoToTabFn = (tab: TabKey) => void;

type TabControllerContextValue = {
  /**
   * Solicita troca de aba (Pontos ↔ Terreiros).
   * Implementação pode ser registrada pelo RootPager para garantir sincronização.
   */
  goToTab: (tab: TabKey) => void;

  /**
   * Último href conhecido para cada aba (inclui query string quando disponível).
   */
  getLastHrefForTab: (tab: TabKey) => string;

  /**
   * Permite ao RootPager registrar o handler real de troca de aba.
   */
  registerGoToTab: (fn: GoToTabFn | null) => void;
};

const TabControllerContext = createContext<TabControllerContextValue | null>(
  null
);

function inferTabFromPathname(pathname: string): TabKey {
  // Mesma heurística do header: rotas de terreiro/collection pertencem ao mundo "Terreiros".
  if (
    typeof pathname === "string" &&
    (pathname.startsWith("/terreiro") || pathname.startsWith("/collection"))
  ) {
    return "terreiros";
  }
  return "pontos";
}

function buildHref(pathname: string, params: Record<string, unknown>): string {
  const base = typeof pathname === "string" && pathname.length ? pathname : "/";

  const usp = new URLSearchParams();
  const entries = Object.entries(params ?? {}).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  for (const [key, value] of entries) {
    if (value == null) continue;

    if (Array.isArray(value)) {
      for (const v of value) {
        if (v == null) continue;
        const s = String(v);
        if (!s) continue;
        usp.append(key, s);
      }
      continue;
    }

    const s = String(value);
    if (!s) continue;
    usp.set(key, s);
  }

  const qs = usp.toString();
  return qs ? `${base}?${qs}` : base;
}

export function TabControllerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const rootPager = useRootPager();
  const pathname = usePathname();
  const searchParams = useGlobalSearchParams();

  const goToTabRef = useRef<GoToTabFn | null>(null);

  const lastHrefPontosRef = useRef<string>("/");
  const lastHrefTerreirosRef = useRef<string>("/");

  const registerGoToTab = useCallback((fn: GoToTabFn | null) => {
    goToTabRef.current = fn;
  }, []);

  const goToTab = useCallback(
    (tab: TabKey) => {
      if (goToTabRef.current) {
        goToTabRef.current(tab);
        return;
      }

      // Fallback determinístico: controla a aba via RootPagerContext.
      rootPager.setActiveKey(tab);
    },
    [rootPager]
  );

  const getLastHrefForTab = useCallback((tab: TabKey) => {
    return tab === "terreiros"
      ? lastHrefTerreirosRef.current
      : lastHrefPontosRef.current;
  }, []);

  useEffect(() => {
    // Não registrar player como "last" para evitar restaurar o player.
    if (pathname === "/player") return;

    const href = buildHref(pathname, searchParams as any);

    // No RootPager ("/"), usa a aba ativa no momento.
    const tab: TabKey =
      pathname === "/" ? rootPager.activeKey : inferTabFromPathname(pathname);

    if (tab === "terreiros") {
      lastHrefTerreirosRef.current = href;
    } else {
      lastHrefPontosRef.current = href;
    }
  }, [pathname, rootPager.activeKey, searchParams]);

  const value = useMemo<TabControllerContextValue>(
    () => ({
      goToTab,
      getLastHrefForTab,
      registerGoToTab,
    }),
    [getLastHrefForTab, goToTab, registerGoToTab]
  );

  return (
    <TabControllerContext.Provider value={value}>
      {children}
    </TabControllerContext.Provider>
  );
}

export function useTabController(): TabControllerContextValue {
  const ctx = useContext(TabControllerContext);
  if (!ctx) {
    throw new Error(
      "useTabController must be used within TabControllerProvider"
    );
  }
  return ctx;
}
