import React from "react";

type LayoutMetrics = {
  headerHeight: number;
  setHeaderHeight: (value: number) => void;
};

const SaravafyLayoutMetricsContext = React.createContext<LayoutMetrics | null>(
  null
);

export function SaravafyLayoutMetricsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [headerHeight, setHeaderHeightState] = React.useState(0);

  const setHeaderHeight = React.useCallback((value: number) => {
    const next = Number.isFinite(value) ? Math.max(0, value) : 0;
    setHeaderHeightState((prev) => (prev === next ? prev : next));
  }, []);

  const contextValue = React.useMemo(
    () => ({ headerHeight, setHeaderHeight }),
    [headerHeight, setHeaderHeight]
  );

  return (
    <SaravafyLayoutMetricsContext.Provider value={contextValue}>
      {children}
    </SaravafyLayoutMetricsContext.Provider>
  );
}

export function useSaravafyLayoutMetrics() {
  const ctx = React.useContext(SaravafyLayoutMetricsContext);
  if (!ctx) {
    // default seguro (não crasha); mantém fundo sem offset até medir.
    return { headerHeight: 0, setHeaderHeight: (_: number) => {} };
  }
  return ctx;
}
