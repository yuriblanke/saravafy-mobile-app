import React, { createContext, useContext, useMemo, useRef } from "react";

type GestureBlockApi = {
  markSwipeRecognized: () => void;
  shouldBlockPress: () => boolean;
};

const GestureBlockContext = createContext<GestureBlockApi | null>(null);

export function GestureBlockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const blockedUntilRef = useRef(0);

  const value = useMemo<GestureBlockApi>(() => {
    return {
      markSwipeRecognized: () => {
        blockedUntilRef.current = Date.now() + 250;
      },
      shouldBlockPress: () => {
        return Date.now() < blockedUntilRef.current;
      },
    };
  }, []);

  return (
    <GestureBlockContext.Provider value={value}>
      {children}
    </GestureBlockContext.Provider>
  );
}

export function useGestureBlock(): GestureBlockApi {
  const ctx = useContext(GestureBlockContext);
  if (!ctx) {
    throw new Error(
      "useGestureBlock must be used within a GestureBlockProvider"
    );
  }
  return ctx;
}
