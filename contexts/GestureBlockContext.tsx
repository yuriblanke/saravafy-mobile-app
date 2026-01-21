import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

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
  const blockWindowMs = 150;

  useEffect(() => {
    if (!__DEV__) return;
    console.log("[GestureBlock] mount", {
      blockedUntil: blockedUntilRef.current,
      blockWindowMs,
    });
    return () => {
      console.log("[GestureBlock] unmount", {
        blockedUntil: blockedUntilRef.current,
        blockWindowMs,
      });
    };
  }, [blockWindowMs]);

  const value = useMemo<GestureBlockApi>(() => {
    return {
      markSwipeRecognized: () => {
        const now = Date.now();
        blockedUntilRef.current = now + blockWindowMs;
        if (__DEV__) {
          console.log("[GestureBlock] markSwipeRecognized", {
            now,
            blockedUntil: blockedUntilRef.current,
            windowMs: blockWindowMs,
          });
        }
      },
      shouldBlockPress: () => {
        const now = Date.now();
        const blockedUntil = blockedUntilRef.current;
        const blocked = now < blockedUntil;
        if (__DEV__) {
          console.log("[GestureBlock] shouldBlockPress", {
            now,
            blockedUntil,
            blocked,
            dt: blockedUntil - now,
          });
        }
        return blocked;
      },
    };
  }, [blockWindowMs]);

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
