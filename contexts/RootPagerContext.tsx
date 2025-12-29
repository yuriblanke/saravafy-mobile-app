import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type RootPagerTabKey = "pontos" | "terreiros";

type RootPagerRoute = { key: RootPagerTabKey; title: string };

type RootPagerContextValue = {
  index: number;
  setIndex: (nextIndex: number) => void;
  activeKey: RootPagerTabKey;
  setActiveKey: (key: RootPagerTabKey) => void;
  routes: readonly RootPagerRoute[];
};

const RootPagerContext = createContext<RootPagerContextValue | null>(null);

const ROUTES: readonly RootPagerRoute[] = [
  { key: "pontos", title: "Pontos" },
  { key: "terreiros", title: "Terreiros" },
] as const;

function clampIndex(nextIndex: number) {
  if (!Number.isFinite(nextIndex)) return 0;
  if (nextIndex <= 0) return 0;
  if (nextIndex >= ROUTES.length - 1) return ROUTES.length - 1;
  return Math.trunc(nextIndex);
}

export function RootPagerProvider({ children }: { children: React.ReactNode }) {
  const [index, setIndexState] = useState(0);

  const setIndex = useCallback((nextIndex: number) => {
    setIndexState(clampIndex(nextIndex));
  }, []);

  const activeKey: RootPagerTabKey = index === 1 ? "terreiros" : "pontos";

  const setActiveKey = useCallback(
    (key: RootPagerTabKey) => {
      setIndex(key === "terreiros" ? 1 : 0);
    },
    [setIndex]
  );

  const value = useMemo<RootPagerContextValue>(
    () => ({
      index,
      setIndex,
      activeKey,
      setActiveKey,
      routes: ROUTES,
    }),
    [activeKey, index, setActiveKey, setIndex]
  );

  return (
    <RootPagerContext.Provider value={value}>
      {children}
    </RootPagerContext.Provider>
  );
}

export function useRootPager(): RootPagerContextValue {
  const ctx = useContext(RootPagerContext);
  if (!ctx) {
    throw new Error("useRootPager must be used within a RootPagerProvider");
  }
  return ctx;
}

export function useRootPagerOptional() {
  return useContext(RootPagerContext);
}

export function useIsRootPagerTabActive(key: RootPagerTabKey) {
  const ctx = useRootPagerOptional();
  if (!ctx) return true;
  return ctx.activeKey === key;
}
