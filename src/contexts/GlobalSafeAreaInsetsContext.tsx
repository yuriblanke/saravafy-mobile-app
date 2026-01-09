import React, { createContext, useContext } from "react";
import {
  type EdgeInsets,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type GlobalSafeAreaInsetsContextValue = EdgeInsets;

const GlobalSafeAreaInsetsContext =
  createContext<GlobalSafeAreaInsetsContextValue | null>(null);

export function GlobalSafeAreaInsetsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <GlobalSafeAreaInsetsContext.Provider value={insets}>
      {children}
    </GlobalSafeAreaInsetsContext.Provider>
  );
}

export function useGlobalSafeAreaInsets(): GlobalSafeAreaInsetsContextValue {
  const ctx = useContext(GlobalSafeAreaInsetsContext);
  if (!ctx) {
    throw new Error(
      "useGlobalSafeAreaInsets must be used within GlobalSafeAreaInsetsProvider"
    );
  }
  return ctx;
}
